# Canvas Physics & Particle Engine

The shared scaffold for canvas demos: a `Vec2` class, a fixed-timestep loop with interpolated drawing, high-DPI sizing and pointer input. `procedural-generative-motion.md` builds on the same shell. A complete runnable version is in `assets/canvas-starter.html` (vanilla) and `assets/useCanvasLoop.js` (React) — start from those.

**Units:** all velocities and accelerations below are *per simulation tick*. Because the tick rate is fixed, these numbers mean the same thing on every display.

## Engine scaffold

```js
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
let ww = 0, wh = 0;                     // CSS-pixel size, used by all game logic

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap: 3x DPR costs 9x pixels
  ww = canvas.clientWidth;
  wh = canvas.clientHeight;
  canvas.width = Math.round(ww * dpr);
  canvas.height = Math.round(wh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels; setTransform (not scale) so repeated resizes don't compound
}
new ResizeObserver(resize).observe(canvas); // fires once immediately, and on any layout resize

const TICK_HZ = 60;
const STEP = 1000 / TICK_HZ;
let last = performance.now(), acc = 0, raf = 0;

function frame(now) {
  acc += Math.min(now - last, 250);     // clamp: after a stall/hidden tab, don't run hundreds of catch-up ticks
  last = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  draw(acc / STEP);                     // alpha in [0,1): how far we are between the last two ticks
  raf = requestAnimationFrame(frame);
}
raf = requestAnimationFrame(frame);

function update() { /* advance simulation by exactly one tick */ }
function draw(alpha) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ww, wh);
  // draw each object at lerp(prev, current, alpha)
}
```

Why this shape:
- **One rAF loop, fixed `update()`.** Simulation speed is independent of refresh rate (60/120/144 Hz) and repeatable for the same inputs. `setInterval` is not reliable for this: it drifts, gets throttled to ≥1 s in background tabs, and fires unaligned with paints.
- **Interpolation (`alpha`).** Each object keeps its previous position; drawing at `prev + (p - prev) * alpha` removes the stutter you get when the tick rate is lower than or out of phase with the display rate. You may lower `TICK_HZ` (e.g. 30) to save CPU for heavy simulations — interpolation keeps it smooth.
- **Clamp.** rAF pauses in hidden tabs; when the tab returns, the 250 ms clamp prevents a "spiral of death" of catch-up ticks.
- **DPR.** Without it the canvas is blurry on Retina/high-DPI screens.

## Vec2

Prototype methods (shared, not per-instance closures). Immutable versions for readability; `*Self` versions mutate in place for hot loops so thousands of particles don't allocate thousands of objects per tick.

```js
class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  clone() { return new Vec2(this.x, this.y); }

  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s) { return new Vec2(this.x * s, this.y * s); }

  addSelf(v) { this.x += v.x; this.y += v.y; return this; }
  subSelf(v) { this.x -= v.x; this.y -= v.y; return this; }
  scaleSelf(s) { this.x *= s; this.y *= s; return this; }
  move(x, y) { this.x += x; this.y += y; return this; }

  dot(v) { return this.x * v.x + this.y * v.y; }
  get length() { return Math.hypot(this.x, this.y); }
  get angle() { return Math.atan2(this.y, this.x); }
  get unit() {                                   // zero-length guard: avoids NaN poisoning velocities
    const l = this.length;
    return l > 1e-9 ? this.mul(1 / l) : new Vec2();
  }
  static lerp(a, b, t, out = new Vec2()) {
    return out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}
```

## Particle: gravity, damping, bounce, death

```js
const params = { gravity: 0.3, damping: 0.99, restitution: 0.8, fade: 0.97 };

class Particle {
  constructor({ p = new Vec2(), v = new Vec2(), r = 10, color = "#fff" } = {}) {
    this.p = p; this.prev = p.clone(); this.v = v; this.r = r; this.color = color;
  }
  update() {
    this.prev.copy(this.p);
    this.v.y += params.gravity;              // semi-implicit Euler: update velocity, then position
    this.v.scaleSelf(params.damping);
    this.p.addSelf(this.v);
    this.r *= params.fade;                   // shrink -> considered dead below 0.1

    // bounce: clamp back inside AND reflect, so particles never get stuck outside the wall
    if (this.p.x - this.r < 0)  { this.p.x = this.r;      this.v.x =  Math.abs(this.v.x) * params.restitution; }
    if (this.p.x + this.r > ww) { this.p.x = ww - this.r; this.v.x = -Math.abs(this.v.x) * params.restitution; }
    if (this.p.y - this.r < 0)  { this.p.y = this.r;      this.v.y =  Math.abs(this.v.y) * params.restitution; }
    if (this.p.y + this.r > wh) { this.p.y = wh - this.r; this.v.y = -Math.abs(this.v.y) * params.restitution; }
  }
  get dead() { return this.r < 0.1; }
  draw(ctx, alpha) {
    const x = this.prev.x + (this.p.x - this.prev.x) * alpha;
    const y = this.prev.y + (this.p.y - this.prev.y) * alpha;
    ctx.beginPath();
    ctx.arc(x, y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}
```

