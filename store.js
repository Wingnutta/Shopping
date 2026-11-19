// Data layer: everything is stored on the phone in localStorage.
// Kept separate so the UI files never touch storage directly.
//
// Shape (key "shopping-app:v1"):
//   { supermarkets: [ { id, name, createdAt, items: [ { id, name, done } ] } ] }
// The order of the items array is the list order she arranged.
// "done" (in the trolley) is shown at the bottom by the UI, but never changes
// this order, so Reset simply clears the ticks and everything is back in place.
// Supermarkets saved before lists existed have no "items": treated as empty.
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

  function cleanName(name) {
    return String(name).trim().replace(/\s+/g, " ");
  }

  // ---------- Supermarkets ----------

  function getSupermarkets() {
    return load().supermarkets;
  }

  function getSupermarket(id) {
    return load().supermarkets.find((s) => s.id === id) || null;
  }

  // Returns { ok: true } or { ok: false, error: "..." }
  function addSupermarket(name) {
    const clean = cleanName(name);
    if (!clean) return { ok: false, error: "Please enter a name." };

    const data = load();
    const exists = data.supermarkets.some(
      (s) => s.name.toLowerCase() === clean.toLowerCase()
    );
    if (exists) return { ok: false, error: clean + " is already in the list." };

    data.supermarkets.push({ id: makeId(), name: clean, createdAt: Date.now(), items: [] });
    if (!save(data)) return { ok: false, error: "Could not save on this device." };
    return { ok: true };
  }

  function removeSupermarket(id) {
    const data = load();
    data.supermarkets = data.supermarkets.filter((s) => s.id !== id);
    save(data);
  }

  // ---------- Items (the shopping list of one supermarket) ----------

  // Runs fn(items) on one supermarket's item array, then saves. Returns fn's result.
  function withItems(storeId, fn) {
    const data = load();
    const store = data.supermarkets.find((s) => s.id === storeId);
    if (!store) return null;
    if (!Array.isArray(store.items)) store.items = [];
    const result = fn(store.items);
    save(data);
    return result;
  }

  function getItems(storeId) {
    const store = getSupermarket(storeId);
    return store && Array.isArray(store.items) ? store.items : [];
  }

  // Returns { ok: true } or { ok: false, error: "..." }
  function addItem(storeId, name) {
    const clean = cleanName(name);
    if (!clean) return { ok: false, error: "Please enter an item." };

    const data = load();
    const store = data.supermarkets.find((s) => s.id === storeId);
    if (!store) return { ok: false, error: "That supermarket no longer exists." };
    if (!Array.isArray(store.items)) store.items = [];

    const exists = store.items.some((i) => i.name.toLowerCase() === clean.toLowerCase());
    if (exists) return { ok: false, error: clean + " is already on the list." };

    store.items.push({ id: makeId(), name: clean, done: false });
    if (!save(data)) return { ok: false, error: "Could not save on this device." };
    return { ok: true };
  }

  // Tick / untick (in the trolley or not).
  function toggleItem(storeId, itemId) {
    withItems(storeId, (items) => {
      const item = items.find((i) => i.id === itemId);
      if (item) item.done = !item.done;
    });
  }

  // direction: -1 = up, +1 = down (swaps with the neighbour in list order).
  function moveItem(storeId, itemId, direction) {
    withItems(storeId, (items) => {
      const from = items.findIndex((i) => i.id === itemId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= items.length) return;
      const tmp = items[from];
      items[from] = items[to];
      items[to] = tmp;
    });
  }

  function removeItem(storeId, itemId) {
    withItems(storeId, (items) => {
      const i = items.findIndex((x) => x.id === itemId);
      if (i >= 0) items.splice(i, 1);
    });
  }

  // Un-tick everything, ready for the next visit. Order and items are kept.
  function resetList(storeId) {
    withItems(storeId, (items) => {
      items.forEach((i) => { i.done = false; });
    });
  }

  return {
    getSupermarkets, getSupermarket, addSupermarket, removeSupermarket,
    getItems, addItem, toggleItem, moveItem, removeItem, resetList
  };
})();
