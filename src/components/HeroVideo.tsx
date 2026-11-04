"use client";

import { useEffect, useRef, useState } from "react";

/** Hero video: waits for the welcome intro, plays (hand lights the candle, zoom on the flame),
 *  rests on the lit flame for a moment, then replays. Falls back to a still photo.
 *  Add ?debug to the address to see its state on screen. */
export function HeroVideo({ alt }: { alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(false);
  const [ready, setReady] = useState(false);
  const [dim, setDim] = useState(false);
  const [dbg, setDbg] = useState<string | null>(null);

  useEffect(() => {
    let showDbg = false;
    try { showDbg = new URLSearchParams(location.search).has("debug"); } catch { /* ignore */ }
    const log = (m: string) => { if (showDbg) setDbg((p) => ((p ? p + " | " : "") + m).slice(-300)); };

    let off = false;
    try {
      off = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const c = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
      if (c?.saveData) off = true;
    } catch { /* ignore */ }
    if (off) { log("reduced-motion/saveData -> still"); setStill(true); return; }

    const v = vid.current;
    const el = box.current;
    if (!v || !el) { log("no element"); return; }
    log("mounted");

    let visible = true;
    let started = false;
    let dead = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const T = (f: () => void, ms: number) => void timers.push(setTimeout(f, ms));

    const markReady = () => { setReady(true); log("ready" + v.readyState); };
    if (v.readyState >= 3) markReady();
    v.addEventListener("canplay", markReady);
    v.addEventListener("loadeddata", markReady);
    v.addEventListener("error", () => log("video error " + (v.error ? v.error.code : "?")));
    T(markReady, 2500);

    const play = () => {
      v.play().then(() => log("playing")).catch((e: unknown) => {
        const n = e instanceof DOMException ? e.name : String(e);
        log("play failed " + n);
        console.warn("hero video:", e);
        if (n === "NotAllowedError") setStill(true);
      });
    };
    const restart = () => {
      if (dead) return;
      setDim(true);
      T(() => {
        v.currentTime = 0;
        setDim(false);
        if (visible) play();
      }, 450);
    };
    const onEnded = () => { log("ended"); T(restart, 3000); };
    v.addEventListener("ended", onEnded);

    let waited = 0;
    const wait = () => {
      if (dead) return;
      const busy = !!document.getElementById("intro") || !!document.getElementById("bee");
      if (busy && waited < 9000) { waited += 250; T(wait, 250); return; }
      started = true;
      log("start after " + waited + "ms, visible=" + visible);
      v.currentTime = 0;
      if (visible) play();
    };
    T(wait, 400);

    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(([e]) => {
        if (!e) return;
        visible = e.isIntersecting;
        if (!started) return;
        if (visible) { if (!v.ended) play(); } else v.pause();
      }, { threshold: 0.1 });
      io.observe(el);
    } catch { /* ignore */ }

    return () => {
      dead = true;
      timers.forEach(clearTimeout);
      v.removeEventListener("canplay", markReady);
      v.removeEventListener("loadeddata", markReady);
      v.removeEventListener("ended", onEnded);
      io?.disconnect();
    };
  }, []);

  return (
    <div className={`hero-video${dim ? " dim" : ""}`} ref={box} role="img" aria-label={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hv-poster" src="/videos/hero-candle-end.jpg" alt="" />
      {!still && (
        <video
          ref={vid}
          className={ready ? "on" : ""}
          muted playsInline preload="auto"
          aria-hidden="true"
        >
          <source src="/videos/hero-candle.webm" type="video/webm" />
          <source src="/videos/hero-candle.mp4" type="video/mp4" />
        </video>
      )}
      <span className="hv-glow" aria-hidden="true" />
      <span className="hv-shade" aria-hidden="true" />
      {dbg && <span style={{ position: "absolute", left: 6, right: 6, top: 6, zIndex: 9, font: "11px/1.3 monospace", background: "#000c", color: "#7CFC8A", padding: 6, borderRadius: 6 }}>{dbg}</span>}
    </div>
  );
}
