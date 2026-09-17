# Modération Swappo — procédure et runbook

Ahmed donne une adresse email. Claude Code fait tout le reste. Réponse en français.
Règle Swappo : **une fausse annonce = compte fermé, sans avertissement.** Jamais de `delete` : on change des statuts, tout est réversible.

## Commande d'Ahmed

« Bannis x@y.com » / « Suspends x@y.com » / « Ferme le compte x@y.com » (même effet).

## Ce que fait Claude Code

### 1. Identifier le compte (email exact, jamais deviné)
```sql
select u.id, u.email, u.created_at, p.pseudo, p.is_banned, p.banned_at, p.ban_reason
from auth.users u join public.users p on p.id = u.id
where lower(u.email) = lower('x@y.com');
```
Aucun résultat → le dire à Ahmed et s'arrêter.

### 2. Lister ses annonces en ligne et ses demandes en attente
```sql
select id, brand, model, category, status, created_at from public.items where user_id = '<id>' order by created_at desc;
select id, receiver_item_id, is_giveaway_claim, status, created_at from public.swaps where proposer_id = '<id>' and status = 'pending';
```
Montrer ce résumé à Ahmed **avant** d'agir et attendre son « ok » — sauf s'il a déjà désigné l'annonce fausse lui-même.

### 3. Agir : passer la fausse annonce en `suspended`
```sql
update public.items set status = 'suspended' where id = '<item id>';
```
Le trigger `on_item_suspended` (migration `supabase/migrations/040_ban_on_fake_listing.sql`) fait le reste, dans la même transaction :

| Quoi | Résultat |
|------|----------|
| `public.users` | `is_banned = true`, `banned_at = now()`, `ban_reason = 'fake_listing'`, `is_suspended = true` (le membre disparaît de `users_public`, donc des cartes et profils) |
| Ses autres annonces `available` / `reserved` | `suspended` |
| Ses swaps, offres et claims `pending` | `cancelled` |
| Notification `kind = 'banned'` | « Account closed — Your listing "…" was removed because it doesn't show a real item… » — envoyée aussi par email (`send-swap-email`), quelles que soient ses préférences |
| Site | bandeau « This account has been closed. Contact contact@swappo.ae. », boutons publier / claim / offre / message désactivés (`js/banned-guard.js`) ; la base refuse tout `INSERT` sur `items`, `swaps`, `messages` |
| Connexion | toujours possible : il peut lire l'explication |

### 4. Vérifier et rapporter
```sql
select p.pseudo, p.is_banned, p.ban_reason,
  (select count(*) from public.items i where i.user_id = p.id and i.status = 'suspended') as items_suspended,
  (select count(*) from public.notifications n where n.user_id = p.id and n.kind = 'banned') as banned_notifs
from public.users p where p.id = '<id>';
```
Rapport à Ahmed en 3 lignes : qui, quoi, résultat.

## Réhabiliter (erreur)
```sql
select public.admin_unban_user('x@y.com');
```
Efface `is_banned` / `banned_at` / `ban_reason` / `is_suspended` et remet toutes ses annonces `suspended` en `available`. Pour garder une annonce précise hors ligne, la repasser ensuite en `removed`. Les demandes annulées restent annulées.

## Suspension dure (connexion bloquée)
Pour un comportement grave au-delà d'une fausse annonce (harcèlement, tentative d'escroquerie) :
```sql
select public.admin_suspend_user('x@y.com', 'motif');   -- migration 039
select public.admin_reinstate_user('x@y.com');
```
Bloque la connexion (`auth.users.banned_until`), ferme toutes ses sessions, retire ses annonces en ligne (`removed`) et refuse ses deals ouverts. Le rétablissement inverse tout, sauf les deals refusés.

## Interdits
- Jamais de `delete` sur `users`, `items`, `swaps` — toujours changer le statut.
- Ne jamais toucher `auth.users` à la main : passer par les fonctions `admin_*`.
- Ne jamais agir sur un email qui ne correspond pas exactement à un compte.
- Jamais d'avertissement ni de deuxième chance pour une fausse annonce.
