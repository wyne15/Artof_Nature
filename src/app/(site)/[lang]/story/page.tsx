import type { Metadata } from "next";
import Link from "next/link";
import { Hexdiv } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { StoryVideo } from "@/components/StoryVideo";
import { getDict, isLocale } from "@/i18n";
import { STORY_TEXT } from "@/i18n/story-text";
import { pageMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = ((await params).lang as "en" | "ro") === "ro" ? "ro" : "en";
  const t = getDict(l);
  return pageMetadata({ lang: l, path: "/story", title: t.seo.storyTitle, description: STORY_TEXT[l].description });
}

export default async function Story({ params }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const t = getDict(lang);
  const s = t.story;
  const story = STORY_TEXT[lang];
  const b = story.body;
  const ro = lang === "ro";
  const ownerAlt = ro ? "Fondatoarea The Art of Nature ținând lumânări din ceară de albine" : "The founder of The Art of Nature holding beeswax candles";
  const candlesAlt = ro ? "Lumânări din ceară de albine într-un coș de răchită" : "Beeswax candles in a wicker basket";
  return (
    <>
      <section className="sec st-intro">
        <h1>{s.h1}</h1>
        <p className="big">{b[0]}</p>
      </section>

      <section className="sec st-letter">
        <Reveal className="st-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/owner.jpg" alt={ownerAlt} width={1066} height={1600} loading="eager" decoding="async" />
        </Reveal>
        <Reveal className="st-text" delay={120}>
          <p>{b[1]}</p>
          <p>{b[2]}</p>
        </Reveal>
      </section>

      <section className="st-band">
        <div className="sec st-band-in">
          <Reveal>
            <blockquote>{b[3]}</blockquote>
          </Reveal>
          <Reveal delay={120}>
            <StoryVideo src="/videos/pour.mp4" label={t.home.storyImgAlt} />
          </Reveal>
        </div>
      </section>

      <section className="sec st-close">
        <Reveal className="st-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/candles.jpg" alt={candlesAlt} width={1066} height={1600} loading="lazy" decoding="async" />
        </Reveal>
        <Reveal className="st-close-text" delay={100}>
          <p>{b[4]}</p>
          <p>{b[5]}</p>
          <p>{b[6]}</p>
          <p className="st-sign">
            {story.sign[0]}
            <br />
            {story.sign[1]}
          </p>
          <div style={{ marginTop: 28 }}>
            <Link className="btn btn-olive" href={`/${lang}/shop`}>{t.hero.cta}</Link>
          </div>
        </Reveal>
      </section>

      <Hexdiv />
      <section className="sec">
        <div className="sec-head"><h2>{s.whyH}</h2></div>
        <div className="steps">{s.why.map((w) => <div className="step" key={w.h}><h3>{w.h}</h3><p>{w.p}</p></div>)}</div>
      </section>

      <section className="sec">
        <div className="sec-head"><h2>{s.natureH}</h2></div>
        <div className="steps">{s.nature.map((w) => <div className="step" key={w.h}><h3>{w.h}</h3><p>{w.p}</p></div>)}</div>
      </section>
    </>
  );
}
