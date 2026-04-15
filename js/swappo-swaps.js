/* ============================================
   Swappo — Swaps module (Phase 2)
   Supabase-backed proposals + QR confirmations.

   Status machine:
     pending → accepted → completed | cancelled
     pending → declined | cancelled | expired

   Identity reveal happens when both parties accept:
     a matching `conversations` row is created with identity_revealed = true.

   Public API (all async):
     SwappoSwaps.propose({myItemId, theirItemId, cashAmount, cashDirection, isPurchase})
     SwappoSwaps.respond(swapId, accept)     -> {success, swap?, conversationId?, error?}
     SwappoSwaps.cancel(swapId)
     SwappoSwaps.rate(swapId, stars)
     SwappoSwaps.confirmReceipt(swapId)      -> QR confirmation, marks completed when both confirm
     SwappoSwaps.getById(id)
     SwappoSwaps.getForUser(userId)
     SwappoSwaps.getSent(userId) / getReceived(userId) / getHistory(userId)
     SwappoSwaps.getPendingCount(userId)
     SwappoSwaps.checkExpired()
   ============================================ */

(function (global) {
  'use strict';

  const TABLE = 'swaps';
  const ITEMS_TABLE = 'items';
  const CONV_TABLE = 'conversations';
  const MSG_TABLE = 'messages';

  async function _currentUserId() {
    if (!global.SwappoAuth || !global.SwappoAuth.isReady()) return null;
    const u = await global.SwappoAuth.getCurrentUser();
    return u ? u.id : null;
  }

  function _uuidv4() {
    return (crypto.randomUUID && crypto.randomUUID()) ||
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
  }

  function _code6() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function _canonicalPair(a, b) {
    return (a < b) ? [a, b] : [b, a];
  }

  async function _fetchItems(ids) {
    if (!ids.length) return {};
    const { data } = await global.db.from(ITEMS_TABLE).select('*').in('id', ids);
    const map = {};
    (data || []).forEach(it => { map[it.id] = it; });
    return map;
  }

  // ---------- PROPOSE ----------
  async function propose(args) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };

    const {
      myItemId = null, theirItemId, cashAmount = 0, cashDirection = 'none',
      isPurchase = false, isGiveawayClaim = false
    } = args || {};

    if (!theirItemId) return { success: false, error: 'Target item required.' };

    const itemsMap = await _fetchItems([theirItemId, myItemId].filter(Boolean));
    const theirItem = itemsMap[theirItemId];
    if (!theirItem) return { success: false, error: 'Item not found.' };
    if (theirItem.user_id === uid) return { success: false, error: "You can't swap with yourself." };

    if (myItemId) {
      const myItem = itemsMap[myItemId];
      if (!myItem) return { success: false, error: "Your item wasn't found." };
      if (myItem.user_id !== uid) return { success: false, error: "That item isn't yours." };
    }

    const row = {
      proposer_id: uid,
      receiver_id: theirItem.user_id,
      proposer_item_id: myItemId,
      receiver_item_id: theirItemId,
      cash_amount: Number(cashAmount) || 0,
      cash_direction: cashDirection,
      is_purchase: !!isPurchase,
      is_giveaway_claim: !!isGiveawayClaim,
      status: 'pending',
      confirmation_code: _code6()
    };
    const { data, error } = await global.db.from(TABLE).insert(row).select('*').single();
    if (error) return { success: false, error: error.message };

    // Notify the RECEIVER in Supabase (so they see it across devices).
    try {
      await global.db.from('notifications').insert({
        user_id: theirItem.user_id,
        kind: isPurchase ? 'offer_received' : 'swap_proposed',
        payload: {
          swap_id: data.id,
          item_id: theirItemId,
          proposer_id: uid,
          cash_amount: Number(cashAmount) || 0,
          cash_direction: cashDirection
        }
      });
    } catch (e) { console.warn('[propose] notify receiver failed:', e.message || e); }

    // Local toast for the proposer
    if (global.DemoNotifications) {
      global.DemoNotifications.add({
        type: 'swap_proposed',
        title: isPurchase ? 'Offer Sent!' : 'Swap Proposed!',
        message: 'Your proposal is awaiting reply.',
        created_at: new Date().toISOString()
      });
    }
    return { success: true, swap: data };
  }

  // ---------- RESPOND (accept / decline) ----------
  async function respond(swapId, accept) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };

    const { data: swap, error: fetchErr } = await global.db.from(TABLE)
      .select('*').eq('id', swapId).maybeSingle();
    if (fetchErr || !swap) return { success: false, error: 'Swap not found.' };
    if (swap.receiver_id !== uid) return { success: false, error: "You can't respond to this swap." };
    if (swap.status !== 'pending') return { success: false, error: 'Swap is no longer pending.' };

    if (!accept) {
      const { data: updated, error } = await global.db.from(TABLE)
        .update({ status: 'declined' }).eq('id', swapId).select('*').single();
      if (error) return { success: false, error: error.message };
      return { success: true, swap: updated };
    }

    // Accept: mark accepted + reserve items + open conversation
    const now = new Date().toISOString();
    const { data: updated, error } = await global.db.from(TABLE)
      .update({ status: 'accepted', accepted_at: now })
      .eq('id', swapId).select('*').single();
    if (error) return { success: false, error: error.message };

    // Reserve both items
    const reserveIds = [updated.receiver_item_id, updated.proposer_item_id].filter(Boolean);
    await global.db.from(ITEMS_TABLE).update({ status: 'reserved' }).in('id', reserveIds);

    // Create or fetch the conversation (identity revealed)
    const [u1, u2] = _canonicalPair(updated.proposer_id, updated.receiver_id);
    const convRow = {
      user1_id: u1,
      user2_id: u2,
      item_id: updated.receiver_item_id,
      swap_id: updated.id,
      identity_revealed: true
    };
    let conversationId = null;
    const { data: conv, error: convErr } = await global.db.from(CONV_TABLE)
      .upsert(convRow, { onConflict: 'user1_id,user2_id,item_id' })
      .select('*').single();
    if (!convErr && conv) {
      conversationId = conv.id;
      // System message
      await global.db.from(MSG_TABLE).insert({
        conversation_id: conv.id,
        sender_id: null,
        content: 'Swap accepted — identities revealed. You can now chat to arrange the meetup.',
        is_system: true
      });
    }

    // Notify the PROPOSER in Supabase (they initiated, now need to know the
    // receiver accepted so they can open the chat).
    try {
      await global.db.from('notifications').insert({
        user_id: updated.proposer_id,
        kind: 'swap_accepted',
        payload: {
          swap_id: updated.id,
          conversation_id: conversationId,
          item_id: updated.receiver_item_id
        }
      });
    } catch (e) { console.warn('[respond] notify proposer failed:', e.message || e); }

    if (global.DemoNotifications) {
      global.DemoNotifications.add({
        type: 'swap_accepted',
        title: 'Swap Accepted!',
        message: 'Identities revealed — open the chat to arrange your meetup.',
        created_at: new Date().toISOString()
      });
    }
    return { success: true, swap: updated, conversationId };
  }

  // ---------- CANCEL ----------
  async function cancel(swapId) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };

    const { data: swap } = await global.db.from(TABLE).select('*').eq('id', swapId).maybeSingle();
    if (!swap) return { success: false, error: 'Swap not found.' };
    if (swap.proposer_id !== uid && swap.receiver_id !== uid) {
      return { success: false, error: 'Not your swap.' };
    }
    if (!['pending', 'accepted'].includes(swap.status)) {
      return { success: false, error: 'Only pending or accepted swaps can be cancelled.' };
    }

    const { error } = await global.db.from(TABLE)
      .update({ status: 'cancelled' }).eq('id', swapId);
    if (error) return { success: false, error: error.message };

    // Release items if they were reserved
    const ids = [swap.receiver_item_id, swap.proposer_item_id].filter(Boolean);
    if (ids.length) {
      await global.db.from(ITEMS_TABLE).update({ status: 'available' }).in('id', ids);
    }
    return { success: true };
  }

  // ---------- RATE ----------
  async function rate(swapId, stars) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    if (stars < 1 || stars > 5) return { success: false, error: 'Stars must be 1-5.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };

    const { data: swap } = await global.db.from(TABLE).select('*').eq('id', swapId).maybeSingle();
    if (!swap) return { success: false, error: 'Swap not found.' };
    if (swap.proposer_id !== uid && swap.receiver_id !== uid) {
      return { success: false, error: 'Not your swap.' };
    }

    const patch = swap.proposer_id === uid
      ? { proposer_rating: stars }
      : { receiver_rating: stars };
    const { error } = await global.db.from(TABLE).update(patch).eq('id', swapId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // ---------- CONFIRM RECEIPT (QR flow) ----------
  async function confirmReceipt(swapId) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };

    const { data: swap } = await global.db.from(TABLE).select('*').eq('id', swapId).maybeSingle();
    if (!swap) return { success: false, error: 'Swap not found.' };

    let patch;
    if (uid === swap.proposer_id) patch = { proposer_confirmed: true };
    else if (uid === swap.receiver_id) patch = { receiver_confirmed: true };
    else return { success: false, error: 'Not your swap.' };

    const bothConfirmed =
      (swap.proposer_confirmed || uid === swap.proposer_id) &&
      (swap.receiver_confirmed || uid === swap.receiver_id);
    if (bothConfirmed) {
      patch.status = 'completed';
      patch.completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await global.db.from(TABLE)
      .update(patch).eq('id', swapId).select('*').single();
    if (error) return { success: false, error: error.message };

    // If completed, mark items swapped (or sold for purchases)
    if (bothConfirmed) {
      const ids = [updated.receiver_item_id, updated.proposer_item_id].filter(Boolean);
      const newStatus = updated.is_purchase ? 'sold' : 'swapped';
      await global.db.from(ITEMS_TABLE).update({ status: newStatus }).in('id', ids);

      // Bump swap_count for both users
      await Promise.all([
        global.db.rpc('bump_swap_count', { user_id_in: updated.proposer_id }).catch(() => {}),
        global.db.rpc('bump_swap_count', { user_id_in: updated.receiver_id }).catch(() => {})
      ]);
    }
    return { success: true, swap: updated, completed: !!bothConfirmed };
  }

  // ---------- QUERIES ----------
  async function getById(swapId) {
    if (!global.db) return null;
    const { data } = await global.db.from(TABLE).select('*').eq('id', swapId).maybeSingle();
    return data || null;
  }

  async function getForUser(userId) {
    if (!global.db || !userId) return [];
    const { data } = await global.db.from(TABLE).select('*')
      .or(`proposer_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    return data || [];
  }
  async function getSent(userId) {
    if (!global.db || !userId) return [];
    const { data } = await global.db.from(TABLE).select('*')
      .eq('proposer_id', userId).order('created_at', { ascending: false });
    return data || [];
  }
  async function getReceived(userId) {
    if (!global.db || !userId) return [];
    const { data } = await global.db.from(TABLE).select('*')
      .eq('receiver_id', userId).order('created_at', { ascending: false });
    return data || [];
  }
  async function getHistory(userId) {
    if (!global.db || !userId) return [];
    const { data } = await global.db.from(TABLE).select('*')
      .or(`proposer_id.eq.${userId},receiver_id.eq.${userId}`)
      .in('status', ['completed', 'declined', 'cancelled', 'expired'])
      .order('created_at', { ascending: false });
    return data || [];
  }
  async function getPendingCount(userId) {
    if (!global.db || !userId) return 0;
    const { count } = await global.db.from(TABLE)
      .select('id', { count: 'exact', head: true })
      .or(`proposer_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending');
    return count || 0;
  }

  // Optional maintenance helper: mark pending swaps past expires_at as expired
  async function checkExpired() {
    if (!global.db) return;
    const now = new Date().toISOString();
    await global.db.from(TABLE).update({ status: 'expired' })
      .eq('status', 'pending').lt('expires_at', now);
  }

  global.SwappoSwaps = {
    propose, respond, cancel, rate, confirmReceipt,
    getById, getForUser, getSent, getReceived, getHistory, getPendingCount,
    checkExpired
  };
})(window);
