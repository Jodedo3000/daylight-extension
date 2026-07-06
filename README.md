# Daylight: Turn Off Dark Mode

A tiny, free Chrome extension that turns dark websites light. No sign-up, no tracking, no monetization.

Install it and dark sites simply turn light. Auto mode detects any page with a dark background and lightens it. The toolbar popup lets you override per site in either direction, keep one site dark, force another light, and those choices are remembered.

## How it works

A content script runs on every page and decides what to do:

1. An explicit per-site setting (from the popup) always wins.
2. Otherwise, if auto mode is on (the default), it probes the page's real background colour. Dark pages get lightened; light pages are left untouched. It re-checks briefly after load because many sites apply their dark theme from JavaScript.

Two lightening methods:

- **Force light** (default) inverts the whole document and re-inverts images, video, and canvases so photos keep their real colours. This is the reliable option because a browser extension cannot rewrite a site's own dark-theme CSS. Inverting sidesteps that entirely.
- **Gentle** declares `color-scheme: light`. Cleaner, but only helps sites that go dark solely because they follow your system theme.

Settings live in `chrome.storage.sync`, so they follow you across signed-in Chrome installs. Nothing leaves your browser.

## Install locally (for testing)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder (`DisableDarkMode`).
4. Visit any dark site. It should turn light on its own. Use the sun icon to override.

## Files

| Path | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest. Only permission requested is `storage`. |
| `src/content.js` | Detection, decision, and CSS injection; updates live. |
| `src/popup.*` | Toolbar popup UI. |
| `icons/` | Generated sun icons (16/48/128). |
| `scripts/make-icons.js` | Regenerates the icons: `node scripts/make-icons.js`. |
| `store/` | Chrome Web Store listing text and publishing guide. |

## Publishing

See [`store/PUBLISHING.md`](store/PUBLISHING.md) for the full Chrome Web Store walkthrough.

## Rebuild the upload zip

```
node scripts/make-icons.js   # only if you changed the icon
zip -r -X daylight.zip manifest.json src icons -x '.*'
```

## Licence

MIT. Do whatever you like with it.
