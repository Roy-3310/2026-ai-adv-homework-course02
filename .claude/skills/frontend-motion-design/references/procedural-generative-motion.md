# Procedural & Generative Canvas Motion

Uses the canvas scaffold and `Vec2` from `canvas-physics-engine.md` (fixed-step `update()`, `draw(ctx, alpha)`, DPR sizing). This file covers the drawing algorithms layered on top: recursive growth, polar placement and trig-driven waveforms, plus seeded randomness so results can be reproduced.

## Seeded randomness

`Math.random()` gives a different result every load. When the user wants a reproducible piece ("same tree for this seed", a shareable URL, SSR/hydration-safe output), use a seeded generator and pass it everywhere instead of `Math.random`:

```js
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // [0, 1)
  };
}
const rand = mulberry32(42);
const range = (min, max) => min + (max - min) * rand();
```

## Recursive / self-spawning growth

A `Branch` advances each tick and occasionally spawns children, so the tree unfolds over time instead of appearing at once. The canvas is **not cleared** between frames: each tick stamps a circle, and the accumulated stamps form the branch.

```js
const growth = { maxBranches: 400, branchEvery: 15, minWidth: 0.5 };
let branches = [];

class Branch {
  constructor({ p, angle = -Math.PI / 2, speed = 4, w = 10, rand }) {
    Object.assign(this, { p, angle, speed, w, rand, time: 0 });
  }
  get done() { return this.w < growth.minWidth; }
  update() {
    this.time++;
    this.p.move(Math.cos(this.angle) * this.speed, Math.sin(this.angle) * this.speed);
    this.w *= 0.98 + this.rand() * 0.02;               // taper
    this.angle += (this.rand() - 0.5) * 0.05;          // slight wander

    const canBranch = this.time % growth.branchEvery === 0 && branches.length < growth.maxBranches;
    if (canBranch && this.rand() < 0.6 + this.w / 50) {
      const child = (spread, shrink) => new Branch({
        p: this.p.clone(), rand: this.rand,
        angle: this.angle + spread,
        speed: this.speed / (1.2 + this.rand()),
        w: this.w * shrink,
      });
      if (this.rand() < 0.5) {
        branches.push(child((this.rand() - 0.5) / 2, 0.5 + 0.5 * this.rand()));
      } else {                                         // fork: two children, this branch thins
        const s = (this.rand() * 10 - 5) / 3;
        branches.push(child(s, 0.6 + 0.4 * this.rand()), child(-s, 0.6 + 0.4 * this.rand()));
        this.w *= 0.5;
      }
    }
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.p.x, this.p.y, this.w, 0, Math.PI * 2);
    ctx.fill();
  }
}

// update(): grow, then drop finished branches (their pixels stay on the canvas)
function update() {
  for (const b of branches) b.update();
  branches = branches.filter((b) => !b.done);
}
// draw(): no clear; stamp every live branch
function draw(ctx) { ctx.fillStyle = "#fff"; for (const b of branches) b.draw(ctx); }
```

What bounds it — all three are needed:
1. **Termination:** a branch is removed once `w < minWidth`. Width only tapers geometrically and never reaches 0, so without removal every branch keeps updating forever and the simulation slows down over time.
2. **Global cap:** `maxBranches` stops runaway forking.
3. **Off-screen:** optionally remove branches whose `p` leaves the canvas.

Because the image lives in the canvas pixels, a resize clears it. Either restart growth on resize (with the same seed for the same result), or grow into an offscreen canvas and copy it in `draw()`. Interpolation (`alpha`) isn't needed here because nothing is redrawn — stamps simply accumulate.

## Polar-coordinate placement

Convert a pointer-relative vector into angle + distance, then place objects with `rotate` + `translate`:

```js
const DEG = Math.PI / 180;

function draw(ctx) {
  ctx.save();
  ctx.translate(ww / 2, wh / 2);                       // origin at centre
  const delta = pointer.p.sub(new Vec2(ww / 2, wh / 2));
  const mouseAngle = delta.angle, mouseDist = delta.length;

  for (const e of enemies) {                           // e = { angle, r }
    ctx.save();
    ctx.rotate(e.angle);
    ctx.translate(e.r, 0);
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = isLit(e, mouseAngle, mouseDist) ? "red" : "#888";
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
```

### Angle comparison (wrap-around safe)

`Math.abs(a - b)` is wrong near ±π: angles of 179° and −179° are 2° apart, not 358°. Normalise the difference first:

```js
function angleDiff(a, b) {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;                                            // in [-π, π]
}
// "vision cone": lit when within ±10° of the pointer's direction and closer than the pointer
const isLit = (e, mouseAngle, mouseDist) =>
  Math.abs(angleDiff(e.angle, mouseAngle)) <= 10 * DEG && e.r < mouseDist;
```

## Trig-driven waveforms

Feed `index * frequency + time` into `sin`/`cos` and draw a polyline. Step a few pixels at a time — one vertex per pixel is wasteful on wide screens.

```js
const wave = { freq: 0.02, amp: 80, speed: 0.05, step: 3 };

function drawWave(ctx, time, w, h) {
  ctx.beginPath();
  for (let x = 0; x <= w; x += wave.step) {
    const y = h / 2 + wave.amp * Math.cos(x * wave.freq + time * wave.speed);
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// mirrored ±sin pair -> "DNA helix"
function drawHelix(ctx, time, w, h) {
  for (const sign of [1, -1]) {
    ctx.beginPath();
    for (let y = 0; y <= h; y += wave.step) {
      const x = w / 2 + sign * wave.amp * Math.sin(y * wave.freq + time * wave.speed);
      y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
```

### Colour along the line

A path has one stroke style, so per-point colours mean one `beginPath/stroke` per segment — slow at hundreds of segments. For a smooth ribbon, use a gradient as the stroke style instead (one draw call):

```js
const g = ctx.createLinearGradient(0, 0, w, 0);
g.addColorStop(0, "hsl(200 90% 60%)");
g.addColorStop(1, "hsl(320 90% 60%)");
ctx.strokeStyle = g;
```

Fall back to per-segment strokes only when colour must depend on data at each point.

## Time as the phase driver

Every animated pattern above uses a `time` counter incremented once per **fixed tick** in `update()` — not per rAF frame, and not `Date.now()`. Because ticks run at a constant rate, animation speed is identical on 60 Hz and 144 Hz displays, and pausing (stop calling `update`) freezes the piece cleanly. If you want sub-tick smoothness, draw with `time + alpha`.

## Reduced motion

For ambient generative loops under `prefers-reduced-motion: reduce`: render a single still frame (or advance far more slowly) and stop the loop. Growth pieces can be drawn instantly to completion — run `update()` in a loop until no branches remain, then draw once.

## React Adaptation

- Use the same `assets/useCanvasLoop.js` hook as the physics engine.
- Keep algorithms as plain functions outside the component (`drawWave(ctx, time, w, h)`) — testable in isolation and not recreated on each render.
- For **static** procedural output (a generated layout that doesn't animate), generate a description with a seeded RNG and render SVG:
  ```jsx
  const tree = useMemo(() => generateTree(mulberry32(seed)), [seed]);
  ```
  `useMemo` only gives a stable result if the generator is seeded; with `Math.random()` the output also differs between server and client render, causing hydration mismatches.
- Recursive components (`<Branch depth={n}>` → `<Branch depth={n - 1}>`) are a valid SVG alternative. They need a base case (`depth <= 0` returns `null`) and a total-node budget, mirroring `minWidth` and `maxBranches` above.
