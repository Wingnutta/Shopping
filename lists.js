// UI for one supermarket's master list (everything she buys in this shop).
// No ticking here: the ticking happens on the trip list (trip.js).
// Two modes:
//   Normal: just the list of items, plus the "Next Shop" button that opens the trip list.
//   Arrange: drag the ≡ handle to move an item anywhere (the list scrolls by itself when
//            she drags near the top or bottom of the screen); ✕ removes one.
//            With a keyboard, the up/down arrow keys on a focused handle also move it.
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
  const header = document.querySelector(".app-header");

  let storeId = null;
  let arranging = false;

  // Drag state (null when nothing is being dragged).
  let drag = null;
  let settling = false; // true for a moment while the dropped row slides into place

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

  // ---------- Drag and drop ----------

  // Works out where the dragged row is, which slot it would drop into, and slides
  // the other rows out of the way.
  function updateDrag() {
    const d = drag;
    if (!d) return;

    const y = d.clientY - listEl.getBoundingClientRect().top;
    const dy = y - d.startY;
    d.li.style.transform = "translateY(" + dy + "px) scale(1.02)";

    const centre = d.li.offsetTop + d.li.offsetHeight / 2 + dy;
    let target = 0;
    d.rows.forEach((r) => {
      if (r !== d.li && r.offsetTop + r.offsetHeight / 2 < centre) target++;
    });
    d.target = target;

    d.rows.forEach((r, j) => {
      if (r === d.li) return;
      let shift = 0;
      if (d.from < target && j > d.from && j <= target) shift = -d.shift;
      else if (d.from > target && j >= target && j < d.from) shift = d.shift;
      r.style.transform = shift ? "translateY(" + shift + "px)" : "";
    });
  }

  // Scrolls the page while she holds a row near the top or bottom edge.
  function autoScroll() {
    const d = drag;
    if (!d) return;

    const zone = 80;
    const topLine = (header ? header.getBoundingClientRect().bottom : 0) + zone;
    const bottomLine = window.innerHeight - zone;
    let speed = 0;
    if (d.clientY < topLine) speed = -Math.min(22, ((topLine - d.clientY) / zone) * 16 + 2);
    else if (d.clientY > bottomLine) speed = Math.min(22, ((d.clientY - bottomLine) / zone) * 16 + 2);

    if (speed) {
      const before = window.scrollY;
      window.scrollBy(0, speed);
      if (window.scrollY !== before) updateDrag();
    }
    d.raf = requestAnimationFrame(autoScroll);
  }

  function endDrag(commit) {
    const d = drag;
    if (!d) return;
    drag = null;
    cancelAnimationFrame(d.raf);
    try { d.grip.releasePointerCapture(d.pointerId); } catch (e) { /* already released */ }

    if (!commit || d.target === d.from) {
      render();
      return;
    }

    // Slide the dragged row into its slot, then save and redraw.
    const slotTop = d.target > d.from
      ? d.rows[d.target].offsetTop + d.rows[d.target].offsetHeight - d.li.offsetHeight
      : d.rows[d.target].offsetTop;
    d.li.style.transition = "transform .12s ease";
    d.li.style.transform = "translateY(" + (slotTop - d.li.offsetTop) + "px)";
    settling = true;
    setTimeout(() => {
      settling = false;
      Store.moveItemTo(storeId, d.id, d.target);
      render();
    }, 130);
  }

  function attachDrag(grip, li, item) {
    // Stop Android's long-press menu from appearing on the handle.
    grip.addEventListener("contextmenu", (e) => e.preventDefault());

    // Keyboard / assistive-tech alternative: up and down arrows move one step.
    grip.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      Store.moveItem(storeId, item.id, e.key === "ArrowUp" ? -1 : 1);
      render();
      const row = Array.from(listEl.children).find((r) => r.dataset.id === item.id);
      const again = row && row.querySelector(".drag-handle");
      if (again) again.focus();
    });

    grip.addEventListener("pointerdown", (e) => {
      if (drag || settling) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const rows = Array.from(listEl.children);
      const from = rows.indexOf(li);
      if (from < 0) return;
      e.preventDefault();

      const gap = parseFloat(getComputedStyle(listEl).rowGap) || 0;
      drag = {
        id: item.id, grip, li, rows, from, target: from,
        pointerId: e.pointerId,
        shift: li.offsetHeight + gap,
        startY: e.clientY - listEl.getBoundingClientRect().top,
        clientY: e.clientY,
        raf: 0
      };
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }

      listEl.classList.add("is-sorting");
      rows.forEach((r) => { if (r !== li) r.classList.add("is-shifting"); });
      li.classList.add("is-dragging");
      drag.raf = requestAnimationFrame(autoScroll);
    });

    grip.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag.clientY = e.clientY;
      updateDrag();
    });

    grip.addEventListener("pointerup", (e) => {
      if (drag && e.pointerId === drag.pointerId) endDrag(true);
    });

    grip.addEventListener("pointercancel", (e) => {
      if (drag && e.pointerId === drag.pointerId) endDrag(false);
    });
  }

  function arrangeRow(item) {
    const li = document.createElement("li");
    li.className = "item-row arrange-row";
    li.dataset.id = item.id;

    const grip = document.createElement("button");
    grip.type = "button";
    grip.className = "drag-handle";
    grip.setAttribute("aria-label", "Move " + item.name + ": drag it, or use the up and down arrow keys");
    const bars = document.createElement("span");
    bars.className = "grip-bars";
    bars.setAttribute("aria-hidden", "true");
    grip.appendChild(bars);
    attachDrag(grip, li, item);

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = item.name;

    const del = makeButton("item-delete", "✕", "Remove " + item.name, () => {
      Store.removeItem(storeId, item.id);
      render();
    });

    li.append(grip, label, del);
    return li;
  }

  function render() {
    const items = Store.getItems(storeId);
    const trip = Store.getTrip(storeId);

    listEl.replaceChildren();
    listEl.classList.remove("is-sorting");
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
      : "Next Shop";
    newListBtn.disabled = items.length === 0 && trip.length === 0;

    items.forEach((item) => {
      listEl.appendChild(arranging ? arrangeRow(item) : plainRow(item));
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
    if (drag || settling) return;
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
    if (drag) { cancelAnimationFrame(drag.raf); drag = null; }
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
