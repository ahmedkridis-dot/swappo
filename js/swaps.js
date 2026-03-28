/* ============================================
   Swappo — Swap Logic
   Depends on: supabase.js (db), points.js
   ============================================ */

const SwappoSwaps = {

  // ---- Propose a swap ----
  async propose(proposerItemIds, receiverItemId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    // Get receiver item to find owner and category
    const { data: receiverItem } = await db
      .from('items')
      .select('user_id, category')
      .eq('id', receiverItemId)
      .single();

    if (!receiverItem) throw new Error('Item introuvable.');
    if (receiverItem.user_id === user.id) throw new Error('Vous ne pouvez pas swapper avec vous-même.');

    // Calculate points cost (highest category among all items)
    const { data: proposerItems } = await db
      .from('items')
      .select('category')
      .in('id', proposerItemIds);

    const allCategories = [...(proposerItems || []).map(i => i.category), receiverItem.category];
    const maxCost = Math.max(...allCategories.map(getCategoryCost));

    // Create swap
    const { data, error } = await db
      .from('swaps')
      .insert({
        proposer_id: user.id,
        receiver_id: receiverItem.user_id,
        proposer_items: proposerItemIds,
        receiver_item_id: receiverItemId,
        points_cost: maxCost
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ---- Accept a swap ----
  async accept(swapId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    const { data: swap } = await db
      .from('swaps')
      .select('*')
      .eq('id', swapId)
      .single();

    if (!swap) throw new Error('Swap introuvable.');
    if (swap.receiver_id !== user.id) throw new Error('Non autorisé.');
    if (swap.status !== 'pending') throw new Error('Ce swap n\'est plus en attente.');

    const { error } = await db
      .from('swaps')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', swapId);

    if (error) throw error;
    return true;
  },

  // ---- Reject a swap ----
  async reject(swapId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    const { error } = await db
      .from('swaps')
      .update({ status: 'rejected' })
      .eq('id', swapId)
      .match({ id: swapId, receiver_id: user.id, status: 'pending' });

    if (error) throw error;
    return true;
  },

  // ---- Pay points to reveal identity (each party pays separately) ----
  async payForReveal(swapId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    const { data: swap } = await db
      .from('swaps')
      .select(`
        *,
        receiver_item:items!swaps_receiver_item_id_fkey(category)
      `)
      .eq('id', swapId)
      .single();

    if (!swap) throw new Error('Swap introuvable.');
    if (swap.status !== 'accepted') throw new Error('Le swap doit être accepté avant le paiement.');

    const isProposer = swap.proposer_id === user.id;
    const isReceiver = swap.receiver_id === user.id;

    if (!isProposer && !isReceiver) throw new Error('Non autorisé.');

    // Check if already paid
    if (isProposer && swap.proposer_paid) throw new Error('Vous avez déjà payé.');
    if (isReceiver && swap.receiver_paid) throw new Error('Vous avez déjà payé.');

    // Spend points
    const category = swap.receiver_item?.category || 'other';
    await SwappoPoints.spendForReveal(user.id, swapId, category);

    // Mark as paid
    const updateField = isProposer ? 'proposer_paid' : 'receiver_paid';
    await db
      .from('swaps')
      .update({ [updateField]: true })
      .eq('id', swapId);

    // Check if both have paid → complete swap
    const otherPaid = isProposer ? swap.receiver_paid : swap.proposer_paid;
    if (otherPaid) {
      await this._completeSwap(swap);
    }

    return { bothPaid: otherPaid };
  },

  // ---- Complete swap (both paid) ----
  async _completeSwap(swap) {
    // Update swap status
    await db
      .from('swaps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', swap.id);

    // Mark items as swapped
    await db
      .from('items')
      .update({ status: 'swapped' })
      .in('id', [...swap.proposer_items, swap.receiver_item_id]);

    // Increment swap count for both users
    for (const userId of [swap.proposer_id, swap.receiver_id]) {
      const { data: u } = await db
        .from('users')
        .select('swap_count')
        .eq('id', userId)
        .single();

      await db
        .from('users')
        .update({ swap_count: (u?.swap_count || 0) + 1 })
        .eq('id', userId);
    }

    // Create system message in chat
    await db
      .from('messages')
      .insert({
        swap_id: swap.id,
        sender_id: swap.proposer_id,
        content: '🎉 Swap completed! You can now see each other\'s identity and chat freely.',
        is_system: true
      });
  },

  // ---- Get swap by ID ----
  async getById(swapId) {
    const { data, error } = await db
      .from('swaps')
      .select(`
        *,
        proposer:users!swaps_proposer_id_fkey(id, name, avatar_url, badge_tier, email),
        receiver:users!swaps_receiver_id_fkey(id, name, avatar_url, badge_tier, email),
        receiver_item:items!swaps_receiver_item_id_fkey(*)
      `)
      .eq('id', swapId)
      .single();

    if (error) throw error;

    // ANONYMITY: hide identity if swap not completed
    if (data && data.status !== 'completed') {
      if (data.proposer) {
        data.proposer.name = 'Swapper';
        data.proposer.email = null;
        data.proposer.avatar_url = null;
      }
      if (data.receiver) {
        data.receiver.name = 'Swapper';
        data.receiver.email = null;
        data.receiver.avatar_url = null;
      }
    }

    return data;
  },

  // ---- Get user's swaps ----
  async getMySwaps(status = null) {
    const user = await getCurrentUser();
    if (!user) return [];

    let query = db
      .from('swaps')
      .select(`
        *,
        proposer:users!swaps_proposer_id_fkey(id, name, avatar_url, badge_tier),
        receiver:users!swaps_receiver_id_fkey(id, name, avatar_url, badge_tier),
        receiver_item:items!swaps_receiver_item_id_fkey(*)
      `)
      .or(`proposer_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // ---- Rate a completed swap ----
  async rate(swapId, stars) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    const { data: swap } = await db
      .from('swaps')
      .select('proposer_id, receiver_id, status')
      .eq('id', swapId)
      .single();

    if (!swap || swap.status !== 'completed') throw new Error('Swap non complété.');

    const ratedId = swap.proposer_id === user.id ? swap.receiver_id : swap.proposer_id;

    const { error } = await db
      .from('ratings')
      .insert({
        swap_id: swapId,
        rater_id: user.id,
        rated_id: ratedId,
        stars
      });

    if (error) {
      if (error.code === '23505') throw new Error('Vous avez déjà noté ce swap.');
      throw error;
    }
    return true;
  },

  // ---- Get average rating for a user ----
  async getUserRating(userId) {
    const { data, error } = await db
      .from('ratings')
      .select('stars')
      .eq('rated_id', userId);

    if (error || !data || data.length === 0) return { avg: 0, count: 0 };

    const total = data.reduce((sum, r) => sum + r.stars, 0);
    return {
      avg: Math.round((total / data.length) * 10) / 10,
      count: data.length
    };
  }
};
