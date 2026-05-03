/* ========================
   LEGAL EN-ONLY DISCLAIMER BANNER
   Swappo — swappo.ae

   Injects a small disclaimer at the top of legal pages (terms,
   privacy, cookies, legal) when the user's selected language is not
   English. The legal text itself is the authoritative EN version —
   translations would require legal review for each market.

   The disclaimer is bilingual: native message + "Continue reading
   in English". Picks up the language from <html lang="..."> which
   js/i18n.js sets when the user changes language.
   ======================== */

(function () {
  var MESSAGES = {
    fr: 'Pour des raisons légales, ce document n’est disponible qu’en anglais. La version anglaise fait foi.',
    ar: 'لأسباب قانونية، هذا المستند متوفر فقط باللغة الإنجليزية. النسخة الإنجليزية هي المرجع.',
    ur: 'قانونی وجوہات کی بنا پر، یہ دستاویز صرف انگریزی میں دستیاب ہے۔ انگریزی نسخہ مستند ہے۔',
    ru: 'По юридическим причинам этот документ доступен только на английском. Авторитетной является английская версия.'
  };
  var CONTINUE = {
    fr: 'Continuer en anglais',
    ar: 'متابعة بالإنجليزية',
    ur: 'انگریزی میں جاری رکھیں',
    ru: 'Продолжить на английском'
  };

  function detectLang() {
    // Match the same source of truth as js/i18n.js: <html lang="xx">,
    // then localStorage('swappo_lang'), then navigator.
    var fromHtml = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (fromHtml && MESSAGES[fromHtml]) return fromHtml;
    try {
      var stored = (localStorage.getItem('swappo_lang') || '').toLowerCase();
      if (stored && MESSAGES[stored]) return stored;
    } catch (e) { /* private mode */ }
    var nav = ((navigator.language || '').slice(0, 2) || '').toLowerCase();
    if (nav && MESSAGES[nav]) return nav;
    return 'en';
  }

  function injectBanner() {
    var lang = detectLang();
    if (lang === 'en') return; // English speakers see no banner
    if (document.getElementById('legal-en-only-banner')) return;

    var msg = MESSAGES[lang];
    var cont = CONTINUE[lang];
    if (!msg) return;

    var isRTL = (lang === 'ar' || lang === 'ur');
    var banner = document.createElement('div');
    banner.id = 'legal-en-only-banner';
    banner.dir = isRTL ? 'rtl' : 'ltr';
    banner.lang = lang;
    banner.style.cssText =
      'background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;' +
      'border-radius:12px;padding:14px 18px;margin:0 0 24px;' +
      'font-size:14px;line-height:1.5;display:flex;gap:12px;' +
      'align-items:flex-start;flex-wrap:wrap;' +
      (isRTL ? 'text-align:right;' : 'text-align:left;');
    banner.innerHTML =
      '<span style="font-size:18px;line-height:1;flex-shrink:0;">⚠️</span>' +
      '<div style="flex:1;min-width:200px;">' +
        '<p style="margin:0 0 6px;font-weight:600;">' + msg + '</p>' +
        '<button type="button" id="legal-en-only-continue" style="background:transparent;border:none;color:#92400E;text-decoration:underline;cursor:pointer;font-size:13px;font-weight:600;padding:0;font-family:inherit;">' + cont + ' →</button>' +
      '</div>';

    // Insert at the top of the .legal-container if present, else at body start.
    var host = document.querySelector('.legal-container') || document.body;
    if (host.firstChild) host.insertBefore(banner, host.firstChild);
    else host.appendChild(banner);

    var btn = document.getElementById('legal-en-only-continue');
    if (btn) {
      btn.addEventListener('click', function () {
        try { localStorage.setItem('swappo_lang', 'en'); } catch (e) { /* private mode */ }
        document.documentElement.setAttribute('lang', 'en');
        document.documentElement.setAttribute('dir', 'ltr');
        if (typeof window.translatePage === 'function') {
          try { window.translatePage(); } catch (e) { /* ignore */ }
        }
        banner.remove();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBanner);
  } else {
    injectBanner();
  }
})();
