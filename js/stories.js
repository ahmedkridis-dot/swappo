/* ============================================
   Swappo — Depop-style Stories (Pro feature)
   24-hour stories posted by Pro sellers against one of their items.
   Horizontal scroll bar + fullscreen viewer + "Propose a Swap" CTA.

   Schema: public.stories (id, user_id, item_id, media_url, caption,
   views_count, created_at, expires_at). RLS: select while expires_at>now(),
   insert when auth.uid()=user_id.
   ============================================ */
(function () {
  if (window.SwappoStories) return;

  function tr(key, fallback) { return (typeof t === 'function') ? t(key) : (fallback || key); }

  function injectStyles() {
    if (document.getElementById('swp-stories-style')) return;
    const s = document.createElement('style');
    s.id = 'swp-stories-style';
    s.textContent = [
      '.swp-stories { display: flex; gap: 10px; overflow-x: auto; padding: 10px 4px; scrollbar-width: none; }',
      '.swp-stories::-webkit-scrollbar { display: none; }',
      '.swp-stories .st-card { flex: 0 0 76px; cursor: pointer; text-align: center; }',
      '.swp-stories .st-ring { width: 72px; height: 72px; border-radius: 50%; padding: 3px; background: conic-gradient(from 0deg, #09B1BA, #F59E0B, #DB2777, #7C3AED, #09B1BA); box-shadow: 0 2px 8px rgba(9,177,186,0.25); }',
      '.swp-stories .st-ring.viewed { background: #D1D5DB; box-shadow: none; }',
      '.swp-stories .st-img { width: 100%; height: 100%; border-radius: 50%; background: #fff; overflow: hidden; display: flex; align-items: center; justify-content: center; }',
      '.swp-stories .st-img img { width: 100%; height: 100%; object-fit: cover; }',
      '.swp-stories .st-name { font-size: 0.72rem; font-weight: 600; color: #555; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }',
      '.swp-stories .st-add { flex: 0 0 76px; cursor: pointer; text-align: center; }',
      '.swp-stories .st-add .st-plus { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #F3F4F6; color: #09B1BA; font-size: 28px; border: 2px dashed #09B1BA; }',
      '.swp-stories .st-add .st-name { color: #09B1BA; }',
      /* Viewer */
      '.swp-story-viewer { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 9500; display: flex; align-items: center; justify-content: center; }',
      '.swp-story-viewer-inner { position: relative; width: min(420px, 92vw); height: min(720px, 86vh); border-radius: 16px; overflow: hidden; background: #111; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }',
      '.swp-story-viewer img { width: 100%; height: 100%; object-fit: cover; }',
      '.swp-story-bar { position: absolute; top: 8px; left: 8px; right: 8px; height: 3px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden; }',
      '.swp-story-bar-fill { height: 100%; width: 0; background: #fff; transition: width linear 5s; }',
      '.swp-story-close { position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.5); color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }',
      '.swp-story-caption { position: absolute; left: 16px; right: 16px; top: 30px; color: #fff; font-weight: 700; font-size: 15px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }',
      '.swp-story-item-card { position: absolute; left: 12px; right: 12px; bottom: 12px; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }',
      '.swp-story-item-card img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; background: #E5E7EB; }',
      '.swp-story-item-card .st-item-info { flex: 1; min-width: 0; }',
      '.swp-story-item-card .st-item-title { font-weight: 700; font-size: 14px; color: #171717; }',
      '.swp-story-item-card .st-item-price { font-size: 12px; color: #09B1BA; font-weight: 700; }',
      '.swp-story-item-card .st-item-cta { background: #09B1BA; color: #fff; border: 0; padding: 10px 14px; border-radius: 999px; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; font-family: inherit; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  async function fetchActive() {
    if (!window.db) return [];
    const res = await window.db.from('stories')
      .select('id,user_id,item_id,media_url,caption,views_count,created_at,expires_at')
      .order('created_at', { ascending: false }).limit(30);
    if (res.error) { console.warn('[stories.fetch]', res.error); return []; }
    // Enrich with poster display_name + item info in parallel.
    const data = res.data || [];
    if (!data.length) return [];
    const userIds = Array.from(new Set(data.map(s => s.user_id).filter(Boolean)));
    const itemIds = Array.from(new Set(data.map(s => s.item_id).filter(Boolean)));
    const [users, items] = await Promise.all([
      userIds.length ? window.db.from('users_public').select('id,display_name,avatar,is_pro').in('id', userIds) : { data: [] },
      itemIds.length ? window.db.from('items').select('id,brand,model,type,price,photos').in('id', itemIds) : { data: [] }
    ]);
    const uMap = {}, iMap = {};
    (users.data || []).forEach(u => { uMap[u.id] = u; });
    (items.data || []).forEach(it => { iMap[it.id] = it; });
    return data.map(s => ({
      ...s,
      _user: uMap[s.user_id] || null,
      _item: iMap[s.item_id] || null
    }));
  }

  async function renderBar(container) {
    injectStyles();
    const el = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!el) return;
    const stories = await fetchActive();
    const viewed = JSON.parse(localStorage.getItem('swappo_viewed_stories') || '[]');

    // Bar always shows "Add Story" slot for the current user.
    let html = '<div class="swp-stories">';
    html += '<div class="st-add" id="st-add-btn">' +
              '<div class="st-plus">+</div>' +
              '<div class="st-name">' + tr('stories_add', 'Add Story') + '</div>' +
            '</div>';
    stories.forEach(function (s) {
      const isViewed = viewed.indexOf(s.id) !== -1;
      const name = (s._user && s._user.display_name) || 'Swapper';
      const avatar = (s._user && s._user.avatar) || '';
      const photo = s.media_url || (s._item && s._item.photos && s._item.photos[0]) || '';
      html += '<div class="st-card" data-id="' + s.id + '">' +
                '<div class="st-ring' + (isViewed ? ' viewed' : '') + '">' +
                  '<div class="st-img">' +
                    (photo ? '<img src="' + photo + '" alt="">' : '<span style="font-size:28px;">👤</span>') +
                  '</div>' +
                '</div>' +
                '<div class="st-name">' + name + '</div>' +
              '</div>';
    });
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.st-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const id = card.getAttribute('data-id');
        const s = stories.find(x => x.id === id);
        if (s) openViewer(s, stories);
      });
    });
    el.querySelector('#st-add-btn').addEventListener('click', openAddStory);
  }

  async function openAddStory() {
    if (!window.db) return (window.Toast && Toast.error('Service unavailable.'));
    const u = await window.db.auth.getUser();
    const user = u && u.data ? u.data.user : null;
    if (!user) return (window.Toast && Toast.error('Please sign in to add a story.'));
    const profile = await window.db.from('users').select('is_pro').eq('id', user.id).single();
    if (!profile.data || !profile.data.is_pro) {
      if (window.Toast) Toast.warning(tr('stories_upgrade', 'Upgrade to Pro') + ' — ' + tr('stories_pro_only', 'Pro feature'));
      setTimeout(function () { window.location.href = 'pricing.html'; }, 900);
      return;
    }
    // Count active stories for this Pro (max 3).
    const cnt = await window.db.from('stories').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gt('expires_at', new Date().toISOString());
    if ((cnt.count || 0) >= 3) {
      return (window.Toast && Toast.warning(tr('stories_max', 'Max 3 active stories per Pro')));
    }
    // Pick one of the Pro's items.
    const items = await window.db.from('items').select('id,brand,model,photos').eq('user_id', user.id).eq('status', 'available').limit(10);
    if (!items.data || !items.data.length) {
      return (window.Toast && Toast.error('Publish an item first.'));
    }
    const names = items.data.map(function (it, i) {
      return (i + 1) + '. ' + ((it.brand || '') + ' ' + (it.model || '')).trim();
    }).join('\n');
    const choice = prompt('Add a story — pick which item:\n' + names + '\n\nEnter number:');
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= items.data.length) return;
    const item = items.data[idx];
    const caption = prompt('Caption for your story (optional):') || '';
    const media = (item.photos && item.photos[0]) || '';
    const ins = await window.db.from('stories').insert({
      user_id: user.id, item_id: item.id, media_url: media, caption: caption
    });
    if (ins.error) {
      (window.Toast && Toast.error(ins.error.message));
    } else {
      (window.Toast && Toast.success('Story live for 24 hours.'));
      // Re-render bar if it exists
      const bar = document.querySelector('#stories-bar') || document.querySelector('.swp-stories-host');
      if (bar) renderBar(bar);
    }
  }

  function openViewer(story, list) {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'swp-story-viewer';
    const inner = document.createElement('div');
    inner.className = 'swp-story-viewer-inner';
    const bar = document.createElement('div');
    bar.className = 'swp-story-bar';
    bar.innerHTML = '<div class="swp-story-bar-fill"></div>';
    const close = document.createElement('button');
    close.className = 'swp-story-close';
    close.textContent = '×';
    const img = document.createElement('img');
    img.src = story.media_url || (story._item && story._item.photos && story._item.photos[0]) || '';
    const cap = document.createElement('div');
    cap.className = 'swp-story-caption';
    cap.textContent = story.caption || (story._user && story._user.display_name) || '';
    const itemCard = document.createElement('div');
    itemCard.className = 'swp-story-item-card';
    const it = story._item || {};
    const title = ((it.brand || '') + ' ' + (it.model || '')).trim() || it.type || 'Item';
    const price = Number(it.price || 0).toLocaleString() + ' AED';
    itemCard.innerHTML =
      '<img src="' + ((it.photos && it.photos[0]) || story.media_url || '') + '" alt="">' +
      '<div class="st-item-info">' +
        '<div class="st-item-title"></div>' +
        '<div class="st-item-price">' + price + '</div>' +
      '</div>' +
      '<button class="st-item-cta">' + tr('story_view_item', 'Propose a Swap') + '</button>';
    itemCard.querySelector('.st-item-title').textContent = title;
    itemCard.querySelector('.st-item-cta').addEventListener('click', function () {
      if (it.id) window.location.href = 'product.html?id=' + it.id;
    });

    inner.appendChild(bar);
    inner.appendChild(close);
    inner.appendChild(img);
    inner.appendChild(cap);
    inner.appendChild(itemCard);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    // Animate bar and auto-close after 5s.
    requestAnimationFrame(function () { bar.querySelector('.swp-story-bar-fill').style.width = '100%'; });
    const timer = setTimeout(function () { dismiss(); }, 5000);

    function dismiss() {
      clearTimeout(timer);
      overlay.remove();
      try {
        const viewed = JSON.parse(localStorage.getItem('swappo_viewed_stories') || '[]');
        if (viewed.indexOf(story.id) === -1) viewed.push(story.id);
        localStorage.setItem('swappo_viewed_stories', JSON.stringify(viewed.slice(-200)));
      } catch (e) {}
      // Record the view via RPC — the old direct UPDATE on stories was
      // silently blocked by RLS (no UPDATE policy) and had a race on
      // concurrent viewers anyway. The RPC inserts into story_views with
      // ON CONFLICT DO NOTHING (one view per viewer per story), and a DB
      // trigger keeps stories.views_count in sync. Own-story views are
      // dropped server-side.
      if (window.db && story.id) {
        window.db.rpc('record_story_view', { p_story_id: story.id })
          .then(function () {})
          .catch(function () { /* best-effort */ });
      }
    }

    close.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
  }

  window.SwappoStories = { renderBar: renderBar, openAddStory: openAddStory };
})();
