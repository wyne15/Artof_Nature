import type { Metadata } from "next";
import Link from "next/link";
import { Hexdiv } from "@/components/ProductCard";
import { StoryVideo } from "@/components/StoryVideo";
import { getDict, isLocale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = ((await params).lang as "en" | "ro") === "ro" ? "ro" : "en";
  const t = getDict(l);
  return pageMetadata({ lang: l, path: "/story", title: t.seo.storyTitle, description: t.seo.storyDescription });
}

export default async function Story({ params }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const t = getDict(lang);
  const s = t.story;
  return (
    <>
      <section className="story2">
        <div className="sec two-col">
          <div>
            <h1>{s.h1}</h1>
            <p className="big">{s.lead}</p>
            <p>{s.p1}</p>
            <p>{s.p2}</p>
            <Link className="btn btn-olive" href={`/${lang}/shop`}>{t.hero.cta}</Link>
          </div>
          <div>
            <StoryVideo src="/videos/pour.mp4" label={t.home.storyImgAlt} />
          </div>
        </div>
      </section>
      <Hexdiv />
      <section className="sec">
        <div className="sec-head"><h2>{s.whyH}</h2></div>
        <div className="steps">{s.why.map((w) => <div className="step" key={w.h}><h3>{w.h}</h3><p>{w.p}</p></div>)}</div>
      </section>
    </>
  );
}
