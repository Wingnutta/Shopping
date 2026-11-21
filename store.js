// Data layer: everything is stored on the phone in localStorage.
// Kept separate so the UI files never touch storage directly.
//
// Shape (key "shopping-app:v1"):
//   { supermarkets: [ {
//       id, name, createdAt,
//       chain: "mercadona" | null,                // key from supermarkets.js, null = plain green
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

  // chainKey (optional) is a key from supermarkets.js; leave it out for a custom shop.
  // Returns { ok: true } or { ok: false, error: "..." }
  function addSupermarket(name, chainKey) {
    const clean = cleanName(name);
    if (!clean) return { ok: false, error: "Please enter a name." };

    const data = load();
    const exists = data.supermarkets.some(
      (s) => s.name.toLowerCase() === clean.toLowerCase()
    );
    if (exists) return { ok: false, error: clean + " is already in the list." };

    data.supermarkets.push({
      id: makeId(), name: clean, createdAt: Date.now(),
      chain: chainKey ? String(chainKey) : null, items: [], trip: []
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

  // ---------- Backup (export / restore) ----------
  // A backup is one JSON file: { app, version, exportedAt, data: <everything above> }.
  // Backup.js (the UI) downloads it and reads it back; all checking happens here.

  const BACKUP_KEY = "shopping-app:last-backup"; // when she last saved a backup (not part of the backup)

  function exportData() {
    return JSON.stringify({
      app: "shopping-app",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: load()
    }, null, 2);
  }

  function text(v, max) {
    return typeof v === "string" ? cleanName(v).slice(0, max) : "";
  }

  // Checks the text of a backup file and tidies it into the shape the app expects.
  // Anything unusable is dropped rather than risk breaking the app.
  // Returns { ok: true, data, exportedAt, stores, items } or { ok: false, error: "..." }.
  function parseBackup(raw) {
    let obj;
    try { obj = JSON.parse(raw); } catch (e) { obj = null; }
    const notBackup = { ok: false, error: "That file is not a Shopping backup." };
    if (!obj || typeof obj !== "object") return notBackup;
    if (obj.app !== undefined && obj.app !== "shopping-app") return notBackup;
    if (typeof obj.version === "number" && obj.version > 1) {
      return { ok: false, error: "That backup is from a newer version of the app." };
    }
    const src = obj.data && typeof obj.data === "object" ? obj.data : obj;
    if (!Array.isArray(src.supermarkets)) return notBackup;

    const seenStores = new Set();
    const supermarkets = [];
    let itemCount = 0;
    src.supermarkets.forEach((s) => {
      if (!s || typeof s !== "object") return;
      const name = text(s.name, 40);
      const id = typeof s.id === "string" && s.id ? s.id : makeId();
      if (!name || seenStores.has(id)) return;
      seenStores.add(id);

      const seenItems = new Set();
      const items = [];
      (Array.isArray(s.items) ? s.items : []).forEach((i) => {
        if (!i || typeof i !== "object") return;
        const iname = text(i.name, 60);
        const iid = typeof i.id === "string" && i.id ? i.id : makeId();
        if (!iname || seenItems.has(iid)) return;
        seenItems.add(iid);
        items.push({ id: iid, name: iname });
      });

      const seenTrip = new Set();
      const trip = [];
      (Array.isArray(s.trip) ? s.trip : []).forEach((t) => {
        if (!t || typeof t !== "object") return;
        const tname = text(t.name, 60);
        if (!tname || typeof t.itemId !== "string" || seenTrip.has(t.itemId)) return;
        seenTrip.add(t.itemId);
        trip.push({ itemId: t.itemId, name: tname, done: t.done === true });
      });

      itemCount += items.length;
      supermarkets.push({
        id, name,
        createdAt: Number.isFinite(s.createdAt) ? s.createdAt : Date.now(),
        chain: typeof s.chain === "string" && s.chain ? s.chain : null,
        items, trip
      });
    });

    return {
      ok: true,
      data: { supermarkets },
      exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : "",
      stores: supermarkets.length,
      items: itemCount
    };
  }

  // Replaces everything on this phone with the (already checked) backup data.
  function restoreData(data) {
    return save({ supermarkets: data.supermarkets });
  }

  function getLastBackup() {
    try { return Number(localStorage.getItem(BACKUP_KEY)) || 0; } catch (e) { return 0; }
  }

  function markBackup() {
    try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch (e) { /* not critical */ }
  }

  return {
    getSupermarkets, getSupermarket, addSupermarket, removeSupermarket,
    getItems, addItem, moveItem, removeItem,
    getTrip, setInTrip, addAllToTrip, toggleTripItem, resetTrip,
    exportData, parseBackup, restoreData, getLastBackup, markBackup
  };
})();
