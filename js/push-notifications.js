/* ============================================
   Swappo — Push notifications (Capacitor native bridge)
   Vanilla wrapper around window.Capacitor.Plugins.PushNotifications.
   On the web there is no Capacitor, this script is a no-op.
   On iOS / Android the user is asked once at launch for notification
   permission; on grant we register, receive an APNs/FCM token, and
   upsert it into Supabase public.push_tokens (migration 025) so the
   push-fanout worker can dispatch notifs on new offers / messages /
   accepted swaps.

   Loading order: requires platform.js + supabase.js to be parsed
   first (we read window.Swappo, window.SwappoAuth, window.db).
   ============================================ */
(function () {
  // Web — nothing to do. PushNotifications plugin is native-only.
  if (!window.Swappo || !window.Swappo.isNative) return;
  if (window.__SwappoPushInited) return;
  window.__SwappoPushInited = true;

  var Plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
  var PushNotifications = Plugins.PushNotifications;
  if (!PushNotifications) {
    console.warn('[push] PushNotifications plugin not registered — install @capacitor/push-notifications and rebuild.');
    return;
  }

  // ---- Token persistence -----------------------------------------------
  async function _persistToken(tokenValue) {
    if (!window.db || !tokenValue) return;
    var fastUser = (window.SwappoAuth && window.SwappoAuth.getFastUser)
      ? window.SwappoAuth.getFastUser()
      : null;
    // Fall back to async if the JWT isn't in storage yet (very first
    // launch right after signup → token might land before login).
    if (!fastUser) {
      try {
        var sess = await window.db.auth.getSession();
        fastUser = sess && sess.data && sess.data.session ? sess.data.session.user : null;
      } catch (e) { /* keep going */ }
    }
    if (!fastUser || !fastUser.id) return;
    try {
      await window.db.from('push_tokens').upsert({
        user_id: fastUser.id,
        token: tokenValue,
        platform: window.Swappo.platform,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,token' });
    } catch (err) {
      console.warn('[push.persist] supabase upsert failed:', err && err.message);
    }
  }

  // ---- Deep-link routing -----------------------------------------------
  // Maps the notification payload {type, ...} to the in-app URL the user
  // expects to land on when they tap the system notification.
  function _routeForPayload(data) {
    data = data || {};
    var convId = data.conversation_id || '';
    switch (data.type) {
      case 'new_message':
      case 'chat':
      case 'swap_accepted':
        return '/pages/chat.html' + (convId ? ('?conv=' + encodeURIComponent(convId)) : '');
      case 'offer_received':
      case 'swap_proposed':
      case 'gift_claimed':
      case 'counter_offer':
        return '/pages/profile.html?tab=swap-dashboard&sub=received';
      case 'badge_earned':
        return '/pages/profile.html#badges';
      case 'boost_expiring':
        return '/pages/profile.html?tab=my-items';
      default:
        return '/pages/profile.html';
    }
  }

  // ---- Init ------------------------------------------------------------
  async function init() {
    try {
      var perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') {
        // We only ask once per install — Apple HIG. Capacitor handles
        // the system dialog; if the user denied earlier, requestPermissions
        // returns the same status without re-prompting.
        var req = await PushNotifications.requestPermissions();
        if (req.receive !== 'granted') return;
      }
      await PushNotifications.register();
    } catch (err) {
      console.warn('[push.init]', err && err.message);
      return;
    }

    PushNotifications.addListener('registration', function (token) {
      _persistToken(token && token.value);
    });

    PushNotifications.addListener('registrationError', function (err) {
      console.warn('[push.registrationError]', err && err.error);
    });

    // Foreground notification — show a Swappo toast since iOS suppresses
    // the system banner when the app is open.
    PushNotifications.addListener('pushNotificationReceived', function (notification) {
      try {
        if (window.Toast && (notification.title || notification.body)) {
          window.Toast.show(notification.title || notification.body, 'info');
        }
      } catch (e) { /* quiet */ }
    });

    // User tapped the system notification → deep-link into the right page.
    PushNotifications.addListener('pushNotificationActionPerformed', function (action) {
      var dest = _routeForPayload(action && action.notification && action.notification.data);
      if (dest) window.location.href = dest;
    });

    // Re-register the token on auth changes so a sign-in on a fresh
    // install attaches the device to the new user immediately.
    if (window.db && window.db.auth && window.db.auth.onAuthStateChange) {
      window.db.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          PushNotifications.register().catch(function () {});
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
