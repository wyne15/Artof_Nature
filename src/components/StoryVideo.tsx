/** Story image: photo of raw beeswax blocks (replaces the old pouring-wax video).
 *  Same name/props as before so page.tsx and story/page.tsx do not change
 *  (the old `src` video path is accepted but no longer used).
 *  Old video version: StoryVideo.tsx.bak-video */
export function StoryVideo({ label }: { src?: string; label: string }) {
  return (
    <div
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/beeswax-blocks.jpg"
        alt={label}
        loading="lazy"
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", display: "block" }}
      />
    </div>
  );
}
