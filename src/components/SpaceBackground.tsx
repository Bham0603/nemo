"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  z: number; // 0..1 depth
  r: number;
  base: number;
  twinkle: number;
  phase: number;
  vx: number;
  vy: number;
};

/**
 * Ambient space backdrop. Every star drifts on its own — no pointer input,
 * no scroll coupling. Depth controls speed and size so the field reads as
 * parallax without anything driving it.
 */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let raf = 0;
    let t = 0;

    const build = () => {
      const count = Math.min(520, Math.max(180, Math.round((w * h) / 2600)));
      stars = Array.from({ length: count }, () => {
        const z = Math.random();
        // every star gets its own slow heading; deeper stars crawl
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.035 + z * 0.16 + Math.random() * 0.05;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: 0.35 + z * 1.1 + (Math.random() < 0.05 ? 0.85 : 0),
          base: 0.26 + z * 0.58 + Math.random() * 0.24,
          twinkle: 0.25 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.7,
        };
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const draw = () => {
      t += reduce ? 0 : 0.006;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        if (!reduce) {
          s.x += s.vx;
          s.y += s.vy;

          // wrap with a margin so stars never pop in at the edge
          const m = 8;
          if (s.x < -m) s.x = w + m;
          else if (s.x > w + m) s.x = -m;
          if (s.y < -m) s.y = h + m;
          else if (s.y > h + m) s.y = -m;
        }

        const tw = reduce
          ? 1
          : 0.6 + 0.4 * Math.sin(t * (1 + s.twinkle * 2) + s.phase);
        const alpha = Math.min(1, s.base * tw);

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        // bloom on the brightest few
        if (s.r > 1.55) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 7);
          g.addColorStop(0, `rgba(235, 240, 255, ${alpha * 0.45})`);
          g.addColorStop(1, "rgba(235, 240, 255, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="space-root" aria-hidden="true" suppressHydrationWarning>
      <div className="space-nebula" />
      <div className="space-nebula-2" />
      <div className="space-orbit space-orbit-a" />
      <div className="space-orbit space-orbit-b" />
      <canvas ref={canvasRef} className="space-stars" />
      <div className="space-vignette" />
      <div className="space-grain" />
    </div>
  );
}
