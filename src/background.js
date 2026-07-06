/*
 * Daylight background service worker.
 *
 * One job: when the extension is installed or updated, inject the content
 * script into tabs that are already open. Chrome only auto-injects content
 * scripts on navigation, so without this, users would have to reload every
 * tab before Daylight worked there.
 */
chrome.runtime.onInstalled.addListener(function () {
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, function (tabs) {
    if (chrome.runtime.lastError || !tabs) return;
    tabs.forEach(function (tab) {
      if (tab.id === undefined) return;
      chrome.scripting
        .executeScript({ target: { tabId: tab.id }, files: ["src/content.js"] })
        .catch(function () {
          /* tab went away or is restricted (web store, etc.); fine */
        });
    });
  });
});
