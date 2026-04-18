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
      myItemId = null, myItemIds = null, theirItemId, theirBoxId = null,
      cashAmount = 0, cashDirection = 'none',
      isPurchase = false, isGiveawayClaim = false
    } = args || {};

    if (!theirItemId && !theirBoxId) return { success: false, error: 'Target item required.' };

    // Resolve the receiver. Either a single item or a gift-box listing.
    var receiverUserId = null;
    var targetItemId   = theirItemId || null;
    if (theirBoxId) {
      const { data: box } = await global.db.from('boxes').select('id, owner_id, kind, status').eq('id', theirBoxId).maybeSingle();
      if (!box) return { success: false, error: 'Gift Box not found.' };
      if (box.status !== 'listed') return { success: false, error: 'Gift Box is no longer available.' };
      if (box.owner_id === uid) return { success: false, error: "You can't claim your own Gift Box." };
      receiverUserId = box.owner_id;
    } else {
      const itemsMap = await _fetchItems([theirItemId].filter(Boolean));
      const theirItem = itemsMap[theirItemId];
      if (!theirItem) return { success: false, error: 'Item not found.' };
      if (theirItem.user_id === uid) return { success: false, error: "You can't swap with yourself." };
      receiverUserId = theirItem.user_id;
    }

    // Proposer side: either a single item, OR an array of 2+ items that
    // we first bundle into a Swap Box via RPC, OR nothing (pure cash /
    // gift claim).
    var proposerBoxId = null;
    var normalizedItemId = myItemId;
    if (Array.isArray(myItemIds) && myItemIds.length >= 2) {
      const { data: newBoxId, error: boxErr } = await global.db.rpc('create_swap_box', { p_item_ids: myItemIds });
      if (boxErr) return { success: false, error: boxErr.message || 'Could not build a Swap Box.' };
      proposerBoxId = newBoxId;
      normalizedItemId = null;
    } else if (Array.isArray(myItemIds) && myItemIds.length === 1) {
      normalizedItemId = myItemIds[0];
    }

    if (normalizedItemId) {
      const itemsMap = await _fetchItems([normalizedItemId]);
      const myItem = itemsMap[normalizedItemId];
      if (!myItem) return { success: false, error: "Your item wasn't found." };
      if (myItem.user_id !== uid) return { success: false, error: "That item isn't yours." };
    }

    const row = {
      proposer_id: uid,
      receiver_id: receiverUserId,
      proposer_item_id: normalizedItemId,
      proposer_box_id: proposerBoxId,
      receiver_item_id: targetItemId,
      receiver_box_id: theirBoxId,
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
      var boxCount = 0;
      if (proposerBoxId && Array.isArray(myItemIds)) boxCount = myItemIds.length;
      var titleTxt = isPurchase ? 'New purchase offer'
                   : (proposerBoxId ? 'New Swap Box offer' : 'New swap offer');
      var msgTxt;
      if (isPurchase) {
        msgTxt = 'Someone wants to buy your item' + (Number(cashAmount) > 0 ? ' for ' + Number(cashAmount) + ' AED' : '') + '.';
      } else if (proposerBoxId) {
        msgTxt = 'Someone proposed a Swap Box of ' + boxCount + ' items for your item.';
      } else {
        msgTxt = 'Someone proposed a swap on your item.';
      }
      await global.db.from('notifications').insert({
        user_id: receiverUserId,
        kind: isPurchase ? 'offer_received' : 'swap_proposed',
        type: isPurchase ? 'offer' : 'swap',
        title: titleTxt,
        message: msgTxt,
        url: '/pages/profile.html?tab=swap-dashboard&sub=received',
        payload: {
          swap_id: data.id,
          item_id: targetItemId,
          proposer_id: uid,
          proposer_box_id: proposerBoxId,
          proposer_box_count: boxCount,
          receiver_box_id: theirBoxId,
          cash_amount: Number(cashAmount) || 0,
          cash_direction: cashDirection
        }
      });
    } catch (e) { console.warn('[propose] notify receiver failed:', e.message || e); }

    // Local toast for the proposer — bell will pick up the notification row.
    if (global.Toast) {
      global.Toast.show(isPurchase ? 'Offer sent — awaiting reply.' : 'Swap proposed — awaiting reply.', 'success');
    }
    return { success: true, swap: data };
  }

  // ---------- RESPOND (accept / decline) ----------
  async function respond(swapId, accept) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };

    if (!accept) {
      // Decline stays a simple direct update.
      const { data: swap, error: fetchErr } = await global.db.from(TABLE)
        .select('*').eq('id', swapId).maybeSingle();
      if (fetchErr || !swap) return { success: false, error: 'Swap not found.' };
      if (swap.receiver_id !== uid) return { success: false, error: "You can't respond to this swap." };
      if (swap.status !== 'pending') return { success: false, error: 'Swap is no longer pending.' };
      const { data: updated, error } = await global.db.from(TABLE)
        .update({ status: 'declined' }).eq('id', swapId).select('*').single();
      if (error) return { success: false, error: error.message };
      return { success: true, swap: updated };
    }

    // Accept: call the secure RPC (reserves both items, creates convo + system msg,
    // notifies the proposer, bypassing client-side RLS limits).
    const { data: rpcRes, error: rpcErr } = await global.db.rpc('accept_swap', { p_swap_id: swapId });
    if (rpcErr) return { success: false, error: rpcErr.message };
    if (!rpcRes || !rpcRes.success) return { success: false, error: rpcRes?.error || 'Accept failed.' };

    if (global.Toast) {
      global.Toast.show('Swap accepted — opening chat…', 'success', 2500);
    }
    return { success: true, swap: { id: rpcRes.swap_id, status: 'accepted' }, conversationId: rpcRes.conversation_id };
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

    // Release single items if they were reserved
    const ids = [swap.receiver_item_id, swap.proposer_item_id].filter(Boolean);
    if (ids.length) {
      await global.db.from(ITEMS_TABLE).update({ status: 'available' }).in('id', ids);
    }

    // Swap Box side: the proposer's box was created just for this swap —
    // cancel it + free its items. We fire-and-forget via the cancel_box
    // RPC so we don't block on permission edge cases.
    if (swap.proposer_box_id) {
      try { await global.db.rpc('cancel_box', { p_box_id: swap.proposer_box_id }); } catch (_) {}
    }
    // Gift Box side: the receiver's box stays listed; just make sure the
    // items are available again and the box status reverts to listed.
    if (swap.receiver_box_id) {
      try {
        const { data: boxItems } = await global.db.from('box_items')
          .select('item_id').eq('box_id', swap.receiver_box_id);
        const boxItemIds = (boxItems || []).map(r => r.item_id);
        if (boxItemIds.length) {
          await global.db.from(ITEMS_TABLE).update({ status: 'available' }).in('id', boxItemIds);
        }
        await global.db.from('boxes').update({ status: 'listed' }).eq('id', swap.receiver_box_id);
      } catch (_) {}
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
  // Active (non-terminal) statuses that belong in the Sent / Received
  // lists. Everything else — completed, declined, cancelled, expired —
  // lives in History.
  const ACTIVE_STATUSES = ['pending', 'accepted'];

  async function getSent(userId) {
    if (!global.db || !userId) return [];
    const { data } = await global.db.from(TABLE).select('*')
      .eq('proposer_id', userId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false });
    return data || [];
  }
  async function getReceived(userId) {
    if (!global.db || !userId) return [];
    const { data } = await global.db.from(TABLE).select('*')
      .eq('receiver_id', userId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false });
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
