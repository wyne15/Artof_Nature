import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Hexdiv, ProductCard } from "@/components/ProductCard";
import { HeroVideo } from "@/components/HeroVideo";
import { Intro } from "@/components/Intro";
import { NewsletterForm } from "@/components/NewsletterForm";
import { StoryVideo } from "@/components/StoryVideo";
import { BUSINESS } from "@/config/site";
import { getDict, isLocale } from "@/i18n";
import { hexPts } from "@/lib/art";
import { script } from "@/lib/fonts";
import { pageMetadata } from "@/lib/seo";
import { listProducts, localize } from "@/server/catalog";
import "@/app/hero-photo.css";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = isLocale(lang) ? lang : "en";
  const t = getDict(l);
  return { ...pageMetadata({ lang: l, path: "", title: `${BUSINESS.brand} | ${t.seo.title}`, description: t.seo.description }), title: { absolute: `${BUSINESS.brand} | ${t.seo.title}` } };
}

const ic = { width: 46, height: 46, viewBox: "0 0 46 46", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, "aria-hidden": true };

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const t = getDict(lang);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const all = (await listProducts()).map((p) => localize(p, lang));
  const best = [...all.filter((p) => p.tag === "best_seller" || p.tag === "popular"), ...all.filter((p) => p.tag !== "best_seller" && p.tag !== "popular")].slice(0, 3);
  const h = t.home;

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('aon-intro')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.intro='off'}catch(e){}" }}
      />
      <Intro skip={t.hero.skip} brand={BUSINESS.brand} />

      <section className={`hero ${script.variable}`}>
        <div className="hero-in">
          <div className="hero-txt">
            <h1>{t.hero.h1}</h1>
            <span className="hero-rule" aria-hidden="true" />
            <p>{t.hero.sub}</p>
            <div className="hero-cta">
              <Link className="btn btn-gold" href={`/${lang}/shop`}>{t.hero.cta}</Link>
              <Link className="btn btn-ghost" href={`/${lang}/story`}>{t.hero.story}</Link>
            </div>
          </div>
          <div className="hero-art">
            <HeroVideo alt={t.hero.imgAlt} />
          </div>
        </div>
        <svg className="hero-drip" viewBox="0 0 400 26" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 26 V8 C20 8 26 8 32 10 C38 12 38 24 44 24 C50 24 50 10 62 8 C100 4 120 8 140 10 C150 11 152 25 160 25 C168 25 168 10 190 8 C230 5 260 9 280 10 C288 11 290 22 296 22 C302 22 302 10 320 8 C350 5 380 8 400 8 V26 Z" />
        </svg>
      </section>

      <section className="sec" id="best">
        <div className="sec-head">
          <div><h2>{h.bestH}</h2><p>{h.bestSub}</p></div>
          <Link className="link" href={`/${lang}/shop`}>{h.seeAll}</Link>
        </div>
        <div className="grid three">{best.map((p) => <ProductCard key={p.slug} p={p} lang={lang} t={t} />)}</div>
      </section>

      <Hexdiv />

      <section className="story" id="story">
        <svg className="story-bg" aria-hidden="true"><rect width="100%" height="100%" fill="url(#hpl)" /></svg>
        <div className="story-in">
          <div>
            <StoryVideo src="/videos/pour.mp4" label={h.storyImgAlt} />
          </div>
          <div>
            <h2>{h.storyH}</h2>
            <p>{h.storyP1}</p>
            <p>{h.storyP2}</p>
            <Link className="btn btn-olive" href={`/${lang}/shop`}>{t.hero.cta}</Link>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><div><h2>{h.stepsH}</h2></div></div>
        <div className="steps">
          <div className="step">
            <div className="ic"><svg {...ic}><polygon points={hexPts(23, 14, 9)} /><polygon points={hexPts(13, 31, 9)} /><polygon points={hexPts(33, 31, 9)} /></svg></div>
            <small>1</small><h3>{h.steps[0]!.h}</h3><p>{h.steps[0]!.p}</p>
          </div>
          <div className="step">
            <div className="ic"><svg {...ic}><rect x="9" y="22" width="28" height="19" rx="4" /><path d="M12 22v-3h22v3" /><path d="M23 4c-3 5-3 7 0 9 3-2 3-4 0-9z" /><path d="M23 13v6" /></svg></div>
            <small>2</small><h3>{h.steps[1]!.h}</h3><p>{h.steps[1]!.p}</p>
          </div>
          <div className="step">
            <div className="ic"><svg {...ic}><path d="M6 15l17-8 17 8v18l-17 8-17-8z" /><path d="M6 15l17 8 17-8M23 23v18" /><path d="M14.5 11l17 8" /></svg></div>
            <small>3</small><h3>{h.steps[2]!.h}</h3><p>{h.steps[2]!.p}</p>
          </div>
        </div>
      </section>

      <section className="news">
        <div className="news-in">
          <div><h2>{h.newsH}</h2><p className="lead">{h.newsLead}</p></div>
          <NewsletterForm lang={lang} t={t.newsletter} />
        </div>
      </section>
    </>
  );
}
