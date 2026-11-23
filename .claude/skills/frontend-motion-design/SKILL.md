---
name: frontend-motion-design
description: Concrete motion and interactivity for frontend work — canvas physics/particles, drag-and-throw, force fields, generative canvas art (recursive growth, trig/polar patterns), CSS hover/scroll choreography, and GSAP timelines/scroll effects, in vanilla JS or React. Use when an interface should feel "alive", "dynamic" or "interactive", or the user mentions animation, physics, particles or motion.
---

This skill turns "add some animation" into concrete, working motion code. It pairs well with `frontend-design` (visual direction first, then motion), but works on its own.

## When to reach for this

- Particles, gravity, bounce, collisions, drag-and-throw, attract/repel fields
- Generative visuals: recursive growth, trig/polar patterns, waveforms
- Orchestrated page-load sequences, scroll-triggered or scroll-scrubbed reveals
- Hover/press behaviour beyond one `transition` — multi-stage state machines, staggered reveals
- The user says it should feel "alive", "dynamic", "playful", "have more personality"

## When NOT to

- A single fade/slide on one element → a plain CSS `transition`; no engine, no library.
- Rigid-body stacking, joints, many-body collisions → use **Matter.js** / **Rapier** instead of hand-rolling (see `canvas-physics-engine.md` for where hand-rolled stops being worth it).
- 3D → **Three.js** / React Three Fiber. Sketch-style creative coding where the user already uses it → **p5.js**.
- Content-heavy pages (docs, forms, checkout): motion should be subtle and short; skip ambient loops.

## Choosing a technique

| Desired effect | Read | Starter |
|---|---|---|
| Particles, gravity, bounce, collisions, drag-and-throw, force fields | `references/canvas-physics-engine.md` | `assets/canvas-starter.html`, `assets/useCanvasLoop.js` |
| Recursive growth, trig/polar patterns, waveforms, seeded randomness | `references/procedural-generative-motion.md` | same starters |
| Hover/press choreography, stagger, keyframe loops, scroll-driven CSS, style variation at scale | `references/css-driven-interactivity.md` | — |
| Timelines, elastic easing, scroll-triggered/scrubbed sequences, tweening canvas values | `references/gsap-motion.md` | — |
| Reduced motion, pause controls, frame budget, particle caps (read for **every** motion task) | `references/accessibility-performance.md` | — |

Read the relevant reference(s) **before** writing code. Start canvas work from a file in `assets/` instead of rewriting the scaffold.

## Core principles

1. **Fixed-timestep simulation, interpolated rendering.** One `requestAnimationFrame` loop with an accumulator runs `update()` at a fixed rate and `draw(alpha)` every frame. Speed is then independent of the monitor's refresh rate, and motion stays smooth on 120 Hz screens. Don't use `setInterval` for physics: it drifts, is throttled in background tabs, and without interpolation 30 Hz updates look like 30 fps.
2. **Keep hot-path state out of framework state.** Particles, tween targets and per-frame positions live in refs/plain objects and are drawn imperatively. React state only for things the UI must show, throttled.
3. **Every setup has a teardown.** Listeners, rAF, observers, tweens, ScrollTriggers. In React this is mandatory (StrictMode runs effects twice in development).
4. **Animate cheap properties.** `transform` / `opacity` (and individual `translate`/`scale`/`rotate`) on the DOM; never `transition: all`; avoid animating `margin`, `top`, `width`, `border`.
5. **Respect the user.** Honour `prefers-reduced-motion`, give auto-playing loops longer than 5 s a pause control, and cap particle counts. Details in `accessibility-performance.md`.
6. **One orchestrated sequence beats scattered micro-interactions.** Use a shared mechanism — a GSAP timeline, `transition-delay` stagger, negative `animation-delay` phase offsets — rather than ad-hoc delays.

## Workflow

1. Pick the technique from the table; read the reference and `accessibility-performance.md`.
2. Start from the starter in `assets/` (canvas) or the reference snippet.
3. Tune with a live panel (`lil-gui` vanilla, `leva` React) during development.
4. Verify: open the page, check the console is clean, take a screenshot, and watch a few seconds of motion (or a Performance recording) for dropped frames. Toggle reduced motion and confirm the fallback.
5. Run the checklist below.

## Before you ship

- [ ] Debug panels removed (`lil-gui`/`dat.GUI`/`leva` in dev only); GSAP `markers: true` removed
- [ ] Reduced-motion path exists and was tested
- [ ] Loops > 5 s have pause/stop; canvas pauses when off-screen
- [ ] Every listener / rAF / observer / tween / ScrollTrigger has cleanup (remount in StrictMode shows no doubled motion)
- [ ] Particle/object counts capped; no unbounded arrays
- [ ] Canvas is crisp on high-DPI screens; pointer events work with touch
- [ ] Only compositor-friendly properties animated on the DOM

## React

Each reference has a "React Adaptation" section. The shared rule: imperative work goes in `useRef` + one effect with real cleanup. For canvas, use `assets/useCanvasLoop.js` (fixed-step loop, DPR, `ResizeObserver`, visibility pause, reduced-motion flag) instead of re-writing the effect. For GSAP, use `useGSAP` with `scope` and `contextSafe`.

## Tooling notes

- **lil-gui** replaces the unmaintained `dat.GUI` with the same API; **leva** in React.
- **GSAP vs Motion (framer-motion):** GSAP for long multi-element timelines, scroll scrubbing and tweening non-DOM values (canvas objects). Motion for React component enter/exit/layout animations. Both are free to use.
- Plain CSS covers a lot with zero JS, including scroll-driven animations in modern browsers — see `css-driven-interactivity.md`.
