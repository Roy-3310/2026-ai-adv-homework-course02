const Notification = {
  _timeout: null,

  show(message, type = 'info') {
    const el = document.getElementById('notification-toast');
    if (!el) return;

    const styles = {
      success: { cls: 'bg-moss text-paper', icon: '<path d="M5 12.5l4.5 4.5L19 7"/>' },
      error: { cls: 'bg-clay text-paper', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>' },
      warning: { cls: 'bg-gold text-ink', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>' },
      info: { cls: 'bg-ink text-paper', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>' }
    };
    const s = styles[type] || styles.info;

    el.className = 'fixed top-24 right-4 left-4 sm:left-auto sm:min-w-[300px] z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl ' +
      'shadow-[0_20px_50px_-20px_rgba(30,38,32,.5)] text-sm transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] ' + s.cls;
    el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">' + s.icon + '</svg><span></span>';
    el.querySelector('span').textContent = message;
    el.style.display = 'flex';
    el.style.transform = 'translateY(-12px)';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    });

    if (this._timeout) clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-12px)';
      setTimeout(() => { el.style.display = 'none'; }, 500);
    }, 3000);
  }
};
