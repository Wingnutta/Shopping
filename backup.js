// Backup UI on the home screen: save everything to a file, or restore from one.
// All data checking lives in store.js (Store.parseBackup); this file only does buttons.
// After a restore it fires "shopping:data-changed" so app.js redraws the home screen.
(function () {
  const saveBtn = document.getElementById("backup-save");
  const shareBtn = document.getElementById("backup-share");
  const restoreBtn = document.getElementById("backup-restore");
  const fileInput = document.getElementById("backup-file");
  const statusEl = document.getElementById("backup-status");
  const msgEl = document.getElementById("backup-msg");
  if (!saveBtn || !restoreBtn || !fileInput) return;

  function pad(n) { return String(n).padStart(2, "0"); }

  function fileName() {
    const d = new Date();
    return "shopping-backup-" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + ".json";
  }

  function niceDate(ms) {
    return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function say(text, isError) {
    msgEl.textContent = text || "";
    msgEl.hidden = !text;
    msgEl.classList.toggle("is-error", !!isError);
  }

  function showStatus() {
    const last = Store.getLastBackup();
    statusEl.textContent = last
      ? "Last backup: " + niceDate(last)
      : "No backup saved yet. Save one and keep the file somewhere safe.";
  }

  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  // ---------- Save ----------

  function makeFile() {
    return new File([Store.exportData()], fileName(), { type: "application/json" });
  }

  saveBtn.addEventListener("click", () => {
    const file = makeFile();
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    Store.markBackup();
    showStatus();
    say("Backup saved as " + file.name + " (check your Downloads).");
  });

  // Share (WhatsApp, Drive, email...) only appears if this phone can share files.
  try {
    const probe = makeFile();
    if (navigator.canShare && navigator.canShare({ files: [probe] })) shareBtn.hidden = false;
  } catch (e) { /* no sharing here */ }

  shareBtn.addEventListener("click", async () => {
    try {
      await navigator.share({ files: [makeFile()], title: "Shopping backup" });
      Store.markBackup();
      showStatus();
      say("");
    } catch (e) {
      if (e && e.name !== "AbortError") say("Could not share the backup. Try Save instead.", true);
    }
  });

  // ---------- Restore ----------

  restoreBtn.addEventListener("click", () => {
    say("");
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = ""; // so choosing the same file again still triggers "change"
    if (!file) return;

    let raw;
    try { raw = await file.text(); } catch (e) { say("Could not read that file.", true); return; }

    const result = Store.parseBackup(raw);
    if (!result.ok) { say(result.error, true); return; }

    const when = result.exportedAt && !isNaN(Date.parse(result.exportedAt))
      ? " from " + niceDate(Date.parse(result.exportedAt)) : "";
    const ok = confirm(
      "Restore the backup" + when + " (" + plural(result.stores, "supermarket") + ", " +
      plural(result.items, "item") + ")?\n\nThis replaces everything on this phone now."
    );
    if (!ok) return;

    if (!Store.restoreData(result.data)) { say("Could not save on this device.", true); return; }
    say("Backup restored: " + plural(result.stores, "supermarket") + ", " + plural(result.items, "item") + ".");
    window.dispatchEvent(new Event("shopping:data-changed"));
  });

  showStatus();
})();
