# GSAP Tweening, Timelines & Scroll Effects

GSAP as a general-purpose value animator (DOM *and* plain objects), timeline sequencing, scroll-driven playback, and the React integration rules that prevent duplicate or leaking animations.

GSAP — including its former "bonus" plugins (SplitText, MorphSVG, etc.) — has been free to use, commercial projects included, since 2025. Install from npm (`gsap`, `@gsap/react`).

```js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger); // once, at module scope
```

## Tweening non-DOM state

GSAP tweens properties on any object, including objects a canvas `draw()` reads every frame. GSAP's easing then drives canvas animation without touching the DOM:

```js
class TreeStage {
  constructor(args) { Object.assign(this, { width: 100, height: 50, angle: 0, color: "#fff" }, args); }
}
const stages = [/* TreeStage instances */];

gsap.to(stages, {
  angle: -0.5,
  duration: 2,
  stagger: 0.2,            // each target starts 0.2 s after the previous
  ease: "elastic.out(1, 0.4)",
  repeat: 2,
  yoyo: true,              // reverse on each repeat
  yoyoEase: "power2.inOut",// a different ease on the return trip
});
```

Re-triggering on a click, toggling direction each time. `overwrite: "auto"` kills the conflicting part of a still-running tween, so rapid clicks don't stack competing tweens on the same property:

```js
let flipped = false;
function sway() {
  flipped = !flipped;
  gsap.to(stages, { angle: flipped ? 0.5 : -0.5, duration: 2, ease: "elastic.out(1, 0.4)", stagger: 0.1, overwrite: "auto" });
}
```

### Driving the canvas loop from GSAP's ticker

If GSAP is animating canvas values, you can draw on GSAP's own ticker instead of a separate rAF loop — one loop, already synchronised with tweens:

```js
const render = () => draw(ctx);
gsap.ticker.add(render);
// teardown: gsap.ticker.remove(render);
```

If you also run fixed-step physics, keep the accumulator loop from `canvas-physics-engine.md` and let GSAP only mutate the objects it reads.

### Following the pointer smoothly: `quickTo`

For values updated on every pointer move, `gsap.quickTo` reuses one tween instead of creating a new one per event:

```js
const xTo = gsap.quickTo(".cursor", "x", { duration: 0.4, ease: "power3" });
const yTo = gsap.quickTo(".cursor", "y", { duration: 0.4, ease: "power3" });
window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });
```

### Legacy API

`TweenMax.staggerFrom(targets, dur, vars, stagger)` = `gsap.from(targets, { duration: dur, ...vars, stagger })`. `TweenMax`/`TimelineMax` are GSAP 2 names still found in older code; use `gsap.to/from/fromTo` and `gsap.timeline()` in new code.

## Timelines with relative positioning

Tweens added to a timeline run one after another by default. The position parameter overlaps or groups them:

```js
const tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power2.out" }, delay: 0.3 });
tl.from("nav h1, nav h4, nav button", { y: -30, opacity: 0, stagger: 0.15, duration: 0.7 })
  .from(".hero h1", { x: -200, opacity: 0 })
  .from(".hero p", { y: -40, opacity: 0, duration: 0.4 })
  .from(".hero img", { opacity: 0 }, "<")          // "<" = start with the previous tween
  .from(".logos img", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.2"); // overlap 0.2 s
```

Useful positions: `"<"` start with previous, `"<0.2"` 0.2 s after previous *starts*, `"-=0.2"` 0.2 s before previous *ends*, `"label"` at a named label, `"+=1"` 1 s gap. Put the overall delay on the timeline, not on its first tween. `defaults` removes repeated `duration`/`ease`.

## Scroll-triggered timelines

```js
const tl2 = gsap.timeline({
  scrollTrigger: {
    trigger: ".services",
    start: "top 75%",      // when the trigger's top hits 75% down the viewport
    end: "bottom 25%",
    scrub: 1,              // progress follows scroll, with 1 s smoothing
    // markers: true,      // dev only — remove before shipping
  },
});
tl2.from(".services h2", { y: 30, opacity: 0 })
   .from(".item.left1",  { x: -300, opacity: 0 }, "row1")   // same label -> play together
   .from(".item.right1", { x:  300, opacity: 0 }, "row1")
   .from(".item.left2",  { x: -300, opacity: 0 }, "row2")
   .from(".item.right2", { x:  300, opacity: 0 }, "row2");
```

