// UI for one supermarket's master list (everything she buys in this shop).
// No ticking here: the ticking happens on the trip list (trip.js).
// Two modes:
//   Normal: just the list of items, plus the "New list" button that opens the trip list.
//   Arrange: ▲ ▼ buttons reorder items, ✕ removes one.
const Lists = (() => {
  const view = document.getElementById("list-view");
  const form = document.getElementById("item-form");
  const input = document.getElementById("item-name");
  const errorEl = document.getElementById("item-error");
  const listEl = document.getElementById("item-list");
  const emptyEl = document.getElementById("item-empty");
  const countEl = document.getElementById("list-count");
  const arrangeBtn = document.getElementById("arrange-btn");
  const newListBtn = document.getElementById("newlist-btn");

  let storeId = null;
  let arranging = false;

  function showError(msg) {
    errorEl.textContent = msg || "";
    errorEl.hidden = !msg;
  }

  function makeButton(className, text, label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.textContent = text;
    if (label) b.setAttribute("aria-label", label);
    b.addEventListener("click", onClick);
    return b;
  }

  function plainRow(item) {
    const li = document.createElement("li");
    li.className = "item-row plain-row";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = item.name; // textContent keeps user input safe

    li.appendChild(label);
    return li;
  }

  function arrangeRow(item, index, total) {
    const li = document.createElement("li");
    li.className = "item-row arrange-row";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = item.name;

    const up = makeButton("move-btn", "▲", "Move " + item.name + " up", () => {
      Store.moveItem(storeId, item.id, -1);
      render();
    });
    up.disabled = index === 0;

    const down = makeButton("move-btn", "▼", "Move " + item.name + " down", () => {
      Store.moveItem(storeId, item.id, 1);
      render();
    });
    down.disabled = index === total - 1;

    const del = makeButton("item-delete", "✕", "Remove " + item.name, () => {
      Store.removeItem(storeId, item.id);
      render();
    });

    li.append(label, up, down, del);
    return li;
  }

  function render() {
    const items = Store.getItems(storeId);
    const trip = Store.getTrip(storeId);

    listEl.replaceChildren();
    emptyEl.hidden = items.length > 0;

    view.classList.toggle("is-arranging", arranging);
    arrangeBtn.textContent = arranging ? "Done" : "Arrange";
    arrangeBtn.setAttribute("aria-pressed", arranging ? "true" : "false");
    countEl.textContent = items.length
      ? items.length + (items.length === 1 ? " item" : " items")
      : "";

    // A trip in progress can be continued; otherwise start a new one.
    newListBtn.textContent = trip.length
      ? "Continue list (" + trip.filter((t) => t.done).length + " of " + trip.length + " in trolley)"
      : "New list";
    newListBtn.disabled = items.length === 0 && trip.length === 0;

    items.forEach((item, i) => {
      listEl.appendChild(arranging ? arrangeRow(item, i, items.length) : plainRow(item));
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = Store.addItem(storeId, input.value);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    showError("");
    input.value = "";
    input.focus(); // keep the keyboard open so she can add several in a row
    render();
  });

  input.addEventListener("input", () => showError(""));

  arrangeBtn.addEventListener("click", () => {
    arranging = !arranging;
    render();
  });

  newListBtn.addEventListener("click", () => {
    location.hash = "#trip/" + storeId;
  });

  // Called by app.js when she opens a supermarket.
  function open(id) {
    const store = Store.getSupermarket(id);
    if (!store) return false;
    storeId = id;
    arranging = false;
    input.value = "";
    showError("");
    document.getElementById("list-title").textContent = store.name;
    render();
    return true;
  }

  return { open };
})();
