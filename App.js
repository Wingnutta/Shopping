// UI layer
(function () {
  const form = document.getElementById("add-form");
  const input = document.getElementById("store-name");
  const errorEl = document.getElementById("form-error");
  const listEl = document.getElementById("store-list");
  const emptyEl = document.getElementById("empty-state");

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

  // Placeholder: later this will open the shopping list for that supermarket.
  function openStore(store) {
    alert(store.name + " – lists coming soon!");
  }

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

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();