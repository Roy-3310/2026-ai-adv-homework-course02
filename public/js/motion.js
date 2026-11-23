/**
 * Motion — 花漾生活 front-end motion layer.
 *  - GSAP timeline for page-load intro ([data-intro], ordered by DOM)
 *  - ScrollTrigger batch reveals ([data-reveal]) + parallax ([data-parallax])
 *  - fly-to-cart arc + cart badge bump
 *  - magnetic buttons ([data-magnetic])
 *  - canvas petal physics (payment success celebration)
 * Every effect degrades gracefully: no GSAP or prefers-reduced-motion → content is simply shown.
 */
var Motion = (function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var active = hasGsap && !reduced;

  if (active) {
    document.documentElement.classList.add('motion-ready');
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  }

  /** Reveal everything that is waiting, idempotent — safe to call after each Vue render. */
  function scan(root) {
    root = root || document;
    var intro = Array.prototype.filter.call(root.querySelectorAll('[data-intro]'), function (el) {
      return !el.dataset.motionDone;
    });
    var reveal = Array.prototype.filter.call(root.querySelectorAll('[data-reveal]'), function (el) {
      return !el.dataset.motionDone;
    });
    intro.concat(reveal).forEach(function (el) { el.dataset.motionDone = '1'; });

    if (!active) return;

    if (intro.length) {
      var tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.1 } });
      tl.fromTo(intro, { y: 36, opacity: 0, clipPath: 'inset(0 0 18% 0)' },
        { y: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', stagger: 0.09, clearProps: 'clipPath,transform' });
    }

    if (reveal.length && window.ScrollTrigger) {
      ScrollTrigger.batch(reveal, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          gsap.fromTo(batch, { y: 48, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1, clearProps: 'transform' });
        }
      });
      ScrollTrigger.refresh();
    } else if (reveal.length) {
      gsap.set(reveal, { opacity: 1 });
    }

    root.querySelectorAll('[data-parallax]:not([data-parallax-bound])').forEach(function (el) {
      el.setAttribute('data-parallax-bound', '1');
      if (!window.ScrollTrigger) return;
      var amount = parseFloat(el.dataset.parallax) || 12;
      gsap.fromTo(el, { yPercent: -amount / 2 }, {
        yPercent: amount / 2, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    magnetic(root);
  }

  /** Buttons lean toward the pointer, then spring back. */
  function magnetic(root) {
    if (!active || window.matchMedia('(hover: none)').matches) return;
    root.querySelectorAll('[data-magnetic]:not([data-magnetic-bound])').forEach(function (el) {
      el.setAttribute('data-magnetic-bound', '1');
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  function bumpBadge() {
    var badge = document.getElementById('cart-badge');
    if (!badge) return;
    badge.classList.remove('badge-bump');
    void badge.offsetWidth; // restart CSS animation
    badge.classList.add('badge-bump');
  }

  /** A petal-coloured dot travels on an arc from the clicked element to the cart button. */
  function flyToCart(fromEl) {
    var target = document.getElementById('cart-btn');
    if (!active || !fromEl || !target) { bumpBadge(); return; }
    var a = fromEl.getBoundingClientRect();
    var b = target.getBoundingClientRect();
    var dot = document.createElement('div');
    dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText = 'position:fixed;z-index:200;width:18px;height:18px;border-radius:999px 999px 999px 2px;' +
      'background:#A8443A;box-shadow:0 6px 20px rgba(168,68,58,.45);pointer-events:none;left:0;top:0;';
    document.body.appendChild(dot);
    var sx = a.left + a.width / 2 - 9, sy = a.top + a.height / 2 - 9;
    var ex = b.left + b.width / 2 - 9, ey = b.top + b.height / 2 - 9;
    var state = { t: 0 };
    gsap.set(dot, { x: sx, y: sy, scale: 0 });
    gsap.timeline({ onComplete: function () { dot.remove(); bumpBadge(); } })
      .to(dot, { scale: 1.2, duration: 0.18, ease: 'back.out(3)' })
      .to(state, {
        t: 1, duration: 0.85, ease: 'power2.inOut',
        onUpdate: function () {
          var t = state.t;
          // quadratic bezier with a control point lifted above both ends
          var cx = (sx + ex) / 2, cy = Math.min(sy, ey) - 160;
          var x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
          var y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
          gsap.set(dot, { x: x, y: y, rotation: t * 540, scale: 1.2 - t * 0.7 });
        }
      }, '<0.05');
  }

  /* ------------------------------------------------------------------
   * Petal physics — fixed-tick simulation (60Hz) decoupled from rAF draw.
   * Gravity + air drag + per-petal sinusoidal flutter + pointer force field.
   * ------------------------------------------------------------------ */
  function petals(canvas, opts) {
    if (!canvas || reduced) return function () {};
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var colors = ['#A8443A', '#C9776A', '#EBD3C7', '#B8975A', '#7C8B69', '#E3B5A8'];
    var pointer = { x: -9999, y: -9999 };
    var list = [];
    var spawnLeft = opts.count || 90;
    var tick = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn() {
      var burst = Math.random() < 0.5;
      list.push({
        x: burst ? W / 2 + (Math.random() - 0.5) * 120 : Math.random() * W,
        y: burst ? H * 0.28 : -20,
        vx: burst ? (Math.random() - 0.5) * 9 : (Math.random() - 0.5) * 1.2,
        vy: burst ? -4 - Math.random() * 6 : Math.random() * 1.5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.12,
        size: 7 + Math.random() * 9,
        phase: Math.random() * Math.PI * 2,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1
      });
    }
    function update() {
      tick++;
      if (spawnLeft > 0) { var n = tick < 6 ? 8 : 1; for (var i = 0; i < n && spawnLeft > 0; i++) { spawn(); spawnLeft--; } }
      for (var j = list.length - 1; j >= 0; j--) {
        var p = list[j];
        p.vy += 0.09;                                   // gravity
        p.vx *= 0.985; p.vy *= 0.985;                   // air drag
        p.vy = Math.min(p.vy, 2.4);                     // petals reach terminal velocity quickly
        p.x += p.vx + Math.sin(tick * 0.05 + p.phase) * 0.9; // flutter
        p.y += p.vy;
        p.rot += p.vr + Math.cos(tick * 0.04 + p.phase) * 0.02;
        var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) { var d = Math.sqrt(d2) || 1, f = (120 - d) / 120 * 1.6; p.vx += dx / d * f; p.vy += dy / d * f; }
        if (p.y > H - 10) p.life -= 0.02;
        if (p.life <= 0 || p.y > H + 40) list.splice(j, 1);
      }
    }
    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.phase + tick * 0.06))); // 3D-ish tumble
      ctx.globalAlpha = Math.max(0, p.life) * 0.92;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.6, p.size * 0.7, p.size * 0.7, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.7, -p.size * 0.9, -p.size * 0.6, 0, -p.size);
      ctx.fill();
      ctx.restore();
    }
    var raf, timer, alive = true;
    function draw() {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < list.length; i++) drawPetal(list[i]);
      if (spawnLeft <= 0 && list.length === 0) { stop(); return; }
      raf = requestAnimationFrame(draw);
    }
    function onMove(e) { var r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; }
    function stop() {
      alive = false;
      cancelAnimationFrame(raf); clearInterval(timer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    timer = setInterval(update, 1000 / 60);
    raf = requestAnimationFrame(draw);
    return stop;
  }

  /** Count a number up (used for totals). */
  function countUp(el, to) {
    if (!el) return;
    if (!active) { el.textContent = Number(to).toLocaleString(); return; }
    var o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString(); } });
  }

  document.addEventListener('DOMContentLoaded', function () {
    scan(document);
    // Vue re-renders (v-if / v-for) insert fresh nodes — pick them up automatically.
    var pending = null;
    new MutationObserver(function () {
      if (pending) return;
      pending = setTimeout(function () { pending = null; scan(document); }, 40);
    }).observe(document.body, { childList: true, subtree: true });
  });

  return { scan: scan, flyToCart: flyToCart, bumpBadge: bumpBadge, petals: petals, countUp: countUp, active: active };
})();
