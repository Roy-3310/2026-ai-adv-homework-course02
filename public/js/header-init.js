document.addEventListener('DOMContentLoaded', function () {
  const authNav = document.getElementById('auth-nav');
  const authNavMobile = document.getElementById('auth-nav-mobile');
  const cartBadge = document.getElementById('cart-badge');
  const ordersLinks = [document.getElementById('orders-link'), document.getElementById('orders-link-mobile')];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  let html = '';
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (Auth.isAdmin()) {
      html += '<a href="/admin/products" class="text-clay hover:text-clay-dark transition-colors">後台管理</a>';
    }
    html += '<span class="text-ink">' + escapeHtml(user?.name || '') + '</span>';
    html += '<button type="button" onclick="Auth.logout()" class="text-ink-muted hover:text-clay transition-colors">登出</button>';
  } else {
    html = '<a href="/login" class="flex items-center gap-1.5 hover:text-ink transition-colors">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>登入</a>';
  }
  if (authNav) authNav.innerHTML = html;
  if (authNavMobile) authNavMobile.innerHTML = html;

  ordersLinks.forEach(function (el) {
    if (el) el.style.display = Auth.isLoggedIn() ? '' : 'none';
  });

  if (cartBadge) {
    apiFetch('/api/cart').then(function (res) {
      if (res && res.data && res.data.items && res.data.items.length > 0) {
        cartBadge.textContent = res.data.items.length;
        cartBadge.style.display = 'flex';
      }
    }).catch(function () {});
  }

  // Mobile drawer
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.style.maxHeight = open ? '0px' : menu.scrollHeight + 'px';
      menu.classList.toggle('border-line', !open);
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { toggle.click(); });
    });
  }

  // Header gains depth once the page scrolls
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = function () { header.classList.toggle('shadow-[0_10px_30px_-18px_rgba(30,38,32,.35)]', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
});

/** Shared helper for page scripts: increment the header cart badge. */
window.incrementCartBadge = function () {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  badge.textContent = (parseInt(badge.textContent || '0', 10) || 0) + 1;
  badge.style.display = 'flex';
};
