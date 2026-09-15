// Vercel Edge Middleware — server-side share previews for product pages.
//
// WhatsApp, Facebook, Telegram, X, Slack, Google… fetch product.html WITHOUT
// running JavaScript, so they only ever saw the generic "Product — Swappo"
// tags. When a known crawler asks for /pages/product.html?id=<uuid>, we
// fetch the item from Supabase (anon key, public RLS) and serve the very
// same static page with the <title>, description, og:* and canonical tags
// rewritten for that item. Humans keep hitting the static file untouched.
//
// No framework, no dependencies — Web APIs only (Edge runtime).

export const config = { matcher: '/pages/product.html' };

const SUPABASE_URL = 'https://cbhdjqionkvqiflmqchu.supabase.co';
const ANON_KEY = 'sb_publishable_aNOfDT5NUGDTN0HH5-uLuA_b58nEslu';
const SITE = 'https://swappo.ae';
const LOGO = SITE + '/assets/brand/swappo-logo-master.png';
const RENDERER_UA = 'swappo-og-renderer';

const BOTS = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|slack-imgproxy|linkedinbot|discordbot|pinterest|skypeuripreview|googlebot|bingbot|applebot|iframely|embedly|snapchat|vkshare|redditbot|quora link preview|outbrain|w3c_validator|yahoo|duckduckbot|baiduspider|yandex/i;

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

function buildTags(item, pageUrl) {
  const name = [item.brand, item.model].filter(Boolean).join(' ').trim() || 'Item';
  const price = item.is_giveaway ? 'Free gift' : (item.price ? 'AED ' + Number(item.price).toLocaleString('en-US') : 'Open to swaps');
  const where = item.emirate || item.city || 'UAE';
  const cond = CONDITION[item.condition] || null;
  const title = name + ' — ' + price + ' · Swappo';
  const desc = [price, cond, where].filter(Boolean).join(' · ') + ' — swap, buy or gift it on Swappo, the UAE\'s first barter community.';
  const image = (Array.isArray(item.photos) && item.photos[0]) ? item.photos[0] : LOGO;
  return { title, desc, image, pageUrl };
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
  if (!id || !UUID.test(id) || !BOTS.test(ua) || ua.includes(RENDERER_UA)) return; // humans → static file

  try {
    const item = await fetchItem(id);
    if (!item) return;
    // Same static page, fetched with a non-bot UA so this middleware passes it through.
    const page = await fetch(new URL('/pages/product.html', url.origin), { headers: { 'user-agent': RENDERER_UA } });
    if (!page.ok) return;
    const html = rewriteHead(await page.text(), buildTags(item, SITE + '/pages/product.html?id=' + encodeURIComponent(id)));
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
