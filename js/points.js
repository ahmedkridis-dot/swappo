/* ============================================
   Swappo — Points System
   Depends on: supabase.js (db, getCategoryCost)
   ============================================ */

const SwappoPoints = {

  // ---- Add a points transaction ----
  async addTransaction(userId, amount, type, description, swapId = null) {
    // Insert transaction record
    const { error: txError } = await db
      .from('points_transactions')
      .insert({
        user_id: userId,
        amount,
        type,
        description,
        swap_id: swapId
      });

    if (txError) throw txError;

    // Update user balance
    const { data: user } = await db
      .from('users')
      .select('points_balance')
      .eq('id', userId)
      .single();

    const newBalance = (user?.points_balance || 0) + amount;

    const { error: updateError } = await db
      .from('users')
      .update({ points_balance: newBalance })
      .eq('id', userId);

    if (updateError) throw updateError;

    return newBalance;
  },

  // ---- Get user balance ----
  async getBalance(userId) {
    const { data } = await db
      .from('users')
      .select('points_balance')
      .eq('id', userId)
      .single();

    return data?.points_balance || 0;
  },

  // ---- Get transaction history ----
  async getHistory(userId, limit = 50) {
    const { data, error } = await db
      .from('points_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // ---- Check if user can afford ----
  async canAfford(userId, cost) {
    const balance = await this.getBalance(userId);
    return balance >= cost;
  },

  // ---- Spend points for identity reveal (swap completion) ----
  async spendForReveal(userId, swapId, category) {
    const cost = getCategoryCost(category);

    // Check premium — premium users don't pay
    const { data: user } = await db
      .from('users')
      .select('is_premium, premium_expires_at, points_balance')
      .eq('id', userId)
      .single();

    const isPremiumActive = user?.is_premium && new Date(user.premium_expires_at) > new Date();

    if (isPremiumActive) {
      // Premium: free reveal, just record it
      await this.addTransaction(userId, 0, 'premium_reveal', `Premium reveal — ${category}`, swapId);
      return 0;
    }

    // Check balance
    if (user.points_balance < cost) {
      throw new Error(`Solde insuffisant. ${cost} pts requis, ${user.points_balance} pts disponibles.`);
    }

    // Deduct points
    await this.addTransaction(userId, -cost, 'reveal', `Identity reveal — ${category} (-${cost} pts)`, swapId);
    return cost;
  },

  // ---- Boost an item ----
  async boostItem(userId, itemId, duration) {
    // duration: '24h' = 10 pts, '7d' = 25 pts
    const cost = duration === '7d' ? 25 : 10;
    const hours = duration === '7d' ? 168 : 24;

    if (!(await this.canAfford(userId, cost))) {
      throw new Error(`Solde insuffisant. ${cost} pts requis.`);
    }

    // Deduct points
    await this.addTransaction(userId, -cost, 'boost', `Boost ${duration} (-${cost} pts)`);

    // Mark item as boosted
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const { error } = await db
      .from('items')
      .update({
        is_boosted: true,
        boost_expires_at: expiresAt
      })
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) throw error;
    return { cost, expiresAt };
  },

  // ---- Giveaway claim (claimer pays 25, donor earns 25) ----
  async claimGiveaway(claimerId, donorId, itemId, category) {
    // 1. Check badge ⭐ (at least 1 swap)
    const { data: claimer } = await db
      .from('users')
      .select('swap_count, points_balance, giveaway_claims_this_month, giveaway_pass')
      .eq('id', claimerId)
      .single();

    if (claimer.swap_count < 1) {
      throw new Error('Badge ⭐ requis (minimum 1 swap complété) pour accéder au Gift Corner.');
    }

    // 2. Check balance
    if (claimer.points_balance < 25) {
      throw new Error('Solde insuffisant. 25 pts requis pour un giveaway.');
    }

    // 3. Check monthly limit (4 or 5 with pass)
    const maxClaims = claimer.giveaway_pass ? 5 : 4;
    if (claimer.giveaway_claims_this_month >= maxClaims) {
      throw new Error(`Limite mensuelle atteinte (${maxClaims} claims/mois).`);
    }

    // 4. Check category lock (30 days)
    const { data: locks } = await db
      .from('giveaway_locks')
      .select('*')
      .eq('user_id', claimerId)
      .eq('category', category)
      .gt('locked_until', new Date().toISOString());

    if (locks && locks.length > 0) {
      const lockEnd = new Date(locks[0].locked_until).toLocaleDateString();
      throw new Error(`Catégorie "${category}" verrouillée jusqu'au ${lockEnd}.`);
    }

    // 5. All checks passed — execute claim
    // Claimer pays 25
    await this.addTransaction(claimerId, -25, 'giveaway_claim', `Giveaway claim — ${category}`);

    // Donor earns 25
    await this.addTransaction(donorId, 25, 'giveaway_donate', `Giveaway donation reward`);

    // Increment claims count
    await db
      .from('users')
      .update({ giveaway_claims_this_month: claimer.giveaway_claims_this_month + 1 })
      .eq('id', claimerId);

    // Lock category for 30 days
    await db
      .from('giveaway_locks')
      .insert({
        user_id: claimerId,
        category,
        locked_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    // Mark item as swapped
    await db
      .from('items')
      .update({ status: 'swapped' })
      .eq('id', itemId);

    return true;
  },

  // ---- Purchase points (placeholder — will integrate Stripe) ----
  async purchasePoints(userId, packId) {
    const packs = {
      small:  { amount: 50,  price: 10 }, // 10 AED
      medium: { amount: 150, price: 25 }, // 25 AED
      large:  { amount: 350, price: 50 }, // 50 AED
      xl:     { amount: 750, price: 90 }  // 90 AED
    };

    const pack = packs[packId];
    if (!pack) throw new Error('Pack invalide.');

    // TODO: Stripe payment integration
    // For now, just credit the points (will be gated by Stripe in production)
    await this.addTransaction(userId, pack.amount, 'purchase', `Achat ${pack.amount} pts (${pack.price} AED)`);
    return pack;
  }
};
