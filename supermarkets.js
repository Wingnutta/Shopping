// Catalogue of Spanish supermarket chains: name plus colours.
// To add a chain, add one line to LIST. "key" must be unique and never change once
// used (it is saved with each supermarket).
//   bg     = main colour (banner, home card)
//   fg     = text colour on bg
//   accent = optional; colour for buttons, ticks and outlines on the (white) page.
//            Leave it out to use bg. Needed when bg is too light or too bright to read
//            on white (e.g. Lidl's yellow, so Lidl uses its blue).
//   logo   = optional; path to a 192x192 transparent PNG in logos/, named after the key.
//            Shown in the round badge. Chains without one show their first letter.
//            Also add the file to FILES in sw.js so it works offline.
// Colours are approximations of each brand; edit the hex codes to taste.
const Chains = (() => {
  const LIST = [
    { key: "mercadona", name: "Mercadona",             bg: "#00843D", fg: "#ffffff", logo: "logos/mercadona.png" },
    { key: "carrefour", name: "Carrefour",             bg: "#004E9F", fg: "#ffffff", logo: "logos/carrefour.png" },
    { key: "lidl",      name: "Lidl",                  bg: "#FFD500", fg: "#0050AA", accent: "#0050AA", logo: "logos/lidl.png" },
    { key: "dia",       name: "Dia",                   bg: "#E30613", fg: "#ffffff", logo: "logos/dia.png" },
    { key: "alcampo",   name: "Alcampo",               bg: "#E2001A", fg: "#ffffff" },
    { key: "aldi",      name: "Aldi",                  bg: "#00347B", fg: "#ffffff", logo: "logos/aldi.png" },
    { key: "eroski",    name: "Eroski",                bg: "#D5001C", fg: "#ffffff" },
    { key: "consum",    name: "Consum",                bg: "#EF7D00", fg: "#ffffff", accent: "#B85400" },
    { key: "hipercor",  name: "Hipercor / El Corte Inglés", bg: "#00693E", fg: "#ffffff" },
    { key: "ahorramas", name: "Ahorramas",             bg: "#2E9E3A", fg: "#ffffff", accent: "#237A2D" },
    { key: "caprabo",   name: "Caprabo",               bg: "#D9262C", fg: "#ffffff" },
    { key: "bonpreu",   name: "Bonpreu",               bg: "#00A04A", fg: "#ffffff", accent: "#007A38" },
    { key: "gadis",     name: "Gadis",                 bg: "#E2231A", fg: "#ffffff" },
    { key: "supercor",  name: "Supercor",              bg: "#1E7B4F", fg: "#ffffff" },
    { key: "froiz",     name: "Froiz",                 bg: "#E30613", fg: "#ffffff" }
  ];

  // Used when a supermarket has no chain (the plain green look).
  const DEFAULT = { key: null, name: "", bg: "#2e7d32", fg: "#ffffff", accent: "#2e7d32" };

  // All chains, in the order they should appear in the dropdown.
  function all() {
    return LIST;
  }

  function byKey(key) {
    return LIST.find((c) => c.key === key) || null;
  }

  function byName(name) {
    const n = String(name || "").trim().toLowerCase();
    return LIST.find((c) => c.name.toLowerCase() === n) || null;
  }

  // Colours for a saved supermarket { name, chain }: { bg, fg, accent, ... }.
  // Order: its saved chain, then a name match (older supermarkets typed by hand), then green.
  function themeFor(store) {
    const chain = store ? byKey(store.chain) || byName(store.name) : null;
    if (!chain) return DEFAULT;
    return Object.assign({}, chain, { accent: chain.accent || chain.bg });
  }

  return { all, byKey, byName, themeFor, DEFAULT };
})();
