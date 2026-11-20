// UI for one supermarket's trip list: the temporary list for one visit.
// Two modes:
//   Choose: every item from the supermarket's list; tap to put it on / take it off this trip.
//   Shopping: tap an item to put it in the trolley. Ticked items turn grey, get a
//     green tick and drop to the bottom of the list.
// Reset clears the trip (after a confirm). The supermarket's own list is never changed here.
const Trip = (() => {
  const view = document.getElementById("trip-view");
  const titleEl = document.getElementById("trip-title");
  const listEl = document.getElementById("trip-list");
  const emptyEl = document.getElementById("trip-empty");
  const doneMsgEl = document.getElementById("trip-all-done");
  const progressEl = document.getElementById("trip-progress");
  const chooseBtn = document.getElementById("choose-btn");
  const addAllBtn = document.getElementById("add-all-btn");
  const resetBtn = document.getElementById("trip-reset-btn");

  let storeId = null;
  let storeName = "";
  let choosing = false;

  function toggleRow(className, checked, name, onClick) {
    const li = document.createElement("li");
    li.className = "item-row " + className;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item-toggle";
    btn.setAttribute("aria-pressed", checked ? "true" : "false");

    const box = document.createElement("span");
    box.className = "item-box";
    box.textContent = checked ? "✓" : "";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = name; // textContent keeps user input safe

    btn.append(box, label);
    btn.addEventListener("click", onClick);
    li.appendChild(btn);
    return li;
  }

  // Choose mode: all master items, ticked if they are on this trip.
  function renderChoose(master, inTrip) {
    master.forEach((item) => {
      const chosen = inTrip.has(item.id);
      listEl.appendChild(
        toggleRow(chosen ? "is-chosen" : "", chosen, item.name, () => {
          Store.setInTrip(storeId, item.id, !chosen);
          render();
        })
      );
    });
  }

  // Shopping mode: still-to-get first, then the ones already in the trolley.
  function shoppingRow(entry) {
    return toggleRow(entry.done ? "is-done" : "", entry.done, entry.name, () => {
      Store.toggleTripItem(storeId, entry.itemId);
      if (!entry.done && navigator.vibrate) navigator.vibrate(15);
      render();
    });
  }

  function renderShopping(trip) {
    trip.filter((t) => !t.done).forEach((t) => listEl.appendChild(shoppingRow(t)));
    const doneCount = trip.filter((t) => t.done).length;
    if (doneCount > 0) {
      const divider = document.createElement("li");
      divider.className = "item-divider";
      divider.textContent = "In the trolley";
      listEl.appendChild(divider);
      trip.filter((t) => t.done).forEach((t) => listEl.appendChild(shoppingRow(t)));
    }
  }

  function render() {
    const master = Store.getItems(storeId);
    const trip = Store.getTrip(storeId);
    const inTrip = new Set(trip.map((t) => t.itemId));
    const doneCount = trip.filter((t) => t.done).length;

    listEl.replaceChildren();
    view.classList.toggle("is-choosing", choosing);
    chooseBtn.textContent = choosing ? "Done" : "Choose items";
    chooseBtn.setAttribute("aria-pressed", choosing ? "true" : "false");
    addAllBtn.hidden = !choosing;
    addAllBtn.disabled = master.every((i) => inTrip.has(i.id));
    resetBtn.disabled = trip.length === 0;
    chooseBtn.disabled = master.length === 0 && !choosing;

    if (choosing) {
      progressEl.textContent = trip.length + " chosen";
      emptyEl.textContent = "Nothing to choose from yet. Add items to " + storeName + "'s list first.";
      emptyEl.hidden = master.length > 0;
      doneMsgEl.hidden = true;
      renderChoose(master, inTrip);
      return;
    }

    progressEl.textContent = trip.length ? doneCount + " of " + trip.length + " in trolley" : "";
    emptyEl.textContent = "This list is empty. Tap “Choose items” to add things from " + storeName + "'s list.";
    emptyEl.hidden = trip.length > 0;
    doneMsgEl.hidden = !(trip.length > 0 && doneCount === trip.length);
    renderShopping(trip);
  }

  chooseBtn.addEventListener("click", () => {
    choosing = !choosing;
    render();
  });

  addAllBtn.addEventListener("click", () => {
    Store.addAllToTrip(storeId);
    render();
  });

  resetBtn.addEventListener("click", () => {
    if (confirm("Clear this list? " + storeName + "'s own list stays as it is.")) {
      Store.resetTrip(storeId);
      choosing = false;
      render();
    }
  });

  // Called by app.js when she opens a trip list.
  function open(id) {
    const store = Store.getSupermarket(id);
    if (!store) return false;
    storeId = id;
    storeName = store.name;
    // A brand new trip starts in Choose mode so she can pick items straight away.
    choosing = Store.getTrip(id).length === 0 && Store.getItems(id).length > 0;
    titleEl.textContent = store.name + " – list for this trip";
    render();
    return true;
  }

  return { open };
})();