Pass `ctx` into `draw()` rather than reading a global — the same class then works in vanilla and React.

### Removing dead particles

Never `splice` while iterating the same array (it skips the element after each removal). Use `filter` for clarity:

```js
particles = particles.filter((p) => !p.dead);
```

For thousands of particles per tick, compact in place (no new array, no GC churn):

```js
let n = 0;
for (let i = 0; i < particles.length; i++) {
  if (!particles[i].dead) particles[n++] = particles[i];
}
particles.length = n;
```

## Force fields: attraction / repulsion

```js
class ForceField {
  constructor({ p = new Vec2(), strength = -100, maxForce = 2 } = {}) {
    Object.assign(this, { p, strength, maxForce });
  }
  affect(particle) {
    const dx = particle.p.x - this.p.x, dy = particle.p.y - this.p.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return;                                // coincident: direction undefined, skip
    let f = this.strength / (1 + d);                     // +1 softens the singularity at d = 0
    f = Math.max(-this.maxForce, Math.min(this.maxForce, f)); // cap so close passes don't fling particles off-screen
    particle.v.x += (dx / d) * f;
    particle.v.y += (dy / d) * f;
  }
}
// in update(): for (const f of fields) for (const p of particles) f.affect(p);
```

Positive `strength` repels, negative attracts. `1/(1+d)` is a gentle, game-feel falloff; use `strength / (d*d + soft*soft)` for a more physical inverse-square feel.

## Pointer-driven spawning (with a cap)

```js
const MAX_PARTICLES = 1500;
const spawn = { perTick: 4, speed: 5 };

function update() {
  if (pointer.down) {
    const room = MAX_PARTICLES - particles.length;
    for (let i = 0; i < Math.min(spawn.perTick, room); i++) {
      particles.push(new Particle({
        p: pointer.p.clone(),
        v: new Vec2((Math.random() - 0.5) * spawn.speed, (Math.random() - 0.5) * spawn.speed),
        r: 5 + Math.random() * 25,
        color: `hsl(${(Math.random() * 60 + 10) | 0} 90% 60%)`,
      }));
    }
  }
  for (const p of particles) p.update();
  particles = particles.filter((p) => !p.dead);
}
```

## Pointer input (mouse + touch + pen)

Use Pointer Events, not mouse events, so touch works. Coordinates must be relative to the canvas, not the window:

```js
const pointer = { p: new Vec2(), down: false };
function toCanvas(evt) {
  const r = canvas.getBoundingClientRect();
  return new Vec2(evt.clientX - r.left, evt.clientY - r.top);
}
canvas.style.touchAction = "none"; // stop the browser from scrolling/zooming while dragging on the canvas
canvas.addEventListener("pointermove", (e) => pointer.p.copy(toCanvas(e)));
canvas.addEventListener("pointerdown", (e) => { pointer.down = true; pointer.p.copy(toCanvas(e)); });
window.addEventListener("pointerup", () => { pointer.down = false; });
```

## Drag-and-throw

Hit-test on press, follow the pointer while held, and on release set velocity from recent movement **per unit time** (not per event — pointer events fire at varying rates, so per-event deltas give inconsistent throws).

```js
let drag = null; // { body, offset, samples: [{x, y, t}] }

canvas.addEventListener("pointerdown", (e) => {
  const m = toCanvas(e);
  const body = bodies.find((b) => m.sub(b.p).length < b.r);
  if (!body) return;
  canvas.setPointerCapture(e.pointerId);        // keep receiving moves even if the pointer leaves the canvas
  drag = { body, offset: body.p.sub(m), samples: [{ x: m.x, y: m.y, t: e.timeStamp }] };
  body.dragging = true;
});

canvas.addEventListener("pointermove", (e) => {
  const m = toCanvas(e);
  canvas.style.cursor = drag || bodies.some((b) => m.sub(b.p).length < b.r) ? "grab" : "default";
  if (!drag) return;
  drag.body.p.copy(m.add(drag.offset));
  drag.body.prev.copy(drag.body.p);             // no interpolation smear while dragging
  drag.samples.push({ x: m.x, y: m.y, t: e.timeStamp });
  while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > 80) drag.samples.shift(); // keep ~last 80 ms
});

function endDrag(e) {
  if (!drag) return;
  const s = drag.samples, a = s[0], b = s[s.length - 1];
  const dt = b.t - a.t;
  if (dt > 0) {
    // px/ms -> px/tick, capped so a flick can't produce absurd speeds
    const k = STEP / dt, maxV = 40;
    drag.body.v.set(
      Math.max(-maxV, Math.min(maxV, (b.x - a.x) * k)),
      Math.max(-maxV, Math.min(maxV, (b.y - a.y) * k)),
    );
  } else drag.body.v.set(0, 0);
  drag.body.dragging = false;
  drag = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
```

