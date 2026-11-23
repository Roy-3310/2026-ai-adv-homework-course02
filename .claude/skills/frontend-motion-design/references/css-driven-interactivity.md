# CSS/SCSS-Driven Interactivity

Zero-JS interaction: multi-level hover/press state machines, staggered reveals, pausable keyframe loops, phase-shifted loops at scale, build-time style variation, and modern native features (scroll-driven animations, spring easing, entry animations).

Ground rules for everything here:
- Transition **named properties**, never `transition: all` (it animates things you didn't intend and forces the browser to watch every property).
- Animate `transform`/`opacity` or the individual `translate`/`scale`/`rotate` properties. Avoid animating `margin`, `top/left`, `width/height`, `border` — they trigger layout every frame.
- Hover doesn't exist on touch screens. Put hover-only effects in `@media (hover: hover)`, and make sure the same content is reachable by tap or keyboard focus.
- Every looping or large movement needs a `prefers-reduced-motion` fallback (see end of file).

## Nested hover/press state machine

One parent hover fans out into several child states via selector nesting — no state variables. Use **individual transform properties** so different states compose instead of overwriting each other (with a single `transform`, the inner hover's `translateX` would replace the outer hover's offset).

```scss
.scene {
  .title   { opacity: 0; transition: opacity 0.4s; }
  .person  { transition: translate 0.4s ease, scale 0.2s ease; }
  .body    { transition: background-color 0.3s; }
  .message { opacity: 0; transition: opacity 0.3s 0.5s; }   // 0.5s delay -> staged reveal
  .question { display: none; }

  @media (hover: hover) {
    &:hover {
      .title  { opacity: 1; }
      .person { translate: 0 50px; }                          // state 1: scene hovered

      .person:hover {                                         // state 2: person hovered too
        translate: 40px 50px;
        .message { opacity: 1; }
        .body    { background-color: $color-orange; }
      }
    }
  }

  &:active {                                                  // state 3: pressed (works on touch)
    .person   { scale: 0.9; }                                 // composes with translate
    .question { display: block; }
  }

  // keyboard parity: let focus drive the same states
  &:focus-within .title { opacity: 1; }
}
```

A transition uses the `transition` value of the state being entered. Here the delay is on the base rule and the hovered rule doesn't override it, so the message waits 0.5 s both when appearing and when disappearing. To make it vanish immediately on leave, give the base rule no delay and put `transition-delay: 0.5s` on the hovered `.message` rule instead.

## Staggered reveal with `transition-delay`

One state change can reveal several elements in sequence if each carries its own delay. Drive it from an index so the order is data, not hand-tuned numbers:

```scss
.menu-item {
  opacity: 0; translate: 0 8px;
  transition: opacity 0.3s, translate 0.3s;
  transition-delay: calc(var(--i, 0) * 60ms);
}
.menu.open .menu-item { opacity: 1; translate: 0 0; }
```

```html
<li class="menu-item" style="--i: 0">…</li>
<li class="menu-item" style="--i: 1">…</li>
```

## Keyframes with pausable playback

```scss
@keyframes slide {
  from { translate: 0 0; }
  to   { translate: 450px 0; background-color: red; }
}
.ball {
  animation: slide 1.5s ease-in-out infinite alternate;
  &:hover { animation-play-state: paused; }    // let the user "catch" it
}
```

Animating `background-color` on a few elements is fine; on many elements prefer layering a coloured pseudo-element and animating its `opacity`.

## Phase-shifted loops with negative `animation-delay`

N elements run the same keyframes but start at different points of the cycle. A negative delay means "start as if it had already been running for this long", so all are mid-motion from the first frame:

```scss
@use "sass:math";
$count: 90;
$period: 1.5s;

.dial .ball { animation: pulse $period ease-in-out infinite; }

@for $i from 1 through $count {
  .dial .slot:nth-child(#{$i}) {
    rotate: math.div($i * 360deg, $count);
    .ball { animation-delay: -$period * math.div($i, $count); } // spread exactly over one period
  }
}
```

Use `math.div` — the `/` division operator is deprecated in Dart Sass. Spreading delays over exactly one period (`i/count`) gives an even ripple; an arbitrary `i * 0.1s` wraps around unevenly.

Without Sass, the same thing at runtime with custom properties:

```css
.slot { rotate: calc(var(--i) * 360deg / var(--n)); }
.slot .ball { animation-delay: calc(var(--i) / var(--n) * -1.5s); }
```

## Build-time variation: `@for` + `random()` + `nth()` + `@mixin`

```scss
@use "sass:list";
@use "sass:math";
$palette: ($red, $yellow, $black, $purple, $blue, $green, $white, $orange);

@mixin present($size: 100px, $tilt: 5deg, $body: #ff5151, $ribbon: white) {
  width: $size; height: $size;
  background-color: $body;
  rotate: $tilt;
  .vribbon, .hribbon { background-color: $ribbon; }
}

@for $i from 1 through 50 {
  .present-#{$i} {
    @include present(
      (math.random(50) + 50) * 1px,
      (math.random(21) - 11) * 1deg,
      list.nth($palette, math.random(list.length($palette))),
      list.nth($palette, math.random(list.length($palette)))
    );
  }
}
```

This runs at **compile time**: the 50 classes and their "random" values are fixed in the shipped CSS until the next build. Multiply by a unit (`* 1px`) rather than interpolating `#{$n}px`, which produces a string, not a number. Watch output size — 50 rules is fine, 5 000 is not; for large or dynamic counts generate per-element custom properties at runtime instead.

## Modern native features

All are progressive enhancements: put them behind `@supports` (or accept that older browsers get the static result) and check current support on caniuse before relying on them.

### Native nesting

Plain CSS now supports nesting (`.scene { &:hover { … } }`), so the state-machine pattern above works without Sass. Sass is still useful for loops, `math`, and mixins.

### Scroll-driven animations (no JS)

Tie a keyframe animation's progress to scroll position or to an element's visibility:

```css
@keyframes reveal { from { opacity: 0; translate: 0 40px; } to { opacity: 1; translate: 0 0; } }

@supports (animation-timeline: view()) {
  .card {
    animation: reveal linear both;
    animation-timeline: view();               /* progress = element's passage through the viewport */
    animation-range: entry 0% cover 30%;      /* finish once it's 30% into view */
  }
}

/* reading-progress bar driven by page scroll */
@keyframes grow { from { scale: 0 1; } to { scale: 1 1; } }
.progress { transform-origin: left; animation: grow linear both; animation-timeline: scroll(root); }
```

Use this for simple reveal/parallax/progress effects; reach for GSAP ScrollTrigger when you need pinning, complex sequencing, callbacks, or broad browser support.

### Spring / bounce easing with `linear()`

`linear()` takes a list of points, so it can approximate springs and bounces that `cubic-bezier` can't:

```css
:root {
  --ease-spring: linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%,
    1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%,
    1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%,
    1.003 76.9%, 1);
}
.chip { transition: scale 0.6s var(--ease-spring); }
```

Generate custom curves with a `linear()` easing generator rather than hand-writing points.

### Entry/exit animations: `@starting-style`

Transitions normally can't animate an element appearing (e.g. from `display: none`). `@starting-style` gives it a "from" state:

```css
.toast {
  opacity: 1; translate: 0 0;
  transition: opacity 0.3s, translate 0.3s, display 0.3s allow-discrete;
  @starting-style { opacity: 0; translate: 0 16px; }
}
.toast[hidden] { display: none; opacity: 0; }
```

### View Transitions

For animating between two DOM states (list reorder, card → detail), wrap the DOM update in `document.startViewTransition(() => update())` and style with `::view-transition-old/new(name)` plus `view-transition-name` on matching elements. Feature-detect `document.startViewTransition` and just run `update()` when it's missing.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This global reset is a safe baseline. Better still, design the reduced version per component: keep opacity fades (they don't cause motion sickness), drop translation, parallax, zoom and infinite loops. Scroll-driven reveals should show content in its final state.

