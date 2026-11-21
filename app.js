// UI layer: supermarkets screen + simple navigation between screens.
// Opening a supermarket sets the URL hash (#store/<id>) and its trip list is
// #trip/<id>, so the Android back button / swipe steps back one screen.
// On the supermarket and trip screens the header banner takes that chain's colours
// (see supermarkets.js); the home screen keeps the plain green banner.
(function () {
  const form = document.getElementById("add-form");
  const chainSelect = document.getElementById("store-chain");
  const input = document.getElementById("store-name");
  const errorEl = document.getElementById("form-error");
  const listEl = document.getElementById("store-list");
  const emptyEl = document.getElementById("empty-state");

  const homeView = document.getElementById("home-view");
  const listView = document.getElementById("list-view");
  const tripView = document.getElementById("trip-view");
  const backBtn = document.getElementById("back-btn");
  const titleEl = document.getElementById("app-title");
  const headerEl = document.querySelector(".app-header");
  const badgeEl = document.getElementById("app-badge");
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function showError(msg) {
    errorEl.textContent = msg || "";
    errorEl.hidden = !msg;
  }

  // ---------- Banner colours ----------

  // First letter of a name, for the round badge.
  function initial(name) {
    const first = Array.from(String(name).trim())[0];
    return first ? first.toUpperCase() : "?";
  }

  // Fill a round badge: the chain's logo if it has one, otherwise the first letter.
  // If the logo file fails to load, the letter is shown instead.
  function fillBadge(el, name, theme) {
    el.replaceChildren();
    el.classList.remove("has-logo");
    if (theme.logo) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = theme.logo;
      img.addEventListener("error", () => {
        el.classList.remove("has-logo");
        el.textContent = initial(name);
      });
      el.classList.add("has-logo");
      el.appendChild(img);
      return;
    }
    el.textContent = initial(name);
  }

  // store = the supermarket being shown, or null for the home screen (plain green).
  // Sets --banner-bg / --banner-fg (header) and --accent (buttons, ticks) on the page.
  function applyBanner(store) {
    const root = document.documentElement;
    const theme = store ? Chains.themeFor(store) : Chains.DEFAULT;
    if (store) {
      root.style.setProperty("--banner-bg", theme.bg);
      root.style.setProperty("--banner-fg", theme.fg);
      root.style.setProperty("--accent", theme.accent);
      fillBadge(badgeEl, store.name, theme);
    } else {
      root.style.removeProperty("--banner-bg");
      root.style.removeProperty("--banner-fg");
      root.style.removeProperty("--accent");
      badgeEl.replaceChildren();
      badgeEl.classList.remove("has-logo");
    }
    badgeEl.hidden = !store;
    headerEl.classList.toggle("is-branded", !!store);
    if (themeMeta) themeMeta.setAttribute("content", theme.bg); // phone status bar
  }

  // ---------- Supermarkets screen ----------

  // Dropdown: every chain not added yet, then "Other…". Keeps the current choice.
  function fillChainOptions(stores) {
    const takenNames = new Set(stores.map((s) => s.name.toLowerCase()));
    const takenKeys = new Set(stores.map((s) => s.chain).filter(Boolean));
    const keep = chainSelect.value;

    chainSelect.replaceChildren(new Option("Choose a supermarket…", ""));
    Chains.all().forEach((c) => {
      if (takenNames.has(c.name.toLowerCase()) || takenKeys.has(c.key)) return;
      chainSelect.appendChild(new Option(c.name, c.key));
    });
    chainSelect.appendChild(new Option("Other…", "other"));

    chainSelect.value = keep;
    if (chainSelect.selectedIndex < 0) chainSelect.value = "";
    syncNameBox();
  }

  // The name box only shows for "Other…".
  function syncNameBox() {
    const other = chainSelect.value === "other";
    input.hidden = !other;
    input.required = other;
    if (!other) input.value = "";
  }

  function render() {
    const stores = Store.getSupermarkets();
    listEl.replaceChildren();
    emptyEl.hidden = stores.length > 0;
    fillChainOptions(stores);

    stores.forEach((s) => {
      const theme = Chains.themeFor(s);
      const li = document.createElement("li");
      li.style.setProperty("--card-bg", theme.bg);
      li.style.setProperty("--card-fg", theme.fg);

      const open = document.createElement("button");
      open.type = "button";
      open.className = "store-open";
      open.addEventListener("click", () => openStore(s));

      const badge = document.createElement("span");
      badge.className = "store-badge";
      badge.setAttribute("aria-hidden", "true");
      fillBadge(badge, s.name, theme);

      const text = document.createElement("span");
      text.className = "store-text";
      const nameEl = document.createElement("span");
      nameEl.className = "store-name";
      nameEl.textContent = s.name; // textContent keeps user input safe
      const count = (s.items || []).length;
      const countEl = document.createElement("span");
      countEl.className = "store-count";
      countEl.textContent = count ? count + (count === 1 ? " item" : " items") : "No items yet";
      text.append(nameEl, countEl);

      open.append(badge, text);

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

  // store = the supermarket on screen (list / trip screens), null on the home screen.
  function showScreen(which, store) {
    homeView.hidden = which !== "home";
    listView.hidden = which !== "list";
    tripView.hidden = which !== "trip";
    backBtn.hidden = which === "home";
    titleEl.textContent = store ? store.name : "Shopping";
    applyBanner(store || null);
  }

  function showHome() {
    backTarget = "#";
    showScreen("home", null);
    render(); // counts/names may have changed
  }

  function showList(id) {
    if (!Lists.open(id)) {
      showHome();
      return;
    }
    backTarget = "#";
    showScreen("list", Store.getSupermarket(id));
    window.scrollTo(0, 0);
  }

  function showTrip(id) {
    if (!Trip.open(id)) {
      showHome();
      return;
    }
    backTarget = "#store/" + id;
    showScreen("trip", Store.getSupermarket(id));
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

  chainSelect.addEventListener("change", () => {
    showError("");
    syncNameBox();
    if (chainSelect.value === "other") input.focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const choice = chainSelect.value;
    let result;

    if (choice === "other") {
      // A shop typed by hand. If the name is a known chain, it still gets that chain's colours.
      const match = Chains.byName(input.value);
      result = Store.addSupermarket(input.value, match ? match.key : null);
    } else {
      const chain = Chains.byKey(choice);
      if (!chain) {
        showError("Please choose a supermarket.");
        return;
      }
      result = Store.addSupermarket(chain.name, chain.key);
    }

    if (!result.ok) {
      showError(result.error);
      return;
    }
    showError("");
    chainSelect.value = "";
    syncNameBox();
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
