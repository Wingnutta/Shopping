// UI layer: supermarkets screen + simple navigation between screens.
// Opening a supermarket sets the URL hash (#store/<id>) and its trip list is
// #trip/<id>, so the Android back button / swipe steps back one screen.
(function () {
  const form = document.getElementById("add-form");
  const input = document.getElementById("store-name");
  const errorEl = document.getElementById("form-error");
  const listEl = document.getElementById("store-list");
  const emptyEl = document.getElementById("empty-state");

  const homeView = document.getElementById("home-view");
  const listView = document.getElementById("list-view");
  const tripView = document.getElementById("trip-view");
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

  let backTarget = "#"; // where Back goes if there is no browser history to return to

  function showScreen(which) {
    homeView.hidden = which !== "home";
    listView.hidden = which !== "list";
    tripView.hidden = which !== "trip";
    backBtn.hidden = which === "home";
    titleEl.textContent = "Shopping";
  }

  function showHome() {
    backTarget = "#";
    showScreen("home");
    render(); // counts/names may have changed
  }

  function showList(id) {
    if (!Lists.open(id)) {
      showHome();
      return;
    }
    backTarget = "#";
    showScreen("list");
    window.scrollTo(0, 0);
  }

  function showTrip(id) {
    if (!Trip.open(id)) {
      showHome();
      return;
    }
    backTarget = "#store/" + id;
    showScreen("trip");
    window.scrollTo(0, 0);
  }

  function route() {
    const store = location.hash.match(/^#store\/(.+)$/);
    const trip = location.hash.match(/^#trip\/(.+)$/);
    if (store) showList(store[1]);
    else if (trip) showTrip(trip[1]);
    else showHome();
  }

  backBtn.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.replace(backTarget);
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
