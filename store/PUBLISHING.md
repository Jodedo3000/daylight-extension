# Publishing Daylight to the Chrome Web Store

A one-time walkthrough. Budget ~30 minutes, most of which is the developer-account setup and screenshots.

## 0. What you'll need

- A Google account (your `jdommnich@googlemail.com` is fine).
- A **one-time US$5** developer registration fee (Google's anti-spam charge, not a subscription).
- The upload zip: `daylight.zip` (build command in the repo README).
- One or more screenshots at **1280×800** or **640×400** (see step 3).

## 1. Register as a Chrome Web Store developer

1. Go to <https://chrome.google.com/webstore/devconsole>.
2. Sign in, accept the developer agreement, and pay the US$5 fee once.
3. You now have a **Developer Dashboard**.

## 2. Create the item and upload

1. In the dashboard click **Add new item**.
2. Upload `daylight.zip`. The dashboard reads `manifest.json` and pre-fills name, version, and description.

## 3. Fill in the store listing

Copy from [`listing.md`](listing.md):

- **Description** — paste the long description.
- **Category** — Accessibility (best fit) or Productivity.
- **Language** — English.
- **Icon** — the 128px icon is taken from the package automatically.
- **Screenshots** — at least one, 1280×800 PNG/JPEG. Easiest approach:
  1. Open a dark site (e.g. the one that prompted this), click the extension, turn it on.
  2. Take a before/after screenshot. macOS: `Cmd+Shift+4`, then resize/pad to 1280×800 in Preview if needed.
  3. A single clear before/after shot is enough to pass review; up to 5 are allowed.
- **Small promo tile** (440×280) is optional; skip it for a first release.

## 4. Privacy & permissions (the part reviewers care about)

- **Single purpose**: "Let users turn off a website's dark mode and view it in a light theme." Paste that verbatim.
- **Permission justification** — from [`listing.md`](listing.md):
  - `storage`: "Save each site's on/off preference so it persists and syncs."
  - Host access (`<all_urls>`): "The user chooses which sites to lighten; the extension must be able to run on any site the user visits to apply their choice."
- **Data usage**: tick that you do **not** collect or use any user data. Daylight has no analytics, no network calls, no accounts. All three data-use certification checkboxes apply (no sale, no unrelated use, no creditworthiness use).
- **Privacy policy URL**: required whenever host permissions are requested. Host the text in [`privacy-policy.md`](privacy-policy.md) somewhere public (a GitHub repo file, a GitHub Pages page, or a Gist) and paste that URL.

## 5. Submit

1. Set **Visibility** to Public.
2. Click **Submit for review**.
3. Review for a simple, low-permission extension like this is usually **a few hours to a few days**. You'll get an email on approval or if they need changes.

## 6. After approval

- The listing goes live at a `chromewebstore.google.com/detail/...` URL you can share.
- To ship an update: bump `"version"` in `manifest.json`, rebuild the zip, upload it under the same item, and submit again.

## Common rejection reasons (and how this avoids them)

| Reason | Status here |
| --- | --- |
| Requests permissions it doesn't use | Only `storage` + host access, both justified. |
| Missing privacy policy with host permissions | Provided in `privacy-policy.md`. |
| Vague single purpose | Single, specific purpose stated above. |
| Obfuscated/minified code review issues | Source is plain, readable, unminified. |
