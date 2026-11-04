/**
 * Starting catalogue. `npm run seed:sql` turns this into supabase/seed.sql.
 * After the first run, manage products in the admin area (the database is the source of truth).
 * Prices and stock are placeholders: set the real ones in the admin.
 */
export type SeedProduct = {
  slug: string;
  category: "candles" | "skincare" | "gifts";
  nameEn: string; nameRo: string;
  noteEn: string; noteRo: string;
  descEn: string; descRo: string;
  formatEn: string; formatRo: string;
  pricePence: number;
  stock: number;
  tag: "" | "best_seller" | "popular" | "new" | "gift_set";
  artKind: "candle" | "tin" | "balm" | "tube" | "cream" | "set";
  artColor: string;
  artWax: string;
  sort: number;
};

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: "wild-honey-candle", category: "candles", sort: 10, tag: "best_seller", artKind: "candle", artColor: "#C9993A", artWax: "#EBCB7D",
    nameEn: "Wild Honey Candle", nameRo: "Lumânare Miere Sălbatică",
    noteEn: "Warm and sweet, 45 hour burn", noteRo: "Caldă și dulce, arde 45 de ore",
    descEn: "Pure beeswax and wildflower honey. Burns clean for up to 45 hours with a faint, natural warmth that fills any room.",
    descRo: "Ceară de albine pură și miere de flori sălbatice. Arde curat până la 45 de ore, cu o căldură naturală, discretă, care umple orice cameră.",
    formatEn: "Up to 45 hours", formatRo: "Până la 45 de ore", pricePence: 2800, stock: 10,
  },
  {
    slug: "oakmoss-cedar-candle", category: "candles", sort: 20, tag: "", artKind: "candle", artColor: "#6F7B45", artWax: "#D9CFA0",
    nameEn: "Oakmoss and Cedar Candle", nameRo: "Lumânare Mușchi de Stejar și Cedru",
    noteEn: "Earthy and deep, 40 hour burn", noteRo: "Pământie și profundă, arde 40 de ore",
    descEn: "Deep, grounding, woody. Inspired by forest floors and morning air, scented with botanical oils.",
    descRo: "Profundă, liniștitoare, lemnoasă. Inspirată de pădure și de aerul dimineții, parfumată cu uleiuri botanice.",
    formatEn: "Up to 40 hours", formatRo: "Până la 40 de ore", pricePence: 2600, stock: 10,
  },
  {
    slug: "lavender-candle", category: "candles", sort: 30, tag: "", artKind: "candle", artColor: "#9A88B0", artWax: "#E4D8C0",
    nameEn: "Lavender Fields Candle", nameRo: "Lumânare Câmpuri de Lavandă",
    noteEn: "Floral and calm, 38 hour burn", noteRo: "Florală și calmă, arde 38 de ore",
    descEn: "Soft lavender with a hint of chamomile. Made for evenings when you need to slow down and breathe.",
    descRo: "Lavandă delicată cu o notă de mușețel. Creată pentru serile în care ai nevoie să încetinești și să respiri.",
    formatEn: "Up to 38 hours", formatRo: "Până la 38 de ore", pricePence: 2400, stock: 10,
  },
  {
    slug: "meadow-candle", category: "candles", sort: 40, tag: "", artKind: "candle", artColor: "#8E9C54", artWax: "#E2DCAE",
    nameEn: "Meadow Botanicals Candle", nameRo: "Lumânare Flori de Câmp",
    noteEn: "Fresh and herbal, 42 hour burn", noteRo: "Proaspătă și ierboasă, arde 42 de ore",
    descEn: "A green, herbal scent, like fresh-cut grass and wild herbs on a summer morning.",
    descRo: "Un parfum verde, de ierburi, ca iarba proaspăt cosită și plantele sălbatice într-o dimineață de vară.",
    formatEn: "Up to 42 hours", formatRo: "Până la 42 de ore", pricePence: 2700, stock: 10,
  },
  {
    slug: "beeswax-lip-balm", category: "skincare", sort: 50, tag: "popular", artKind: "tube", artColor: "#5C6B2E", artWax: "#F3E7C4",
    nameEn: "Beeswax Lip Balm", nameRo: "Balsam de Buze cu Ceară de Albine",
    noteEn: "Healing, with calendula", noteRo: "Reparator, cu gălbenele",
    descEn: "Raw beeswax with calendula and vitamin E. Repairs and protects dry lips.",
    descRo: "Ceară de albine brută cu gălbenele și vitamina E. Repară și protejează buzele uscate.",
    formatEn: "Tube", formatRo: "Tub", pricePence: 1200, stock: 10,
  },
  {
    slug: "body-butter-cream", category: "skincare", sort: 60, tag: "", artKind: "cream", artColor: "#5C6B2E", artWax: "#EBDDBB",
    nameEn: "Body Butter Cream", nameRo: "Cremă Unt de Corp",
    noteEn: "Deep moisture, with rose hip", noteRo: "Hidratare profundă, cu măceșe",
    descEn: "Rich beeswax body butter with shea and rose hip oil, for skin that needs real help.",
    descRo: "Unt de corp bogat, cu ceară de albine, unt de shea și ulei de măceșe, pentru pielea care are nevoie de ajutor real.",
    formatEn: "Jar", formatRo: "Borcan", pricePence: 2400, stock: 10,
  },
  {
    slug: "beeswax-hand-salve", category: "skincare", sort: 70, tag: "best_seller", artKind: "tin", artColor: "#5C6B2E", artWax: "#EBDDBB",
    nameEn: "Beeswax Hand Salve", nameRo: "Unguent pentru Mâini cu Ceară de Albine",
    noteEn: "Repairing, with calendula", noteRo: "Reparator, cu gălbenele",
    descEn: "The thickest, most protective hand salve we make. Beeswax, calendula and lavender essential oil.",
    descRo: "Cel mai consistent și mai protector unguent pentru mâini pe care îl facem. Ceară de albine, gălbenele și ulei esențial de lavandă.",
    formatEn: "Tin", formatRo: "Cutie metalică", pricePence: 1600, stock: 10,
  },
  {
    slug: "face-neck-balm", category: "skincare", sort: 80, tag: "new", artKind: "balm", artColor: "#7C8A55", artWax: "#EBDDBB",
    nameEn: "Face and Neck Balm", nameRo: "Balsam pentru Față și Gât",
    noteEn: "Nourishing, with vitamin E", noteRo: "Hrănitor, cu vitamina E",
    descEn: "Lightweight beeswax balm with vitamin E and chamomile, for morning and evening on clean skin.",
    descRo: "Balsam ușor cu ceară de albine, vitamina E și mușețel, pentru dimineața și seara, pe pielea curată.",
    formatEn: "Tin", formatRo: "Cutie metalică", pricePence: 2200, stock: 10,
  },
  {
    slug: "lavender-candle-balm", category: "gifts", sort: 90, tag: "gift_set", artKind: "set", artColor: "#9A88B0", artWax: "#E4D8C0",
    nameEn: "Lavender Gift Set", nameRo: "Set Cadou Lavandă",
    noteEn: "Candle and balm, 2 items", noteRo: "Lumânare și balsam, 2 produse",
    descEn: "Our lavender candle paired with the beeswax lip balm. Wrapped and ready to give.",
    descRo: "Lumânarea noastră de lavandă împreună cu balsamul de buze cu ceară de albine. Ambalat și gata de dăruit.",
    formatEn: "2 items", formatRo: "2 produse", pricePence: 3800, stock: 10,
  },
  {
    slug: "honey-skincare-set", category: "gifts", sort: 100, tag: "gift_set", artKind: "set", artColor: "#C9993A", artWax: "#EBCB7D",
    nameEn: "Honey Skincare Set", nameRo: "Set Îngrijire cu Miere",
    noteEn: "Candle, salve and balm, 3 items", noteRo: "Lumânare, unguent și balsam, 3 produse",
    descEn: "Wild Honey Candle, Hand Salve and Lip Balm. Everything for a cosy, natural evening.",
    descRo: "Lumânarea Miere Sălbatică, Unguentul pentru Mâini și Balsamul de Buze. Tot ce trebuie pentru o seară caldă și naturală.",
    formatEn: "3 items", formatRo: "3 produse", pricePence: 4400, stock: 10,
  },
];
