/* ============================================
   Swappo — Toast notifications (standalone)
   Extracted from demo-engine.js so non-demo code can use it.
   Usage: Toast.show('Saved!', 'success'); Toast.show('Oops', 'error');
   ============================================ */
(function () {
  const TYPES = {
    success: { icon: '<i class="fas fa-check-circle"></i>', color: '#059669' },
    error:   { icon: '<i class="fas fa-exclamation-circle"></i>', color: '#DC2626' },
    warning: { icon: '<i class="fas fa-exclamation-triangle"></i>', color: '#F59E0B' },
    info:    { icon: '<i class="fas fa-info-circle"></i>', color: '#09B1BA' }
  };

  function ensureStyle() {
    if (document.getElementById('swappo-toast-style')) return;
    const style = document.createElement('style');
    style.id = 'swappo-toast-style';
    style.textContent =
      '@keyframes swappo-toast-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes swappo-toast-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(20px)}}';
    document.head.appendChild(style);
  }

  function show(message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;
    const cfg = TYPES[type] || TYPES.info;

    const existing = document.getElementById('swappo-toast');
    if (existing) existing.remove();

    ensureStyle();

    const toast = document.createElement('div');
    toast.id = 'swappo-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = cfg.icon + ' <span></span>';
    // Use textContent on the span to avoid any HTML injection from message.
    toast.querySelector('span').textContent = String(message || '');
    toast.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:99999;' +
      'background:' + cfg.color + ';color:#fff;' +
      'padding:14px 24px;border-radius:12px;font-family:Inter,sans-serif;font-size:14px;' +
      'display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,0.18);' +
      'animation:swappo-toast-in 0.35s ease;max-width:400px;';
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.style.animation = 'swappo-toast-out 0.35s ease forwards';
      setTimeout(function () { toast.remove(); }, 350);
    }, duration);
  }

  const Toast = { show: show, success: function(m,d){ show(m,'success',d); }, error: function(m,d){ show(m,'error',d); }, warning: function(m,d){ show(m,'warning',d); }, info: function(m,d){ show(m,'info',d); } };
  try { window.Toast = Toast; } catch (e) {}
})();
