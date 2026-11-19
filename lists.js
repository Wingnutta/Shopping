// UI for one supermarket's shopping list.
// Two modes:
//   Shopping (default): tap an item to put it in the trolley. Ticked items turn
//     grey, get a green tick and drop to the bottom of the list.
//   Arrange: ▲ ▼ buttons reorder items, ✕ removes one.
// Order is stored by Store; ticked items are only *displayed* at the bottom,
// so unticking or Reset puts everything back where she arranged it.
const Lists = (() => {
  const view = document.getElementById("list-view");
  const form = document.getElementById("item-form");
  const input = document.getElementById("item-name");
  const errorEl = document.getElementById("item-error");
  const listEl = document.getElementById("item-list");
  const emptyEl = document.getElementById("item-empty");
  const doneMsgEl = document.getElementById("item-all-done");
  const progressEl = document.getElementById("list-progress");
  const arrangeBtn = document.getElementById("arrange-btn");
  const resetBtn = document.getElementById("reset-btn");

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

  function shoppingRow(item) {
    const li = document.createElement("li");
    li.className = "item-row" + (item.done ? " is-done" : "");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item-toggle";
    btn.setAttribute("aria-pressed", item.done ? "true" : "false");

    const box = document.createElement("span");
    box.className = "item-box";
    box.textContent = item.done ? "✓" : "";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = item.name; // textContent keeps user input safe

    btn.append(box, label);
    btn.addEventListener("click", () => {
      Store.toggleItem(storeId, item.id);
      if (!item.done && navigator.vibrate) navigator.vibrate(15);
      render();
    });

    li.appendChild(btn);
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
    const doneCount = items.filter((i) => i.done).length;

    listEl.replaceChildren();
    emptyEl.hidden = items.length > 0;
    doneMsgEl.hidden = arranging || !(items.length > 0 && doneCount === items.length);

    view.classList.toggle("is-arranging", arranging);
    arrangeBtn.textContent = arranging ? "Done" : "Arrange";
    arrangeBtn.setAttribute("aria-pressed", arranging ? "true" : "false");
    resetBtn.disabled = doneCount === 0;
    progressEl.textContent = items.length
      ? doneCount + " of " + items.length + " in trolley"
      : "";

    if (arranging) {
      // Everything in list order, with the reorder controls.
      items.forEach((item, i) => listEl.appendChild(arrangeRow(item, i, items.length)));
      return;
    }

    // Shopping: still-to-get first, then the ones already in the trolley.
    items.filter((i) => !i.done).forEach((item) => listEl.appendChild(shoppingRow(item)));
    if (doneCount > 0) {
      const divider = document.createElement("li");
      divider.className = "item-divider";
      divider.textContent = "In the trolley";
      listEl.appendChild(divider);
      items.filter((i) => i.done).forEach((item) => listEl.appendChild(shoppingRow(item)));
    }
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

  resetBtn.addEventListener("click", () => {
    if (confirm("Reset this list for another visit? Everything will be un-ticked.")) {
      Store.resetList(storeId);
      render();
    }
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
