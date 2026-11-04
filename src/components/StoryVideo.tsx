"use client";

import { useEffect, useRef } from "react";

export function StoryVideo({ src, label }: { src: string; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    const el = box.current;
    if (!v || !el) return;
    v.muted = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      v.pause();
      return;
    }
    const play = () => {
      v.play().catch(() => {
        /* autoplay blocked: the first frame stays visible */
      });
    };
    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(
        ([e]) => {
          if (!e) return;
          if (e.isIntersecting) play();
          else v.pause();
        },
        { threshold: 0.25 },
      );
      io.observe(el);
    } catch {
      play();
    }
    return () => io?.disconnect();
  }, []);

  return (
    <div
      ref={box}
      style={{
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        aspectRatio: "2 / 3",
        borderRadius: 22,
        overflow: "hidden",
        border: "1px solid rgba(212, 168, 67, 0.55)",
        boxShadow: "0 18px 40px rgba(92, 107, 46, 0.18), 0 4px 10px rgba(60, 40, 10, 0.12)",
        background: "#F7F3EB",
      }}
    >
      <video
        ref={ref}
        src={`${src}#t=0.1`}
        aria-label={label}
        muted
        loop
        playsInline
        preload="metadata"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}
