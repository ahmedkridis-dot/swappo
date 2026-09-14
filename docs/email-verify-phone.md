# Email — "Get your Verified badge on Swappo"

**Status:** template only — NOT sent yet.
**Send on:** the day `FEATURES.PHONE_VERIFICATION` is flipped to `true` (after Twilio Phone Auth is enabled in Supabase → Auth → Providers → Phone).
**Audience:** every existing account with `users.is_verified = false`.
**From:** Swappo <noreply@send.swappo.ae> (same sender as transactional mail).
**Deep link:** `https://swappo.ae/pages/profile.html#verify` — opens My Swaps → Settings and scrolls to the "Verify your phone number" block.
**Bonus rule:** first 500 verified accounts get one free 24h boost (apply via `boost_purchases` with `amount_aed = 0`, or a one-off SQL — decide before sending).

---

## EN

**Subject:** Get your Verified badge on Swappo ✓

Hi {{first_name}},

Trust is what makes a good swap. From today you can add a **✓ Verified** badge to your Swappo profile by confirming your phone number.

**Why verify?**
- Other swappers see you're a real person — more replies, faster deals.
- Your number stays private. It is never shown to anyone, before or after a swap.

**How (30 seconds):**
1. Open **My Swaps** → **Settings**
2. Enter your mobile number and tap **Send code**
3. Type the 6-digit SMS code → done ✓

**Early-bird bonus:** the first verified swappers get a free **24h boost** on one listing.

👉 [Verify my number](https://swappo.ae/pages/profile.html#verify)

Happy swapping,
The Swappo team

*This is a service message about your Swappo account. Your phone number is used only for verification and is deleted with your account. [Privacy Policy](https://swappo.ae/pages/privacy.html)*

---

## AR

**الموضوع:** احصل على شارة "موثّق" على Swappo ✓

مرحباً {{first_name}}،

الثقة هي أساس أي مبادلة ناجحة. ابتداءً من اليوم يمكنك إضافة شارة **✓ موثّق** إلى ملفك على Swappo عبر تأكيد رقم هاتفك.

**لماذا التوثيق؟**
- يرى المبادلون الآخرون أنك شخص حقيقي — ردود أكثر وصفقات أسرع.
- رقمك يبقى خاصاً. لا يُعرض لأي شخص، لا قبل المبادلة ولا بعدها.

**كيف (30 ثانية):**
1. افتح **My Swaps** ← **الإعدادات**
2. أدخل رقم جوالك واضغط **إرسال الرمز**
3. اكتب رمز الرسالة المكوّن من 6 أرقام ← تم ✓

**مكافأة المبكّرين:** أول المبادلين الموثّقين يحصلون على **تعزيز 24 ساعة** مجاني لإعلان واحد.

👈 [وثّق رقمي](https://swappo.ae/pages/profile.html#verify)

مبادلات سعيدة،
فريق Swappo

*هذه رسالة خدمة تخص حسابك على Swappo. يُستخدم رقم هاتفك للتحقق فقط ويُحذف مع حسابك. [سياسة الخصوصية](https://swappo.ae/pages/privacy.html)*

---

## FR

**Objet :** Obtenez votre badge Vérifié sur Swappo ✓

Bonjour {{first_name}},

La confiance fait les bons échanges. Dès aujourd'hui, ajoutez un badge **✓ Vérifié** à votre profil Swappo en confirmant votre numéro de téléphone.

**Pourquoi vérifier ?**
- Les autres swappers voient que vous êtes une vraie personne — plus de réponses, des deals plus rapides.
- Votre numéro reste privé. Il n'est jamais affiché, ni avant ni après un échange.

**Comment (30 secondes) :**
1. Ouvrez **My Swaps** → **Paramètres**
2. Saisissez votre mobile et appuyez sur **Envoyer le code**
3. Tapez le code SMS à 6 chiffres → c'est fait ✓

**Bonus early-bird :** les premiers swappers vérifiés reçoivent un **boost 24 h** offert sur une annonce.

👉 [Vérifier mon numéro](https://swappo.ae/pages/profile.html#verify)

Bons échanges,
L'équipe Swappo

*Ceci est un message de service concernant votre compte Swappo. Votre numéro sert uniquement à la vérification et est supprimé avec votre compte. [Politique de confidentialité](https://swappo.ae/pages/privacy.html)*

---

## Activation checklist (for Ahmed)

1. Supabase Dashboard → Auth → Providers → **Phone** → enable, paste Twilio SID / token / Message Service SID.
2. Run `supabase/migrations/027_phone_verification.sql` in the SQL Editor (idempotent).
3. `js/constants.js` → `PHONE_VERIFICATION: true` → commit → push (Vercel auto-deploys).
4. Bump `CACHE_NAME` in `sw.js` so returning users pick up the new constants.
5. Test with your own account: dashboard banner appears → Send code → Verify → badge shows on identity card, public profile, catalogue cards.
6. Send this email (EN by default; AR/FR by the user's `language` preference if you segment).
