// Data layer: everything is stored on the phone in localStorage.
// Kept separate so new features (lists, items) can be added without touching the UI code.
const Store = (() => {
  const KEY = "shopping-app:v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && Array.isArray(data.supermarkets)) return data;
    } catch (e) { /* fall through to default */ }
    return { supermarkets: [] };
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getSupermarkets() {
    return load().supermarkets;
  }

  // Returns { ok: true } or { ok: false, error: "..." }
  function addSupermarket(name) {
    const clean = String(name).trim().replace(/\s+/g, " ");
    if (!clean) return { ok: false, error: "Please enter a name." };

    const data = load();
    const exists = data.supermarkets.some(
      (s) => s.name.toLowerCase() === clean.toLowerCase()
    );
    if (exists) return { ok: false, error: clean + " is already in the list." };

    data.supermarkets.push({ id: makeId(), name: clean, createdAt: Date.now() });
    if (!save(data)) return { ok: false, error: "Could not save on this device." };
    return { ok: true };
  }

  function removeSupermarket(id) {
    const data = load();
    data.supermarkets = data.supermarkets.filter((s) => s.id !== id);
    save(data);
  }

  return { getSupermarkets, addSupermarket, removeSupermarket };
})();