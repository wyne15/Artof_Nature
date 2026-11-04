"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Welcome animation on the home page: a bee flies in a loose loop and lands on the logo.
 * Once per browser session, never with "reduce motion", always skippable, and a CSS failsafe removes it after 7 s.
 * The pre-paint decision (data-intro="off") is made by the nonce'd inline script rendered next to this component.
 */
export function Intro({ skip, brand }: { skip: string; brand: string }) {
  const [gone, setGone] = useState(false);
  const intro = useRef<HTMLDivElement>(null);
  const bee = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro === "off") {
      setGone(true);
      return;
    }
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignore */ }
    if (reduce) {
      setGone(true);
      return;
    }
    try { sessionStorage.setItem("aon-intro", "1"); } catch { /* ignore */ }

    const introEl = intro.current;
    const beeEl = bee.current;
    const fxEl = fx.current;
    if (!introEl || !beeEl || !fxEl) return;

    const S = 44;
    let raf = 0;
    let dead = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const T = (f: () => void, ms: number) => void timers.push(setTimeout(f, ms));
    const finish = () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); fxEl.innerHTML = ""; setGone(true); };
    const skipBtn = document.getElementById("introSkip");
    const onSkip = () => { dead = true; finish(); };
    skipBtn?.addEventListener("click", onSkip);

    const place = (x: number, y: number, r: number, f: number) => {
      beeEl.style.transform = `translate3d(${x - S / 2}px,${y - S / 2}px,0) rotate(${r}deg) scaleX(${f})`;
    };
    // Catmull-Rom spline through the flight points
    const cr = (p: number[][], t: number) => {
      const n = p.length - 1;
      const f = t * n;
      const i = Math.min(Math.floor(f), n - 1);
      const u = f - i;
      const a = p[Math.max(i - 1, 0)]!;
      const b = p[i]!;
      const c = p[i + 1]!;
      const d = p[Math.min(i + 2, n)]!;
      const u2 = u * u;
      const u3 = u2 * u;
      const g = (k: 0 | 1) => 0.5 * (2 * b[k]! + (-a[k]! + c[k]!) * u + (2 * a[k]! - 5 * b[k]! + 4 * c[k]! - d[k]!) * u2 + (-a[k]! + 3 * b[k]! - 3 * c[k]! + d[k]!) * u3);
      return { x: g(0), y: g(1) };
    };
    const dot = (x: number, y: number, alt: boolean) => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:${x - 3}px;top:${y - 3}px;width:6px;height:6px;border-radius:50%;background:${alt ? "#5C6B2E" : "#D4A843"};opacity:.9;transition:opacity 1s ease,transform 1s ease`;
      fxEl.appendChild(d);
      requestAnimationFrame(() => requestAnimationFrame(() => { d.style.opacity = "0"; d.style.transform = "scale(.3) translateY(8px)"; }));
      setTimeout(() => d.remove(), 1100);
    };

    T(() => {
      const W = innerWidth;
      const H = innerHeight;
      const lg = document.getElementById("hdrLogo")?.getBoundingClientRect();
      const tx = lg ? lg.right - 2 : W * 0.1;
      const ty = lg ? lg.top + 4 : 20;
      const pts = [[-60, H * 0.88], [W * 0.26, H * 0.74], [W * 0.78, H * 0.8], [W * 0.92, H * 0.55], [W * 0.62, H * 0.4], [W * 0.36, H * 0.5], [W * 0.5, H * 0.66], [W * 0.8, H * 0.42], [W * 0.55, H * 0.2], [tx, ty]] as number[][];
      place(pts[0]![0]!, pts[0]![1]!, 0, 1);
      beeEl.style.opacity = "1";
      const FL = 3800;
      let lx = pts[0]![0]!;
      let ly = pts[0]![1]!;
      let rot = 0, face = 1, t0 = 0, last = 0, n = 0, landed = false;
      const tick = (now: number) => {
        if (dead) return;
        if (!t0) t0 = now;
        const t = Math.min((now - t0) / FL, 1);
        const e = t < 0.8 ? t * 0.9 : 0.72 + (1 - Math.pow(1 - (t - 0.8) / 0.2, 2)) * 0.28;
        const pt = cr(pts, Math.min(e, 1));
        const k = (1 - t) * (1 - t);
        const x = pt.x + Math.cos(t * 30) * 4 * k;
        const y = pt.y + Math.sin(t * 38) * 6 * k;
        const dx = x - lx;
        const dy = y - ly;
        if (Math.abs(dx) > 0.4) face = dx > 0 ? 1 : -1;
        if (Math.abs(dx) + Math.abs(dy) > 0.2) {
          const a = (Math.atan2(dy, dx * face) * 180) / Math.PI;
          rot += (Math.max(-45, Math.min(45, a)) - rot) * 0.15;
        }
        lx = x; ly = y;
        const st = Math.min(Math.max((t - 0.9) / 0.1, 0), 1);
        place(x, y, rot * (1 - st), face);
        if (now - last > 38 && t < 0.97) { last = now; n++; dot(x - face * 10, y + 4, n % 3 === 0); }
        if (t < 1) raf = requestAnimationFrame(tick);
        else if (!landed) {
          landed = true;
          beeEl.classList.add("land");
          place(tx, ty, 0, 1);
          T(() => {
            beeEl.classList.remove("land");
            let t1 = 0;
            const out = (n2: number) => {
              if (dead) return;
              if (!t1) t1 = n2;
              const u = Math.min((n2 - t1) / 900, 1);
              const q = u * u;
              place(tx + (W + 60 - tx) * q, ty - (ty + 40) * q - Math.sin(u * Math.PI) * 20, -25 * u, 1);
              if (u > 0.6) beeEl.style.opacity = String(1 - (u - 0.6) / 0.4);
              if (u < 1) raf = requestAnimationFrame(out);
              else finish();
            };
            raf = requestAnimationFrame(out);
          }, 1100);
        }
      };
      raf = requestAnimationFrame(tick);
    }, 700);
    T(() => { introEl.style.opacity = "0"; introEl.style.pointerEvents = "none"; }, 1300);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      skipBtn?.removeEventListener("click", onSkip);
    };
  }, []);

  if (gone) return null;
  return (
    <>
      <div id="intro" role="presentation" ref={intro}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} aria-hidden="true"><rect width="100%" height="100%" fill="url(#hpl)" /></svg>
        <Image src="/logo.png" alt="" width={96} height={96} priority />
        <div className="intro-name">{brand}</div>
      </div>
      <button id="introSkip" type="button">{skip}</button>
      <div id="fx" ref={fx} aria-hidden="true" />
      <div id="bee" ref={bee} aria-hidden="true">
        <svg viewBox="0 0 64 64" width="44" height="44">
          <defs><clipPath id="bbc"><ellipse cx="30" cy="38" rx="20" ry="14" /></clipPath></defs>
          <g transform="rotate(-18 24 30)"><ellipse className="bw" cx="24" cy="18" rx="10" ry="14" fill="#fff" fillOpacity=".9" stroke="#9FB0BA" strokeWidth="1" /></g>
          <g transform="rotate(8 34 30)"><ellipse className="bw" cx="36" cy="18" rx="9" ry="13" fill="#fff" fillOpacity=".75" stroke="#9FB0BA" strokeWidth="1" /></g>
          <ellipse cx="30" cy="38" rx="20" ry="14" fill="#D4A843" />
          <g clipPath="url(#bbc)"><rect x="20" y="20" width="6" height="40" fill="#3B2F1E" /><rect x="32" y="20" width="6" height="40" fill="#3B2F1E" /></g>
          <path d="M11 34 L2 38 L11 42 Z" fill="#3B2F1E" />
          <circle cx="52" cy="37" r="8" fill="#3B2F1E" /><circle cx="55" cy="35" r="1.8" fill="#fff" />
          <path d="M54 30 Q58 23 62 23" stroke="#3B2F1E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M24 50 L22 57 M32 51 L31 58 M40 50 L41 57" stroke="#3B2F1E" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}
