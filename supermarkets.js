// Catalogue of Spanish supermarket chains: name plus banner colours.
// To add a chain, add one line to LIST. "key" must be unique and never change once
// used (it is saved with each supermarket). bg = banner colour, fg = text colour on it.
// Colours are approximations of each brand; edit the hex codes to taste.
const Chains = (() => {
  const LIST = [
    { key: "mercadona", name: "Mercadona",             bg: "#00843D", fg: "#ffffff" },
    { key: "carrefour", name: "Carrefour",             bg: "#004E9F", fg: "#ffffff" },
    { key: "lidl",      name: "Lidl",                  bg: "#FFD500", fg: "#0050AA" },
    { key: "dia",       name: "Dia",                   bg: "#E30613", fg: "#ffffff" },
    { key: "alcampo",   name: "Alcampo",               bg: "#E2001A", fg: "#ffffff" },
    { key: "aldi",      name: "Aldi",                  bg: "#00347B", fg: "#ffffff" },
    { key: "eroski",    name: "Eroski",                bg: "#D5001C", fg: "#ffffff" },
    { key: "consum",    name: "Consum",                bg: "#EF7D00", fg: "#ffffff" },
    { key: "hipercor",  name: "Hipercor / El Corte Inglés", bg: "#00693E", fg: "#ffffff" },
    { key: "ahorramas", name: "Ahorramas",             bg: "#2E9E3A", fg: "#ffffff" },
    { key: "caprabo",   name: "Caprabo",               bg: "#D9262C", fg: "#ffffff" },
    { key: "bonpreu",   name: "Bonpreu",               bg: "#00A04A", fg: "#ffffff" },
    { key: "gadis",     name: "Gadis",                 bg: "#E2231A", fg: "#ffffff" },
    { key: "supercor",  name: "Supercor",              bg: "#1E7B4F", fg: "#ffffff" },
    { key: "froiz",     name: "Froiz",                 bg: "#E30613", fg: "#ffffff" }
  ];

  // Used when a supermarket has no chain (the plain green banner).
  const DEFAULT = { key: null, name: "", bg: "#2e7d32", fg: "#ffffff" };

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

  // Colours for a saved supermarket { name, chain }.
  // Order: its saved chain, then a name match (older supermarkets typed by hand), then green.
  function themeFor(store) {
    if (!store) return DEFAULT;
    return byKey(store.chain) || byName(store.name) || DEFAULT;
  }

  return { all, byKey, byName, themeFor, DEFAULT };
})();
