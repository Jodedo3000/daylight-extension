/*
 * Daylight content script.
 *
 * Runs at document_start on the top frame of every site. Decides whether this
 * page should be forced light, then injects (or removes) a <style> tag. Stays
 * live: toggling settings in the popup updates open tabs instantly.
 *
 * Decision order:
 *   1. Explicit per-site setting (on or off) always wins.
 *   2. Otherwise, if auto mode is on (the default), detect whether the page is
 *      actually dark and lighten it only then. Light pages are left alone.
 *
 * Two strategies:
 *   - "force"  : invert the whole document, then re-invert images/video/canvas
 *                so photos keep their real colours. Works even when the site
 *                hard-codes its dark theme, which a content script cannot
 *                rewrite any other way.
 *   - "gentle" : declare color-scheme: light. Only helps sites that go dark
 *                because they follow the OS setting.
 */
(function () {
  "use strict";

  var STYLE_ID = "daylight-style";
  var host = location.hostname;
  var appliedMode = null;
  var settings = { sites: {}, auto: true };
  var detectTimers = [];

  // The invert recipe. The black html background inverts to white so areas the
  // site never painted come out light. hue-rotate(180deg) after invert keeps
  // hues roughly correct instead of turning blues into oranges. Media elements
  // get the same filter again so it cancels out and they display normally.
  var FORCE_CSS = [
    "html{",
    "  background-color:#000 !important;",
    "  filter:invert(1) hue-rotate(180deg) !important;",
    "}",
    "img,picture,video,canvas,embed,object,iframe,",
    "[style*='background-image']{",
    "  filter:invert(1) hue-rotate(180deg) !important;",
    "}"
  ].join("\n");

  var GENTLE_CSS = ":root{color-scheme:light !important;}";

  function apply(mode) {
    var root = document.documentElement;
    if (!root) return;
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      root.appendChild(style);
    }
    style.textContent = mode === "gentle" ? GENTLE_CSS : FORCE_CSS;
    // Keep the tag last so late-loading site styles don't override it.
    if (root.lastElementChild !== style) root.appendChild(style);
    appliedMode = mode;
  }

  function remove() {
    var style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    appliedMode = null;
  }

  /* ---------- dark-page detection (for auto mode) ---------- */

  function parseColor(str) {
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/.exec(str || "");
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }

  function luminance(c) {
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }

  // Find the backdrop the reader actually sees: probe the elements stacked at a
  // point in the upper page (catches full-page dark wrapper divs that body
  // misses), then fall back to body and html.
  function pageLooksDark() {
    var probes = [];
    try {
      probes = document.elementsFromPoint(
        window.innerWidth / 2,
        Math.min(window.innerHeight / 2, 300)
      );
    } catch (e) {}
    probes = probes.concat([document.body, document.documentElement]);
    for (var i = 0; i < probes.length; i++) {
      var el = probes[i];
      if (!el || el.id === STYLE_ID) continue;
      var c = parseColor(getComputedStyle(el).backgroundColor);
      if (c && c.a > 0.4) return luminance(c) < 0.45;
    }
    // Nothing painted a background: the canvas colour decides. It is dark only
    // if the site opted into a dark colour scheme and the OS prefers dark.
    var scheme = getComputedStyle(document.documentElement).colorScheme || "";
    return (
      scheme.indexOf("dark") !== -1 &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  function clearTimers() {
    detectTimers.forEach(clearTimeout);
    detectTimers = [];
  }

  function detect() {
    if (!settings.auto || settings.sites[host]) return;
    if (!document.body) return;
    // The filter doesn't change computed background colours, so a page we
    // already lightened still probes dark. Detection is stable once applied.
    if (pageLooksDark()) {
      if (appliedMode !== "force") apply("force");
    }
  }

  // Detect now, then twice more: many sites apply their dark theme from
  // JavaScript a moment after the HTML arrives.
  function scheduleDetect() {
    clearTimers();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", detect, { once: true });
    } else {
      detect();
    }
    detectTimers.push(setTimeout(detect, 600), setTimeout(detect, 1800));
  }

  /* ---------- decision + wiring ---------- */

  function decide() {
    clearTimers();
    var s = settings.sites[host];
    if (s) {
      if (s.enabled) apply(s.mode === "gentle" ? "gentle" : "force");
      else remove();
      return;
    }
    if (!settings.auto) {
      remove();
      return;
    }
    scheduleDetect();
  }

  function sync() {
    try {
      chrome.storage.sync.get(["sites", "auto"], function (data) {
        if (chrome.runtime.lastError) return;
        settings.sites = (data && data.sites) || {};
        settings.auto = !data || data.auto !== false; // default: on
        decide();
      });
    } catch (e) {
      /* extension context invalidated on reload; ignore */
    }
  }

  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "sync" && (changes.sites || changes.auto)) sync();
    });
  } catch (e) {}

  // Let the popup ask what is actually happening on this page.
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (msg && msg.type === "daylight-status") {
        sendResponse({ applied: !!appliedMode, mode: appliedMode || "force" });
      }
    });
  } catch (e) {}

  // If the site's own scripts strip our style tag, put it back.
  function guard() {
    new MutationObserver(function () {
      if (appliedMode && !document.getElementById(STYLE_ID)) apply(appliedMode);
    }).observe(document.documentElement, { childList: true });
  }

  sync();
  if (document.documentElement) guard();
  else document.addEventListener("DOMContentLoaded", guard, { once: true });
})();
