/*
 * Popup UI for Daylight.
 *
 * The site toggle reflects reality: with no explicit setting saved, it asks the
 * content script what is actually applied on the page right now (auto mode may
 * or may not have lightened it). Touching the toggle saves an explicit per-site
 * setting; "Reset to automatic" deletes it again.
 */
(function () {
  "use strict";

  var siteEl = document.getElementById("site");
  var enabledEl = document.getElementById("enabled");
  var noteEl = document.getElementById("note");
  var toggleRow = document.getElementById("toggleRow");
  var resetEl = document.getElementById("reset");
  var autoEl = document.getElementById("auto");

  var host = null;
  var tabId = null;

  function hostFromUrl(url) {
    try {
      var u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.hostname;
    } catch (e) {
      return null;
    }
  }

  function showNote(text) {
    noteEl.textContent = text;
    noteEl.hidden = false;
  }

  function render(enabled, explicit) {
    enabledEl.checked = !!enabled;
    resetEl.hidden = !explicit;
  }

  // Ask the page what is actually applied right now. Fails harmlessly on pages
  // where the content script never ran.
  function queryStatus(cb) {
    if (tabId === null) return cb(null);
    try {
      chrome.tabs.sendMessage(tabId, { type: "daylight-status" }, function (res) {
        if (chrome.runtime.lastError || !res) return cb(null);
        cb(res);
      });
    } catch (e) {
      cb(null);
    }
  }

  function refreshSiteState() {
    chrome.storage.sync.get("sites", function (data) {
      var sites = (data && data.sites) || {};
      var s = sites[host];
      if (s) {
        render(s.enabled, true);
      } else {
        queryStatus(function (status) {
          render(status && status.applied, false);
        });
      }
    });
  }

  function saveSite() {
    if (!host) return;
    var setting = { enabled: enabledEl.checked };
    chrome.storage.sync.get("sites", function (data) {
      var sites = (data && data.sites) || {};
      sites[host] = setting;
      chrome.storage.sync.set({ sites: sites });
    });
    render(setting.enabled, true);
  }

  function resetSite() {
    if (!host) return;
    chrome.storage.sync.get("sites", function (data) {
      var sites = (data && data.sites) || {};
      delete sites[host];
      chrome.storage.sync.set({ sites: sites }, function () {
        // Auto mode re-detects asynchronously; give it a beat before reading.
        setTimeout(refreshSiteState, 400);
      });
    });
    resetEl.hidden = true;
  }

  function saveAuto() {
    chrome.storage.sync.set({ auto: autoEl.checked });
    if (host) setTimeout(refreshSiteState, 400);
  }

  function load() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs && tabs[0];
      host = tab ? hostFromUrl(tab.url) : null;
      tabId = tab ? tab.id : null;

      chrome.storage.sync.get("auto", function (data) {
        autoEl.checked = !data || data.auto !== false; // default: on
      });

      if (!host) {
        siteEl.textContent = "Unavailable here";
        enabledEl.disabled = true;
        toggleRow.style.opacity = "0.5";
        toggleRow.style.pointerEvents = "none";
        showNote("Daylight works on normal web pages, not on browser or extension pages.");
        return;
      }

      siteEl.textContent = host;
      refreshSiteState();
    });
  }

  enabledEl.addEventListener("change", saveSite);
  resetEl.addEventListener("click", resetSite);
  autoEl.addEventListener("change", saveAuto);

  load();
})();