- `scrub: true` locks progress to the scrollbar; a number adds smoothing lag. Without `scrub`, use `toggleActions: "play none none reverse"` to play once on enter and reverse on leaving back.
- Don't set `scroller` unless the scroll container really isn't the page (the default is the viewport).
- `pin: true` holds the trigger in place while its timeline scrubs — the classic "scrollytelling" section.
- Call `ScrollTrigger.refresh()` after layout changes that GSAP can't see (images loading late, content injected, fonts swapping).
- For a simple reveal or progress bar, native CSS scroll-driven animations (see `css-driven-interactivity.md`) need no JS at all.

## Reduced motion and breakpoints: `gsap.matchMedia()`

`matchMedia` creates animations only while a media query matches and reverts them automatically when it stops matching:

```js
const mm = gsap.matchMedia();
mm.add(
  {
    full: "(prefers-reduced-motion: no-preference)",
    reduced: "(prefers-reduced-motion: reduce)",
    desktop: "(min-width: 800px)",
  },
  (ctx) => {
    const { full, reduced, desktop } = ctx.conditions;
    if (reduced) {
      gsap.from(".hero > *", { opacity: 0, duration: 0.3, stagger: 0.05 }); // fade only, no travel
      return;
    }
    gsap.from(".hero > *", { y: desktop ? 60 : 30, opacity: 0, stagger: 0.1 });
  },
);
// teardown: mm.revert();
```

## React Adaptation

- Use `useGSAP` from `@gsap/react`. Everything created inside it (tweens, timelines, ScrollTriggers, matchMedia) is reverted on unmount, and on dependency change when you ask for it:
  ```jsx
  import { useRef } from "react";
  import gsap from "gsap";
  import { useGSAP } from "@gsap/react";
  gsap.registerPlugin(useGSAP);

  function Hero({ variant }) {
    const container = useRef(null);

    const { contextSafe } = useGSAP(() => {
      gsap.timeline()
        .from(".title", { y: -30, opacity: 0, duration: 0.7 })
        .from(".subtitle", { opacity: 0, duration: 0.5 }, "-=0.3");
    }, { scope: container, dependencies: [variant], revertOnUpdate: true });

    // Animations created later (event handlers) must be wrapped, or they escape cleanup
    const onEnter = contextSafe(() => gsap.to(".title", { scale: 1.05, duration: 0.2, overwrite: "auto" }));

    return (
      <div ref={container}>
        <h1 className="title" onPointerEnter={onEnter}>…</h1>
        <p className="subtitle">…</p>
      </div>
    );
  }
  ```
- **`contextSafe` is the commonly missed part.** Code inside the `useGSAP` callback is tracked; a `gsap.to` inside an `onClick` that runs later is not, unless it's wrapped. Unwrapped handler tweens keep running on unmounted nodes.
- **Scope every selector** (`scope: container`). Without it, `".title"` matches every `.title` on the page — other instances of the component, or leftover DOM from a previous mount.
- Manual equivalent without the hook:
  ```jsx
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".title", { y: -30, opacity: 0 });
    }, container);
    return () => ctx.revert(); // kills tweens/ScrollTriggers and restores inline styles
  }, []);
  ```
  Use `useLayoutEffect` (or `useGSAP`, which does this) for `from` tweens so elements don't flash in their final state for one frame before the tween starts.
- **Canvas objects:** keep tweened objects in a `useRef`, tween them inside `useGSAP`, and draw them from `useCanvasLoop` (or `gsap.ticker` with cleanup).
- Register plugins once at module scope. When dependencies change, `revertOnUpdate: true` reverts and re-runs the whole setup; otherwise call `ScrollTrigger.refresh()` after layout-affecting state changes.
- Use `gsap.matchMedia()` inside `useGSAP` for reduced motion — it's reverted with the rest of the context.
