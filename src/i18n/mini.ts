/** Tiny strings used by client-side error pages, so they don't pull the full dictionaries into the browser bundle. */
export const MINI = {
  en: {
    notFound: { h1: "This page has flown away", p: "The link may be old, or the page may have moved. Let us get you back to something real.", shop: "Shop the collection", home: "Back to home" },
    errors: { title: "Something went wrong", body: "Please try again. If the problem continues, email us.", retry: "Try again" },
  },
  ro: {
    notFound: { h1: "Această pagină a zburat", p: "Linkul poate fi vechi sau pagina s-a mutat. Hai să te ducem înapoi la ceva real.", shop: "Vezi colecția", home: "Înapoi acasă" },
    errors: { title: "Ceva nu a mers", body: "Încearcă din nou. Dacă problema continuă, scrie-ne pe email.", retry: "Încearcă din nou" },
  },
} as const;
