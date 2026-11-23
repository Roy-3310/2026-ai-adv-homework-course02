# Accessibility & Performance for Motion

Read this for every motion task. Motion that makes people dizzy, can't be stopped, or drains a laptop battery is a bug, however good it looks.

## Reduced motion

Some users set "reduce motion" at the OS level (vestibular disorders, migraines, motion sickness). Respect it everywhere:

| Layer | How |
|---|---|
| CSS | `@media (prefers-reduced-motion: reduce) { … }` — or Tailwind `motion-reduce:` / `motion-safe:` |
| JS / canvas | `matchMedia("(prefers-reduced-motion: reduce)")`, and listen for changes |
| GSAP | `gsap.matchMedia()` with a reduced branch (see `gsap-motion.md`) |
| React (Motion lib) | `useReducedMotion()` |

```js
const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduced = rm.matches;
rm.addEventListener("change", (e) => { reduced = e.matches; applyMotionMode(); });
```

What "reduced" should mean — reduce, don't necessarily remove:
- **Keep:** opacity fades, colour changes, short state feedback (a button press).
- **Remove or replace:** parallax, large translations, zoom/scale-in of big areas, spinning, infinite ambient loops, scroll-jacking, screen-wide particle effects.
- **Canvas:** render one still frame (or a much slower, calmer version) and stop the loop. Generative growth: compute to completion, draw once.
- **Content must still be visible.** Scroll-reveal elements show in their final state; nothing important is hidden behind an animation.

## Let people stop it

WCAG 2.2.2 (Pause, Stop, Hide): anything that moves automatically for more than 5 seconds alongside other content needs a way to pause or stop it. For ambient backgrounds and canvas loops, provide a visible, keyboard-reachable pause button:

```js
let paused = false;
pauseBtn.addEventListener("click", () => {
  paused = !paused;
  pauseBtn.setAttribute("aria-pressed", String(paused));
  pauseBtn.textContent = paused ? "Play animation" : "Pause animation";
});
// in the loop: if (!paused) run update ticks; still draw so the frozen frame stays visible
```

Also:
- No flashing more than 3 times per second (seizure risk, WCAG 2.3.1) — watch strobing particles and rapid colour cycling.
- Decorative canvases get `aria-hidden="true"` (or `role="img"` + `aria-label` if they convey meaning). Interactive canvas toys need a non-canvas description or alternative for screen-reader users.
- Anything triggered by hover must also be reachable by focus and tap (see `css-driven-interactivity.md`).

## Don't run what nobody sees

- **Hidden tab:** rAF already pauses. Don't use `setInterval` for animation — it keeps running (throttled) in the background. The accumulator clamp in the starter prevents a burst of catch-up ticks on return.
- **Scrolled off-screen:** pause the canvas loop with an `IntersectionObserver`:
  ```js
  new IntersectionObserver(([entry]) => entry.isIntersecting ? start() : stop()).observe(canvas);
  ```
- **CSS loops** off-screen still cost compositing; for heavy ones toggle a class (`.is-visible`) that sets `animation-play-state: running`.

Both starters in `assets/` already do the off-screen and hidden-tab handling.

## Frame budget

At 60 Hz you have ~16.7 ms per frame for *everything* (your JS, style, layout, paint, composite); at 120 Hz, ~8.3 ms. Aim for your own update + draw to stay well under half of that.

### DOM / CSS
- Animate only `transform`, `opacity`, and the individual `translate`/`scale`/`rotate` properties — they can run on the compositor without layout or paint.
- No `transition: all`. List properties.
- `will-change: transform` only on elements that are about to animate, and remove it afterwards — each one costs GPU memory.
- Avoid animating `filter: blur()`, `box-shadow`, and large `backdrop-filter` areas; they repaint every frame. Fake shadows with a pre-blurred pseudo-element whose `opacity` you animate.
- Don't read layout (`offsetTop`, `getBoundingClientRect`) and write styles in the same loop — batch reads, then writes.

### Canvas
- **Cap counts.** Every particle system needs a `MAX_*` constant. Rough budgets for simple filled circles on mid-range hardware: hundreds is trivial, a few thousand is fine, tens of thousands needs a different approach (WebGL / instancing / Pixi.js).
- **Allocate less in hot loops.** Use the in-place `Vec2` methods (`addSelf`, `scaleSelf`); compact arrays in place instead of `filter` when counts are large; reuse dead particles from a pool instead of `new`.
- **Batch draw calls.** Same-colour shapes can share one path: `beginPath()`, many `moveTo`+`arc`, one `fill()`. Changing `fillStyle` per object is a cost; group by colour.
- **Cache sprites.** Pre-render a complex or glowing particle once to an offscreen canvas and `drawImage` it, rather than using `shadowBlur` (very expensive) per particle per frame.
- **Cap DPR at 2.** A 3× display renders 9× the pixels of 1×; the visual gain over 2× is small.
- **Avoid per-segment strokes** for gradients — use `createLinearGradient` (see `procedural-generative-motion.md`).
- **Heavy simulations:** lower `TICK_HZ` (interpolation hides it), or move the simulation to a Web Worker with `OffscreenCanvas`.

## Measure, don't guess

- Chrome DevTools → **Performance**: record a few seconds; look for long frames (red), long tasks, and "Layout"/"Recalculate Style" in the animation loop.
- **Rendering** panel: "Frame Rendering Stats" (live fps), "Paint flashing" (unexpected repaints), "Emulate CSS prefers-reduced-motion" (test the reduced path without changing OS settings).
- Test with CPU throttling (4×) to approximate a mid-range phone, and on at least one real touch device.
- A quick in-page fps readout for development:
  ```js
  let frames = 0, t0 = performance.now();
  function fpsTick(now) { frames++; if (now - t0 > 1000) { console.log("fps", frames); frames = 0; t0 = now; } }
  // call fpsTick(now) from the rAF loop; remove before shipping
  ```
