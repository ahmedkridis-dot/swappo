// Vercel Edge Middleware — server-side share previews for product pages.
//
// WhatsApp, Messenger, Instagram, Telegram, X, iMessage, LinkedIn, Google…
// fetch product.html WITHOUT running JavaScript, so they only ever saw the
// generic "Product — Swappo" tags. For EVERY request to
// /pages/product.html?id=<uuid> (no user-agent sniffing — crawler lists
// always miss one) we fetch the item from Supabase (anon key, public RLS)
// and serve the very same static page with <title>, description, og:* and
// canonical rewritten for that item. Same scripts, same markup for humans;
// the edge caches each item page for a few minutes.
//
// No framework, no dependencies — Web APIs only (Edge runtime).

export const config = { matcher: '/pages/product.html' };

const SUPABASE_URL = 'https://cbhdjqionkvqiflmqchu.supabase.co';
const ANON_KEY = 'sb_publishable_aNOfDT5NUGDTN0HH5-uLuA_b58nEslu';
const SITE = 'https://swappo.ae';
const LOGO = SITE + '/assets/brand/swappo-logo-master.png';
const RENDERER_UA = 'swappo-og-renderer';


const CONDITION = { new: 'New', like_new: 'Like new', good: 'Good', fair: 'Fair' };
const UUID = /^[0-9a-f-]{32,36}$/i;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchItem(id) {
  const q = new URLSearchParams({
    select: 'id,brand,model,price,photos,category,condition,emirate,city,is_giveaway,status',
    id: 'eq.' + id,
    limit: '1',
  });
  const r = await fetch(SUPABASE_URL + '/rest/v1/items?' + q.toString(), {
    headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
  });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

// Uploads made after 2026-09-15 also store a ~600 px JPEG next to each photo
// (<uuid>_og.jpg). WhatsApp only renders preview images under ~300 KB, so we
// prefer it and fall back to the original (or the logo) when it is missing.
async function pickImage(item) {
  const first = Array.isArray(item.photos) && item.photos[0] ? String(item.photos[0]) : '';
  if (!first) return LOGO;
  const thumb = first.replace(/\.(webp|jpe?g|png)(\?.*)?$/i, '_og.jpg');
  if (thumb !== first) {
    try {
      const h = await fetch(thumb, { method: 'HEAD' });
      if (h.ok) return thumb;
    } catch (_) { /* fall through */ }
  }
  return first;
}

function buildTags(item, pageUrl, image) {
  // "Other" / "N/A" brands never make it into the shared title.
  const brand = /^(other|n\/a)$/i.test(String(item.brand || '').trim()) ? '' : item.brand;
  const name = [brand, item.model].filter(Boolean).join(' ').trim() || 'Item';
  const price = item.is_giveaway ? 'Free gift' : (item.price ? 'AED ' + Number(item.price).toLocaleString('en-US') : 'Open to swaps');
  const where = item.emirate || item.city || 'UAE';
  const cond = CONDITION[item.condition] || null;
  const title = name + ' — ' + price + ' · Swappo';
  const desc = [price, cond, where].filter(Boolean).join(' · ') + ' — swap, buy or gift it on Swappo, the UAE\'s first barter community.';
  return { title, desc, image: image || LOGO, pageUrl };
}

function rewriteHead(html, t) {
  return html
    .replace(/<title>[^<]*<\/title>/i, '<title>' + esc(t.title) + '</title>')
    .replace(/<meta name="description" content="[^"]*">/i, '<meta name="description" content="' + esc(t.desc) + '">')
    .replace(/<link rel="canonical" href="[^"]*">/i, '<link rel="canonical" href="' + esc(t.pageUrl) + '">')
    .replace(/<meta property="og:title" content="[^"]*">/i, '<meta property="og:title" content="' + esc(t.title) + '">')
    .replace(/<meta property="og:description" content="[^"]*">/i, '<meta property="og:description" content="' + esc(t.desc) + '">')
    .replace(/<meta property="og:type" content="[^"]*">/i, '<meta property="og:type" content="product">')
    .replace(/<meta property="og:url" content="[^"]*">/i, '<meta property="og:url" content="' + esc(t.pageUrl) + '">')
    .replace(/<meta property="og:image" content="[^"]*">/i,
      '<meta property="og:image" content="' + esc(t.image) + '">' +
      '<meta property="og:image:secure_url" content="' + esc(t.image) + '">' +
      '<meta name="twitter:image" content="' + esc(t.image) + '">' +
      '<meta name="twitter:title" content="' + esc(t.title) + '">' +
      '<meta name="twitter:description" content="' + esc(t.desc) + '">');
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim();
  const ua = req.headers.get('user-agent') || '';
  if (!id || !UUID.test(id) || ua.includes(RENDERER_UA)) return; // no item id → static file

  try {
    const item = await fetchItem(id);
    if (!item) return;
    // Same static page, fetched with a non-bot UA so this middleware passes it through.
    const page = await fetch(new URL('/pages/product.html', url.origin), { headers: { 'user-agent': RENDERER_UA } });
    if (!page.ok) return;
    const image = await pickImage(item);
    const html = rewriteHead(await page.text(), buildTags(item, SITE + '/pages/product.html?id=' + encodeURIComponent(id), image));
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=900',
        'x-swappo-og': 'item',
      },
    });
  } catch (_) {
    return; // any failure → serve the static page as before
  }
}
