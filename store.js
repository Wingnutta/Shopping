// Data layer: everything is stored on the phone in localStorage.
// Kept separate so the UI files never touch storage directly.
//
// Shape (key "shopping-app:v1"):
//   { supermarkets: [ {
//       id, name, createdAt,
//       items: [ { id, name } ],                  // master list: everything she buys here
//       trip:  [ { itemId, name, done } ]         // current trip: temporary list for one visit
//   } ] }
// - "items" order is the order she arranged. Master items are never ticked.
// - "trip" is built from the master items (kept in master order). "done" means
//   it is in the trolley. Reset empties the trip; the master list is untouched.
// - Supermarkets saved earlier may have no "trip" (treated as empty) and old
//   items may still carry a stale "done" flag, which is simply ignored.
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

    data.supermarkets.push({
      id: makeId(), name: clean, createdAt: Date.now(), items: [], trip: []
    });
    if (!save(data)) return { ok: false, error: "Could not save on this device." };
    return { ok: true };
  }

  function removeSupermarket(id) {
    const data = load();
    data.supermarkets = data.supermarkets.filter((s) => s.id !== id);
    save(data);
  }

  // Runs fn(store) on one supermarket (arrays guaranteed to exist), then saves.
  function withStore(storeId, fn) {
    const data = load();
    const store = data.supermarkets.find((s) => s.id === storeId);
    if (!store) return null;
    if (!Array.isArray(store.items)) store.items = [];
    if (!Array.isArray(store.trip)) store.trip = [];
    const result = fn(store);
    save(data);
    return result;
  }

  // ---------- Items (the master list of one supermarket) ----------

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

    store.items.push({ id: makeId(), name: clean });
    if (!save(data)) return { ok: false, error: "Could not save on this device." };
    return { ok: true };
  }

  // direction: -1 = up, +1 = down (swaps with the neighbour in list order).
  function moveItem(storeId, itemId, direction) {
    withStore(storeId, (store) => {
      const items = store.items;
      const from = items.findIndex((i) => i.id === itemId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= items.length) return;
      const tmp = items[from];
      items[from] = items[to];
      items[to] = tmp;
    });
  }

  // Removes an item from the master list only; a trip already in progress keeps it.
  function removeItem(storeId, itemId) {
    withStore(storeId, (store) => {
      const i = store.items.findIndex((x) => x.id === itemId);
      if (i >= 0) store.items.splice(i, 1);
    });
  }

  // ---------- Trip (the temporary list for one visit) ----------

  function getTrip(storeId) {
    const store = getSupermarket(storeId);
    return store && Array.isArray(store.trip) ? store.trip : [];
  }

  // Rebuilds the trip from the master order, keeping "done" flags.
  // chosenIds: Set of master item ids that should be on the trip.
  function rebuildTrip(store, chosenIds) {
    const old = new Map(store.trip.map((t) => [t.itemId, t]));
    const next = [];
    store.items.forEach((item) => {
      if (!chosenIds.has(item.id)) return;
      const prev = old.get(item.id);
      next.push({ itemId: item.id, name: item.name, done: prev ? prev.done : false });
    });
    // Entries whose master item was deleted meanwhile stay on the trip, at the end.
    const masterIds = new Set(store.items.map((i) => i.id));
    store.trip.forEach((t) => {
      if (!masterIds.has(t.itemId) && chosenIds.has(t.itemId)) next.push(t);
    });
    store.trip = next;
  }

  // Put one master item on the trip, or take it off.
  function setInTrip(storeId, itemId, included) {
    withStore(storeId, (store) => {
      const chosen = new Set(store.trip.map((t) => t.itemId));
      if (included) chosen.add(itemId);
      else chosen.delete(itemId);
      rebuildTrip(store, chosen);
    });
  }

  function addAllToTrip(storeId) {
    withStore(storeId, (store) => {
      const chosen = new Set(store.trip.map((t) => t.itemId));
      store.items.forEach((i) => chosen.add(i.id));
      rebuildTrip(store, chosen);
    });
  }

  // Tick / untick a trip item (in the trolley or not).
  function toggleTripItem(storeId, itemId) {
    withStore(storeId, (store) => {
      const t = store.trip.find((x) => x.itemId === itemId);
      if (t) t.done = !t.done;
    });
  }

  // Clear the whole trip, ready for next time. The master list is not touched.
  function resetTrip(storeId) {
    withStore(storeId, (store) => { store.trip = []; });
  }

  return {
    getSupermarkets, getSupermarket, addSupermarket, removeSupermarket,
    getItems, addItem, moveItem, removeItem,
    getTrip, setInTrip, addAllToTrip, toggleTripItem, resetTrip
  };
})();
