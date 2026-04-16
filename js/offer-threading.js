/* ============================================
   Swappo — Carousell-style Offer Threading
   When a swap has a chain of counter-offers linked via parent_offer_id,
   this module fetches the full thread and renders a collapsible vertical
   history with the latest node at the top carrying Accept / Decline /
   Counter actions.
   ============================================ */
(function () {
  if (window.SwappoOfferThread) return;

  function tr(key, fallback) { return (typeof t === 'function') ? t(key) : (fallback || key); }

  function injectStyles() {
    if (document.getElementById('swp-offer-thread-style')) return;
    const s = document.createElement('style');
    s.id = 'swp-offer-thread-style';
    s.textContent = [
      '.swp-thread { border: 1px solid #EBEBEB; border-radius: 12px; padding: 10px 12px; margin: 10px 0; background: #F8F9FA; font-family: Inter, sans-serif; }',
      '.swp-thread-head { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 700; color: #171717; cursor: pointer; }',
      '.swp-thread-head .caret { transition: transform 0.15s; color: #9CA3AF; }',
      '.swp-thread.collapsed .caret { transform: rotate(-90deg); }',
      '.swp-thread-nodes { margin-top: 10px; display: grid; gap: 8px; }',
      '.swp-thread.collapsed .swp-thread-nodes { display: none; }',
      '.swp-node { border-left: 2px solid #09B1BA; padding: 8px 12px; background: #fff; border-radius: 8px; font-size: 0.82rem; }',
      '.swp-node.declined { border-left-color: #DC2626; opacity: 0.7; }',
      '.swp-node.current { border-left-color: #F59E0B; background: #FEF3C7; }',
      '.swp-node-who { font-weight: 700; color: #171717; margin-bottom: 2px; }',
      '.swp-node-what { font-size: 0.78rem; color: #555; }',
      '.swp-node-time { font-size: 0.72rem; color: #9CA3AF; margin-top: 2px; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  async function fetchChain(swapId) {
    if (!window.db || !swapId) return [];
    // Walk up via parent_offer_id until null.
    const chain = [];
    let cur = swapId;
    const guard = 20;
    for (let i = 0; i < guard && cur; i++) {
      const res = await window.db.from('swaps')
        .select('id,status,proposer_id,receiver_id,proposer_item_id,receiver_item_id,cash_amount,cash_direction,created_at,parent_offer_id')
        .eq('id', cur).maybeSingle();
      if (res.error || !res.data) break;
      chain.unshift(res.data);
      cur = res.data.parent_offer_id;
    }
    // Enrich with item labels
    const itemIds = Array.from(new Set(chain.flatMap(n => [n.proposer_item_id, n.receiver_item_id]).filter(Boolean)));
    const items = itemIds.length
      ? (await window.db.from('items').select('id,brand,model,type,price').in('id', itemIds)).data || []
      : [];
    const iMap = {};
    items.forEach(it => { iMap[it.id] = ((it.brand || '') + ' ' + (it.model || '')).trim() || it.type || 'item'; });

    // Enrich with poster hash
    const userIds = Array.from(new Set(chain.flatMap(n => [n.proposer_id, n.receiver_id]).filter(Boolean)));
    const users = userIds.length
      ? (await window.db.from('users_public').select('id,display_name').in('id', userIds)).data || []
      : [];
    const uMap = {};
    users.forEach(u => { uMap[u.id] = u.display_name || ('Swapper#' + String(u.id).replace(/-/g,'').slice(0,4).toUpperCase()); });

    return chain.map(n => ({
      ...n,
      _proposerName: uMap[n.proposer_id],
      _theirItem: iMap[n.proposer_item_id] || null,
      _yourItem: iMap[n.receiver_item_id] || null
    }));
  }

  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  }

  /**
   * Render the thread into `container`. Returns the chain array.
   */
  async function render(container, swapId, opts) {
    opts = opts || {};
    injectStyles();
    const el = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!el) return [];

    const chain = await fetchChain(swapId);
    if (chain.length <= 1) { el.innerHTML = ''; return chain; }

    const wrap = document.createElement('div');
    wrap.className = 'swp-thread';
    const startCollapsed = opts.startCollapsed !== false;
    if (startCollapsed) wrap.classList.add('collapsed');

    const head = document.createElement('div');
    head.className = 'swp-thread-head';
    head.innerHTML = '<span>' + tr('offer_thread', 'Offer history') + ' · ' + chain.length + '</span>' +
                     '<span class="caret">▾</span>';
    head.addEventListener('click', function () { wrap.classList.toggle('collapsed'); });

    const nodes = document.createElement('div');
    nodes.className = 'swp-thread-nodes';
    chain.forEach(function (n, idx) {
      const isLatest = (idx === chain.length - 1);
      const cls = n.status === 'declined' ? 'declined' : (isLatest ? 'current' : '');
      const node = document.createElement('div');
      node.className = 'swp-node' + (cls ? ' ' + cls : '');
      const offerLabel = n.cash_amount > 0
        ? (n._theirItem ? n._theirItem + ' + ' + n.cash_amount + ' AED' : n.cash_amount + ' AED')
        : (n._theirItem || '—');
      node.innerHTML = '<div class="swp-node-who"></div>' +
                       '<div class="swp-node-what"></div>' +
                       '<div class="swp-node-time">' + fmtTime(n.created_at) + ' · ' + (n.status || 'pending') + '</div>';
      node.querySelector('.swp-node-who').textContent = n._proposerName || 'Swapper';
      node.querySelector('.swp-node-what').textContent = offerLabel + (n._yourItem ? ' → ' + n._yourItem : '');
      nodes.appendChild(node);
    });

    wrap.appendChild(head);
    wrap.appendChild(nodes);
    el.innerHTML = '';
    el.appendChild(wrap);
    return chain;
  }

  window.SwappoOfferThread = { render: render, fetchChain: fetchChain };
})();
