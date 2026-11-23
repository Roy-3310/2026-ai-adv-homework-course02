import { useEffect, useRef } from "react";

/**
 * Fixed-timestep canvas loop for React.
 *
 *   const canvasRef = useCanvasLoop({
 *     update: (info) => { ...advance world one tick... },
 *     draw: (ctx, alpha, info) => { ...render, interpolating by alpha... },
 *   });
 *   return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", touchAction: "none" }} />;
 *
 * info = { width, height, dpr, reducedMotion, tick }
 *
 * Handles: DPR-correct sizing via ResizeObserver, fixed-step update + interpolated draw,
 * catch-up clamp, pausing while off-screen, reduced-motion flag, `paused` option,
 * and full cleanup (safe under React StrictMode double-mount).
 *
 * update/draw are read from a ref, so passing new inline functions each render does
 * NOT restart the loop. Keep world state in useRef, never useState.
 */
export function useCanvasLoop({ update, draw, tickHz = 60, paused = false, maxDpr = 2 } = {}) {
  const canvasRef = useRef(null);
  const handlers = useRef({ update, draw, paused });
  handlers.current = { update, draw, paused };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const STEP = 1000 / tickHz;
    const info = { width: 0, height: 0, dpr: 1, reducedMotion: false, tick: 0 };

    // sizing
    const resize = () => {
      info.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      info.width = canvas.clientWidth;
      info.height = canvas.clientHeight;
      canvas.width = Math.round(info.width * info.dpr);
      canvas.height = Math.round(info.height * info.dpr);
      ctx.setTransform(info.dpr, 0, 0, info.dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // reduced motion
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    info.reducedMotion = rm.matches;
    const onRm = (e) => { info.reducedMotion = e.matches; };
    rm.addEventListener("change", onRm);

    // loop
    let raf = 0, last = 0, acc = 0, running = false;
    const frame = (now) => {
      acc += Math.min(now - last, 250);
      last = now;
      const h = handlers.current;
      if (!h.paused) {
        while (acc >= STEP) { h.update?.(info); info.tick++; acc -= STEP; }
      } else acc = 0;
      h.draw?.(ctx, h.paused ? 1 : acc / STEP, info);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running) return;
      running = true; last = performance.now(); acc = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    // only run while on screen (rAF already pauses in hidden tabs)
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      rm.removeEventListener("change", onRm);
    };
  }, [tickHz, maxDpr]);

  return canvasRef;
}
