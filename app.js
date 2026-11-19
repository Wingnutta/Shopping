// UI layer: supermarkets screen + simple navigation between screens.
// Opening a supermarket sets the URL hash (#store/<id>), so the Android
// back button / swipe returns to the supermarkets screen.
(function () {
  const form = document.getElementById("add-form");
  const input = document.getElementById("store-name");
  const errorEl = document.getElementById("form-error");
  const listEl = document.getElementById("store-list");
  const emptyEl = document.getElementById("empty-state");

  const homeView = document.getElementById("home-view");
  const listView = document.getElementById("list-view");
  const backBtn = document.getElementById("back-btn");
  const titleEl = document.getElementById("app-title");

  function showError(msg) {
    errorEl.textContent = msg || "";
    errorEl.hidden = !msg;
  }

  function render() {
    const stores = Store.getSupermarkets();
    listEl.replaceChildren();
    emptyEl.hidden = stores.length > 0;

    stores.forEach((s) => {
      const li = document.createElement("li");

      const open = document.createElement("button");
      open.type = "button";
      open.className = "store-open";
      open.textContent = s.name; // textContent keeps user input safe
      open.addEventListener("click", () => openStore(s));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "store-delete";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Remove " + s.name);
      del.addEventListener("click", () => {
        if (confirm("Remove " + s.name + "?")) {
          Store.removeSupermarket(s.id);
          render();
        }
      });

      li.append(open, del);
      listEl.appendChild(li);
    });
  }

  function openStore(store) {
    location.hash = "#store/" + store.id;
  }

  // ---------- Navigation ----------

  function showHome() {
    listView.hidden = true;
    homeView.hidden = false;
    backBtn.hidden = true;
    titleEl.textContent = "Shopping";
    render(); // counts/names may have changed
  }

  function showList(id) {
    if (!Lists.open(id)) {
      showHome();
      return;
    }
    homeView.hidden = true;
    listView.hidden = false;
    backBtn.hidden = false;
    titleEl.textContent = "Shopping";
    window.scrollTo(0, 0);
  }

  function route() {
    const match = location.hash.match(/^#store\/(.+)$/);
    if (match) showList(match[1]);
    else showHome();
  }

  backBtn.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.replace("#");
  });

  window.addEventListener("hashchange", route);

  // ---------- Add supermarket form ----------

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = Store.addSupermarket(input.value);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    showError("");
    input.value = "";
    render();
  });

  input.addEventListener("input", () => showError(""));

  route();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
