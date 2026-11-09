export type StoryText = { description: string; body: string[]; sign: [string, string] };

export const STORY_TEXT: Record<"en" | "ro", StoryText> = {
  en: {
    description:
      "The Art of Nature began with handmade beeswax candles and a love of nature, simple things and thoughtful craftsmanship. Read our story.",
    body: [
      "The Art of Nature was born from my love for nature, simple things and the beauty of creating something with my own hands.",
      "I have always believed that nature offers us so much, often in the simplest forms. The warmth of beeswax, the richness of natural oils and butters, the beauty of thoughtful craftsmanship — these little things are what inspire me.",
      "What began with handmade beeswax candles is slowly growing into something more: a collection of natural creations made to bring warmth, comfort and a little more care into everyday life.",
      "Every candle I make is a small celebration of nature, shaped with patience, attention and love for the details that make each piece unique.",
      "As The Art of Nature grows, I hope to bring the same philosophy into handmade skincare, using carefully chosen oils, butters and beeswax to create simple, nourishing products for everyday rituals.",
      "For me, this is not just about making candles or skincare. It is about appreciating what nature gives us, finding beauty in simplicity and creating things that feel meaningful.",
      "Thank you for being here and supporting something made with care.",
    ],
    sign: ["With love,", "The Art of Nature"],
  },
  ro: {
    description:
      "The Art of Nature a început cu lumânări din ceară de albine făcute manual și din dragostea pentru natură, lucruri simple și meșteșug făcut cu grijă.",
    body: [
      "The Art of Nature s-a născut din dragostea mea pentru natură, pentru lucrurile simple și pentru frumusețea de a crea ceva cu propriile mâini.",
      "Am crezut întotdeauna că natura ne oferă enorm de mult, adesea în cele mai simple forme. Căldura cerii de albine, bogăția uleiurilor și untururilor naturale, frumusețea meșteșugului făcut cu grijă: aceste lucruri mici sunt cele care mă inspiră.",
      "Ceea ce a început cu lumânări din ceară de albine făcute manual crește încet în ceva mai mult: o colecție de creații naturale, făcute ca să aducă căldură, confort și un pic mai multă grijă în viața de zi cu zi.",
      "Fiecare lumânare pe care o fac este o mică sărbătoare a naturii, modelată cu răbdare, atenție și dragoste pentru detaliile care fac fiecare piesă unică.",
      "Pe măsură ce The Art of Nature crește, sper să aduc aceeași filozofie în produsele de îngrijire a pielii făcute manual, folosind uleiuri, unturi și ceară de albine alese cu grijă, pentru produse simple și hrănitoare, potrivite ritualurilor de zi cu zi.",
      "Pentru mine, nu e vorba doar despre a face lumânări sau produse de îngrijire. E vorba despre a prețui ce ne oferă natura, a găsi frumusețea în simplitate și a crea lucruri care au sens.",
      "Mulțumesc că ești aici și că sprijini ceva făcut cu grijă.",
    ],
    sign: ["Cu drag,", "The Art of Nature"],
  },
};
