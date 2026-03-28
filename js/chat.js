/* ============================================
   Swappo — SwapChat (Realtime Messaging)
   Depends on: supabase.js (db)
   ============================================ */

const SwappoChat = {

  _subscription: null,
  _currentSwapId: null,

  // ---- Regex patterns for content filtering ----
  PHONE_REGEX: /(\+?\d[\d\s\-().]{6,}\d)/g,
  EMAIL_REGEX: /[\w.+-]+@[\w-]+\.[\w.-]+/gi,
  LINK_REGEX: /(https?:\/\/[^\s]+|www\.[^\s]+|[\w-]+\.(com|net|org|ae|io|co|me|app)[^\s]*)/gi,

  // ---- Filter message content ----
  filterContent(text) {
    let filtered = text;
    let wasFiltered = false;

    // Replace phone numbers
    if (this.PHONE_REGEX.test(filtered)) {
      filtered = filtered.replace(this.PHONE_REGEX, '[phone hidden]');
      wasFiltered = true;
    }

    // Replace emails
    if (this.EMAIL_REGEX.test(filtered)) {
      filtered = filtered.replace(this.EMAIL_REGEX, '[email hidden]');
      wasFiltered = true;
    }

    // Replace links
    if (this.LINK_REGEX.test(filtered)) {
      filtered = filtered.replace(this.LINK_REGEX, '[link hidden]');
      wasFiltered = true;
    }

    // Reset regex lastIndex
    this.PHONE_REGEX.lastIndex = 0;
    this.EMAIL_REGEX.lastIndex = 0;
    this.LINK_REGEX.lastIndex = 0;

    return { filtered, wasFiltered };
  },

  // ---- Send a message ----
  async send(swapId, content) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    // Verify swap is completed (chat only after both pay)
    const { data: swap } = await db
      .from('swaps')
      .select('status, proposer_id, receiver_id')
      .eq('id', swapId)
      .single();

    if (!swap || swap.status !== 'completed') {
      throw new Error('Le chat est disponible uniquement après la finalisation du swap.');
    }

    if (swap.proposer_id !== user.id && swap.receiver_id !== user.id) {
      throw new Error('Non autorisé.');
    }

    // Filter content
    const { filtered, wasFiltered } = this.filterContent(content);

    const { data, error } = await db
      .from('messages')
      .insert({
        swap_id: swapId,
        sender_id: user.id,
        content: filtered,
        is_system: false
      })
      .select()
      .single();

    if (error) throw error;

    // If filtered, add system warning
    if (wasFiltered) {
      await db
        .from('messages')
        .insert({
          swap_id: swapId,
          sender_id: user.id,
          content: '⚠️ Contact info (phone/email/links) is hidden for your safety. Exchange details in person.',
          is_system: true
        });
    }

    return data;
  },

  // ---- Load message history ----
  async getMessages(swapId, limit = 100) {
    const { data, error } = await db
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, avatar_url, badge_tier)
      `)
      .eq('swap_id', swapId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // ---- Subscribe to realtime messages ----
  subscribe(swapId, onMessage) {
    // Unsubscribe from previous if any
    this.unsubscribe();

    this._currentSwapId = swapId;

    this._subscription = db
      .channel(`swap-chat-${swapId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `swap_id=eq.${swapId}`
        },
        async (payload) => {
          // Fetch full message with sender info
          const { data } = await db
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(id, name, avatar_url, badge_tier)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data && onMessage) {
            onMessage(data);
          }
        }
      )
      .subscribe();
  },

  // ---- Unsubscribe ----
  unsubscribe() {
    if (this._subscription) {
      db.removeChannel(this._subscription);
      this._subscription = null;
      this._currentSwapId = null;
    }
  },

  // ---- Get user's chat list (all completed swaps with latest message) ----
  async getChatList() {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data: swaps, error } = await db
      .from('swaps')
      .select(`
        id,
        proposer_id,
        receiver_id,
        completed_at,
        proposer:users!swaps_proposer_id_fkey(id, name, avatar_url, badge_tier),
        receiver:users!swaps_receiver_id_fkey(id, name, avatar_url, badge_tier),
        receiver_item:items!swaps_receiver_item_id_fkey(type, brand, category, photos)
      `)
      .eq('status', 'completed')
      .or(`proposer_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    if (!swaps) return [];

    // Get latest message for each swap
    const chatList = await Promise.all(swaps.map(async (swap) => {
      const { data: messages } = await db
        .from('messages')
        .select('content, created_at, sender_id, is_system')
        .eq('swap_id', swap.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const otherUser = swap.proposer_id === user.id ? swap.receiver : swap.proposer;
      const lastMsg = messages?.[0] || null;

      return {
        swapId: swap.id,
        otherUser,
        item: swap.receiver_item,
        lastMessage: lastMsg?.content || 'Swap completed — start chatting!',
        lastMessageAt: lastMsg?.created_at || swap.completed_at,
        isSystemMessage: lastMsg?.is_system || false
      };
    }));

    return chatList;
  },

  // ---- Render a message bubble ----
  renderMessage(msg, currentUserId) {
    const isMine = msg.sender_id === currentUserId;
    const isSystem = msg.is_system;

    if (isSystem) {
      return `
        <div class="chat-message system">
          <div class="chat-bubble system">${msg.content}</div>
        </div>
      `;
    }

    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const avatar = msg.sender?.avatar_url || '';
    const badgeEmoji = getBadgeEmoji(msg.sender?.badge_tier);

    return `
      <div class="chat-message ${isMine ? 'sent' : 'received'}">
        ${!isMine ? `<div class="chat-avatar">${avatar ? `<img src="${avatar}" alt="">` : badgeEmoji}</div>` : ''}
        <div class="chat-bubble ${isMine ? 'sent' : 'received'}">
          <div class="chat-text">${msg.content}</div>
          <div class="chat-time">${time}</div>
        </div>
      </div>
    `;
  }
};