In `update()`, skip integration for bodies with `dragging === true` so the drag fully overrides gravity until release.

## Circle–circle collisions

Enough for balls, bubbles and "toy" physics. Resolve overlap first, then exchange momentum along the contact normal.

```js
function collide(a, b, restitution = 0.9) {
  const dx = b.p.x - a.p.x, dy = b.p.y - a.p.y;
  const dist = Math.hypot(dx, dy), minDist = a.r + b.r;
  if (dist >= minDist || dist < 1e-9) return;

  const nx = dx / dist, ny = dy / dist;
  const ma = a.mass ?? a.r * a.r, mb = b.mass ?? b.r * b.r; // area as mass by default
  const invA = a.dragging ? 0 : 1 / ma, invB = b.dragging ? 0 : 1 / mb; // dragged body = immovable
  const invSum = invA + invB;
  if (invSum === 0) return;

  // 1) positional correction: push apart in proportion to inverse mass
  const overlap = minDist - dist;
  a.p.x -= nx * overlap * (invA / invSum); a.p.y -= ny * overlap * (invA / invSum);
  b.p.x += nx * overlap * (invB / invSum); b.p.y += ny * overlap * (invB / invSum);

  // 2) impulse, only if they are moving toward each other
  const relV = (b.v.x - a.v.x) * nx + (b.v.y - a.v.y) * ny;
  if (relV > 0) return;
  const j = (-(1 + restitution) * relV) / invSum;
  a.v.x -= j * invA * nx; a.v.y -= j * invA * ny;
  b.v.x += j * invB * nx; b.v.y += j * invB * ny;
}

// in update(), after integrating:
for (let i = 0; i < bodies.length; i++)
  for (let k = i + 1; k < bodies.length; k++) collide(bodies[i], bodies[k]);
```

The pairwise loop is O(n²): fine up to a few hundred bodies. Beyond that, bucket bodies into a uniform grid (cell size ≈ largest diameter) and only test neighbouring cells. If you need stacking that stays still, friction, rotation, polygons or joints, stop hand-rolling and use Matter.js or Rapier.

## Motion trails

Instead of clearing, paint a translucent layer over the last frame:

```js
ctx.fillStyle = "rgba(0,0,0,0.15)"; // lower alpha = longer trail
ctx.fillRect(0, 0, ww, wh);
```

Caveats: with low alpha, old frames never fully reach black (8-bit rounding leaves faint "ghosts"); clear fully every few seconds or use a slightly higher alpha. For a transparent canvas over page content, fade with `ctx.globalCompositeOperation = "destination-out"` and a translucent fill, then reset to `"source-over"`. Disable trails when reduced motion is on.

## Live tuning

`lil-gui` is a drop-in, maintained replacement for `dat.GUI`:

```js
import GUI from "lil-gui";
const gui = new GUI();
gui.add(params, "gravity", -1, 1, 0.01);
gui.add(params, "fade", 0.8, 1, 0.001);
gui.add({ clearFields: () => (fields.length = 0) }, "clearFields");
```

`.listen()` keeps a control in sync when code changes the value. Load it in development only.

## React Adaptation

- Use `assets/useCanvasLoop.js`. It owns the canvas ref, DPR sizing via `ResizeObserver`, the fixed-step loop, pausing when off-screen, and cleanup:
  ```jsx
  function ParticleField() {
    const world = useRef({ particles: [], fields: [] });
    const canvasRef = useCanvasLoop({
      update: () => { /* mutate world.current in place */ },
      draw: (ctx, alpha, { width, height }) => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
        for (const p of world.current.particles) p.draw(ctx, alpha);
      },
    });
    return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", touchAction: "none" }} />;
  }
  ```
- World state in `useRef`, never `useState` — state updates 60×/s would re-render the tree for nothing.
- Cleanup is mandatory: StrictMode mounts → unmounts → remounts effects in development; a missing cleanup shows up as two loops and doubled particle counts.
- Attach pointer listeners in an effect on `canvasRef.current` (or as React `onPointer*` props that write into the world ref — never into state).
- A HUD (particle count, fps) should read the ref on its own slow interval (e.g. 4×/s) and `setState` there, not from the physics tick.
- `leva` (`useControls`) replaces lil-gui in React.
