// Vercel Serverless Function — short share link  swappo.ae/i/<item id>
//
// Crawlers (WhatsApp, Facebook, Telegram, X) don't run JavaScript, so the
// share links point here: a tiny HTML page whose Open Graph tags carry
// the item's title, price and photo, then an instant redirect to the
// product page for humans. Not found / not live → the Swap Market.
//
// Route: vercel.json rewrites /i/:id → /api/share?id=:id
// Reads Supabase REST with the public (publishable) key — the same one
// shipped in js/supabase.js; RLS lets anyone read items.

const SUPABASE_URL = 'https://cbhdjqionkvqiflmqchu.supabase.co';
const ANON_KEY = 'sb_publishable_aNOfDT5NUGDTN0HH5-uLuA_b58nEslu';
const SITE = 'https://swappo.ae';
const FALLBACK_IMAGE = SITE + '/assets/brand/swappo-social-cover-1200x630.png';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cleanBrand = (b) => (/^(other|n\/a)$/i.test(String(b || '').trim()) ? '' : String(b || '').trim());

async function fetchItem(id) {
  const url = SUPABASE_URL + '/rest/v1/items?id=eq.' + encodeURIComponent(id) +
    '&select=id,brand,model,type,category,price,photos,condition,is_giveaway,status,city';
  const r = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY }, signal: AbortSignal.timeout(4000) });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

// Prefer the ≤600px JPEG thumbnail uploaded next to each photo
// (<uuid>_og.jpg): WhatsApp ignores images that are too heavy.
async function pickImage(photos) {
  const first = Array.isArray(photos) && photos[0] ? String(photos[0]) : '';
  if (!/^https?:\/\//.test(first)) return FALLBACK_IMAGE;
  const og = first.replace(/\.(webp|jpe?g|png)$/i, '_og.jpg');
  if (og !== first) {
    try {
      const h = await fetch(og, { method: 'HEAD', signal: AbortSignal.timeout(2500) });
      if (h.ok) return og;
    } catch (e) { /* fall through */ }
  }
  return first;
}

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '').trim();
  const market = '/pages/catalogue.html';
  if (!UUID.test(id)) { res.statusCode = 302; res.setHeader('Location', market); return res.end(); }

  let item = null;
  try { item = await fetchItem(id); } catch (e) { item = null; }
  if (!item || item.status !== 'available') { res.statusCode = 302; res.setHeader('Location', market); return res.end(); }

  const title = ((cleanBrand(item.brand) + ' ' + (item.model || '')).trim() || item.type || item.category || 'Item');
  const price = Number(item.price) || 0;
  const ogTitle = item.is_giveaway ? title + ' — Free on Swappo' : (price > 0 ? title + ' — ' + price.toLocaleString('en-US') + ' AED' : title + ' — on Swappo');
  const ogDesc = 'Swap, buy, sell & gift across the UAE. Sign up to see more.';
  const image = await pickImage(item.photos);
  const target = '/pages/product.html?id=' + encodeURIComponent(id);
  const canonical = SITE + '/i/' + encodeURIComponent(id);

  const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<title>' + esc(ogTitle) + '</title>' +
    '<meta name="robots" content="noindex">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:site_name" content="Swappo">' +
    '<meta property="og:title" content="' + esc(ogTitle) + '">' +
    '<meta property="og:description" content="' + esc(ogDesc) + '">' +
    '<meta property="og:image" content="' + esc(image) + '">' +
    '<meta property="og:url" content="' + esc(canonical) + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(ogTitle) + '">' +
    '<meta name="twitter:description" content="' + esc(ogDesc) + '">' +
    '<meta name="twitter:image" content="' + esc(image) + '">' +
    '<meta http-equiv="refresh" content="0;url=' + esc(target) + '">' +
    '<script>location.replace(' + JSON.stringify(target) + ');</script>' +
    '</head><body><p><a href="' + esc(target) + '">' + esc(ogTitle) + '</a></p></body></html>';

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.end(html);
};
