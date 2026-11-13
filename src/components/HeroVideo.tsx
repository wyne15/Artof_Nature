/** Hero: static photo of hanging beeswax candles (replaces the old lighting-the-candle video).
 *  Kept the same name/props so page.tsx does not need to change.
 *  Old video version: HeroVideo.tsx.bak-video */
export function HeroVideo({ alt }: { alt: string }) {
  return (
    <div className="hero-video" role="img" aria-label={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="hv-poster"
        src="/images/hero-candles.jpg"
        alt=""
        fetchPriority="high"
        decoding="async"
      />
      <span className="hv-shade" aria-hidden="true" />
    </div>
  );
}
