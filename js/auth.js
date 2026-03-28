/* ============================================
   Swappo — Authentication Module
   Depends on: supabase.js (db)
   ============================================ */

const SwappoAuth = {

  // ---- Email Signup ----
  async signUp(email, password, name) {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (error) throw error;
    return data;
  },

  // ---- Email Login ----
  async signIn(email, password) {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  // ---- OAuth (Google, Apple, Facebook) ----
  async signInWithProvider(provider) {
    const { data, error } = await db.auth.signInWithOAuth({
      provider, // 'google', 'apple', 'facebook'
      options: {
        redirectTo: window.location.origin + '/pages/profile.html'
      }
    });

    if (error) throw error;
    return data;
  },

  // ---- Password Reset ----
  async resetPassword(email) {
    const { data, error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/pages/login.html?reset=true'
    });

    if (error) throw error;
    return data;
  },

  // ---- Logout ----
  async signOut() {
    const { error } = await db.auth.signOut();
    if (error) throw error;
    window.location.href = '/index.html';
  },

  // ---- Referral handling ----
  async applyReferral(referralCode, userId) {
    if (!referralCode) return;

    // Find referrer
    const { data: referrer } = await db
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (!referrer) return;

    // Update new user with referral
    await db
      .from('users')
      .update({ referred_by: referrer.id })
      .eq('id', userId);

    // Award referral bonus to referrer (+25 pts)
    await SwappoPoints.addTransaction(referrer.id, 25, 'referral', 'Referral bonus');
  },

  // ---- Require auth (redirect if not logged in) ----
  async requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/pages/login.html?redirect=${returnUrl}`;
      return null;
    }
    return user;
  },

  // ---- Check guest mode (browse but can't interact) ----
  async isGuest() {
    const user = await getCurrentUser();
    return !user;
  }
};
