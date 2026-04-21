/* ============================================
   Swappo — Chat module (Phase 2)
   Supabase-backed conversations + messages with Realtime.

   Chat opens only AFTER a swap is mutually accepted (business rule #5).
   Contact-info auto-filter stays client-side as a defence in depth.

   Public API (all async unless noted):
     SwappoChat.getConversations()          -> Promise<Conversation[]>
     SwappoChat.getMessages(convId)         -> Promise<Message[]>
     SwappoChat.sendMessage(convId, text)   -> Promise<{success, message?, wasFiltered?, error?}>
     SwappoChat.markRead(convId)            -> Promise<void>
     SwappoChat.subscribe(convId, onMsg)    -> unsubscribe()   [SYNC]
     SwappoChat.subscribeAll(onMsg)         -> unsubscribe()   [SYNC]
     SwappoChat.filterContactInfo(text)     -> string          [SYNC]
     SwappoChat.getUnreadCount()            -> Promise<number>
     SwappoChat.openOrCreate(otherUserId, itemId, swapId) -> Promise<conversation>
   ============================================ */

(function (global) {
  'use strict';

  const CONV_TABLE = 'conversations';
  const MSG_TABLE = 'messages';
  // Public-safe view: pseudo + avatar + badge exposed without PII.
  // Reading from public.users directly is blocked by RLS for non-self.
  const USERS_TABLE = 'users_public';

  async function _currentUserId() {
    if (!global.SwappoAuth || !global.SwappoAuth.isReady()) return null;
    const u = await global.SwappoAuth.getCurrentUser();
    return u ? u.id : null;
  }

  function _canonicalPair(a, b) {
    return (a < b) ? [a, b] : [b, a];
  }

  // ---------- CONTACT INFO FILTER ----------
  function filterContactInfo(text) {
    if (!text) return text;
    text = text.replace(/(\+?\d[\d\s\-().]{6,}\d)/g, '***');
    text = text.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '***');
    text = text.replace(
      /\b[a-zA-Z0-9._%+\-]+\s*[\[\(_]?\s*(?:at|arobase|@)\s*[\]\)_]?\s*[a-zA-Z0-9.\-]+\s*[\[\(_]?\s*(?:dot|point|\.)\s*[\]\)_]?\s*[a-zA-Z]{2,}\b/gi,
      '***'
    );
    text = text.replace(/https?:\/\/[^\s]+/gi, '***');
    text = text.replace(/www\.[^\s]+/gi, '***');
    text = text.replace(
      /\b[a-z0-9][a-z0-9\-]{1,62}\.(com|ae|net|org|io|co|me|app|xyz|store|shop|online|site|biz|info|dev|tech|fr|uk|de|es|it|ma|tn|sa)\b/gi,
      '***'
    );
    text = text.replace(/(?:^|[\s\u00A0(,;:.!?-])@[a-zA-Z0-9_.]{3,30}/g, m => m.replace(/@.*/, '***'));
    text = text.replace(/(?:[0-9]\uFE0F\u20E3\s*){5,}/g, '***');
    const digitWords = '(?:zero|one|two|three|four|five|six|seven|eight|nine|oh|z[eé]ro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf)';
    const spelledRe = new RegExp('(?:\\b' + digitWords + '\\b[\\s,\\-]*){7,}', 'gi');
    text = text.replace(spelledRe, '***');
    return text;
  }

  // ---------- OPEN / CREATE CONVERSATION ----------
  async function openOrCreate(otherUserId, itemId, swapId) {
    if (!global.db) return null;
    const uid = await _currentUserId();
    if (!uid) return null;
    if (!otherUserId || otherUserId === uid) return null;

    const [u1, u2] = _canonicalPair(uid, otherUserId);

    // Try to find existing conversation for this item
    const { data: existing } = await global.db.from(CONV_TABLE).select('*')
      .eq('user1_id', u1).eq('user2_id', u2).eq('item_id', itemId).maybeSingle();
    if (existing) return existing;

    const { data, error } = await global.db.from(CONV_TABLE).insert({
      user1_id: u1, user2_id: u2, item_id: itemId, swap_id: swapId || null
    }).select('*').single();
    if (error) return null;
    return data;
  }

  // ---------- LIST CONVERSATIONS (with last message + other user profile) ----------
  async function getConversations() {
    if (!global.db) return [];
    const uid = await _currentUserId();
    if (!uid) return [];

    const { data: convs } = await global.db.from(CONV_TABLE).select('*')
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      .order('last_message_at', { ascending: false });

    if (!convs || !convs.length) return [];

    // Collect other user ids + item ids + swap ids
    const otherIds = convs.map(c => c.user1_id === uid ? c.user2_id : c.user1_id);
    const itemIds = convs.map(c => c.item_id).filter(Boolean);
    const swapIds = convs.map(c => c.swap_id).filter(Boolean);

    const [usersResp, itemsResp, swapsResp] = await Promise.all([
      global.db.from(USERS_TABLE).select('id,pseudo,display_name,avatar,plan,badge,swap_count').in('id', otherIds),
      itemIds.length
        ? global.db.from('items').select('id,brand,model,category,photos,price,is_giveaway').in('id', itemIds)
        : Promise.resolve({ data: [] }),
      swapIds.length
        ? global.db.from('swaps').select('id,status,is_purchase,is_giveaway_claim,cash_amount,cash_direction,proposer_item_id,receiver_item_id,proposer_id,receiver_id').in('id', swapIds)
        : Promise.resolve({ data: [] })
    ]);
    const usersMap = Object.fromEntries((usersResp.data || []).map(u => [u.id, u]));
    const itemsMap = Object.fromEntries((itemsResp.data || []).map(i => [i.id, i]));
    const swapsMap = Object.fromEntries((swapsResp.data || []).map(s => [s.id, s]));

    return convs.map(c => {
      const otherId = c.user1_id === uid ? c.user2_id : c.user1_id;
      const swapRow = swapsMap[c.swap_id] || null;
      // Intent derived from the linked swap: 'gift' | 'purchase' | 'swap'.
      // Sidebar + deal tracker key their labels off this so the three
      // flows stay unambiguous.
      let dealType = 'swap';
      if (swapRow) {
        if (swapRow.is_giveaway_claim) dealType = 'gift';
        else if (swapRow.is_purchase)  dealType = 'purchase';
      }
      return {
        id: c.id,
        user1_id: c.user1_id,
        user2_id: c.user2_id,
        item_id: c.item_id,
        swap_id: c.swap_id,
        identity_revealed: c.identity_revealed,
        last_message: c.last_message_preview || '',
        last_message_at: c.last_message_at,
        swap: swapRow,
        deal_type: dealType,
        cash_amount: swapRow ? Number(swapRow.cash_amount || 0) : 0,
        other_user: (function (u) {
          if (!u) return { id: otherId, pseudo: 'Swapper', avatar: '', plan: 'free' };
          return {
            id: u.id,
            pseudo: u.pseudo || u.display_name || ('User_' + String(u.id || '').slice(0, 4)),
            display_name: u.display_name,
            avatar: u.avatar,
            plan: u.plan,
            badge: u.badge,
            swap_count: u.swap_count
          };
        })(usersMap[otherId]),
        item: itemsMap[c.item_id] || null,
        item_title: itemsMap[c.item_id]
          ? ((itemsMap[c.item_id].brand || '') + ' ' + (itemsMap[c.item_id].model || '')).trim()
          : ''
      };
    });
  }

  // ---------- MESSAGES ----------
  async function getMessages(convId) {
    if (!global.db || !convId) return [];
    const { data } = await global.db.from(MSG_TABLE).select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    return data || [];
  }

  async function sendMessage(convId, content) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };
    if (!content || !content.trim()) return { success: false, error: 'Message cannot be empty.' };

    const filtered = filterContactInfo(content);
    const wasFiltered = filtered !== content;

    const { data, error } = await global.db.from(MSG_TABLE).insert({
      conversation_id: convId,
      sender_id: uid,
      content: filtered,
      is_system: false
    }).select('*').single();
    if (error) return { success: false, error: error.message };

    // Optional: if filtered, append a system-side warning only visible to sender (toast instead)
    return { success: true, message: data, wasFiltered };
  }

  async function markRead(convId) {
    if (!global.db) return;
    const uid = await _currentUserId();
    if (!uid) return;
    await global.db.from(MSG_TABLE)
      .update({ read_by_other: true })
      .eq('conversation_id', convId)
      .neq('sender_id', uid)
      .eq('read_by_other', false);
  }

  async function getUnreadCount() {
    if (!global.db) return 0;
    const uid = await _currentUserId();
    if (!uid) return 0;
    // Count messages in my conversations where sender != me AND read_by_other = false
    const { data: convs } = await global.db.from(CONV_TABLE).select('id')
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
    const ids = (convs || []).map(c => c.id);
    if (!ids.length) return 0;
    const { count } = await global.db.from(MSG_TABLE)
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids).neq('sender_id', uid).eq('read_by_other', false);
    return count || 0;
  }

  /**
   * Count conversations the user is party to where the backing swap is
   * still in progress (status='accepted') — i.e. "active chats" on the
   * dashboard. Completed / declined / cancelled swaps are archived and
   * don't count. Dashboard card was showing the unread-message count by
   * mistake (Ahmed 2026-04-21).
   *
   * Every accepted swap has a matching conversation (accept_swap RPC
   * creates one) so counting accepted swaps directly is equivalent to
   * counting active chats, and avoids the PostgREST inner-join
   * head-count quirk.
   */
  async function getActiveConvCount() {
    if (!global.db) return 0;
    const uid = await _currentUserId();
    if (!uid) return 0;
    const { count, error } = await global.db.from('swaps')
      .select('id', { count: 'exact', head: true })
      .or(`proposer_id.eq.${uid},receiver_id.eq.${uid}`)
      .eq('status', 'accepted');
    if (error) return 0;
    return count || 0;
  }

  // ---------- REALTIME SUBSCRIPTIONS ----------
  /** Subscribe to new messages for ONE conversation. Returns an unsubscribe fn. */
  function subscribe(convId, onMessage) {
    if (!global.db) return () => {};
    const channel = global.db
      .channel('msg:' + convId)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: MSG_TABLE, filter: `conversation_id=eq.${convId}` },
          payload => onMessage && onMessage(payload.new))
      .subscribe();
    return () => { try { global.db.removeChannel(channel); } catch (e) {} };
  }

  /** Subscribe to all new messages relevant to the current user (inbox refresh). */
  async function subscribeAll(onMessage) {
    if (!global.db) return () => {};
    const uid = await _currentUserId();
    if (!uid) return () => {};
    const channel = global.db
      .channel('inbox:' + uid)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: MSG_TABLE },
          payload => onMessage && onMessage(payload.new))
      .subscribe();
    return () => { try { global.db.removeChannel(channel); } catch (e) {} };
  }

  global.SwappoChat = {
    getConversations, getMessages, sendMessage, markRead,
    subscribe, subscribeAll,
    filterContactInfo, getUnreadCount, getActiveConvCount, openOrCreate
  };
})(window);