## React Adaptation

- Hover/active state machines and keyframes need **no adaptation** — they work the same in CSS Modules, styled-components, or a plain stylesheet.
- Replace Sass `@for` with render-time generation plus custom properties, which also makes the count dynamic:
  ```jsx
  {Array.from({ length: count }, (_, i) => (
    <div key={i} className={styles.slot} style={{ "--i": i, "--n": count }}>
      <div className={styles.ball} />
    </div>
  ))}
  ```
- When an interaction must be testable, keyboard/touch accessible, or synchronised with JS, drive it with a `data-state` attribute instead of `:hover`/`:active`:
  ```jsx
  <button
    data-state={active ? "active" : "idle"}
    onPointerDown={() => setActive(true)}
    onPointerUp={() => setActive(false)}
    onKeyDown={(e) => e.key === " " && setActive(true)}
  />
  ```
  ```scss
  &[data-state="active"] { /* rules that lived under &:active */ }
  ```
  Plain `:hover`/`:active` is fine for decorative, mouse-only flourishes.
- Framework equivalents:
  - **CSS Modules:** nesting works as-is; class names are scoped automatically.
  - **styled-components:** `` &:hover ${Child} { … } `` targets a child styled component.
  - **Tailwind:** nested hover chains become `group`/`group-hover:` (parent-driven) and `peer`/`peer-hover:` (sibling-driven); name groups (`group/card`, `group-hover/card:`) when nesting more than one level. Use `motion-safe:` / `motion-reduce:` variants for reduced motion.
