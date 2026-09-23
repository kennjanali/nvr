# Static Website Audit — Nature's Village Resort

**Audit date:** 2026-08-23
**Auditor:** Claude Code (automated + manual inspection)
**Scope:** `c:\dev\nvr-custom` — 11 static HTML pages, one stylesheet, one script, media assets, `.htaccess`, `robots.txt`, `sitemap.xml`, restaurant menu PDF
**Status:** Audit complete. **Fix passes 1 and 2 applied and verified on 2026-08-23** — the five "Fix first" findings (H-01…H-05) plus one defect found during verification (§0), then the /testimonials/ live-reviews integration, which also closed M-11 and M-12 (§0b). Everything from Medium down is untouched and still open.

---

## 0. Fix log — pass 1 (2026-08-23, approved: "Fix first")

| ID | Finding | Change | Verified |
|---|---|---|---|
| **H-01** | Forms stayed visible after a successful send | `styles.css` — added `.events-form[hidden] { display: none; }` and `.contact-form[hidden] { display: none; }`, matching the `[hidden]` guard the sheet's other 13 toggled components already carry | Both forms submitted with the endpoint mocked 200: `display:none`, form height **735px → 0** and **778px → 0**, success panel present, focus on the panel. Screenshots `fix-success-*.png` |
| **H-02** | CSP blocked the menu viewer's own PDF fallback | `.htaccess` — `frame-src https://www.google.com` → `frame-src 'self' https://www.google.com`, with a comment recording why `'self'` is load-bearing | Reproduced `useEmbed()` under the policy read verbatim from `.htaccess`: **0 CSP messages, iframe `load` fired** (was: "Framing … has been blocked"). All 11 pages still CSP-clean; the Google Maps frame on `/contact/` still renders (420px) |
| **H-03** | 36.9 MB hero video with `preload="auto"` | Ran `qa/encode-hero-video.ps1` → `assets/video/nvr-hero.mp4`; `index.html` now points at it with `data-hero-video-start="0"` | 1280×720, 25fps, yuv420p, 20s, **no audio track**, `moov` at byte 36 before `mdat` (faststart confirmed). Plays: `readyState 4`, `currentTime` advancing, `loop`, `muted`, `is-ready`, `has-hero-video`, poster retained, `aria-hidden`, `tabIndex -1`. Fetched **once (200)** — was four requests (200 / ERR_ABORTED / 200 / 206). Homepage transfer **≈38.6 MB → 8.0 MB** |
| **H-04** | No adequate focus indicator on form fields | `styles.css` — removed `outline: none` from `.events-field …:focus` and `.contact-field …:focus`, so the site-wide `--nvr-brass-ink` ring applies; the brass underline stays as decoration | **16/16 fields** across both forms now show `solid 2px rgb(92,107,40)` at `3px` offset — 5.77:1, above the 3:1 of WCAG 1.4.11 (was `outline-style: none` + a 2.16–2.37:1 underline). Screenshot `fix-focus-input.png` |
| **H-05** | Venue modal CTA jumped behind the still-open modal | `custom.js` — `#roommodal-cta` now intercepts same-page hash CTAs: clears the focus-restore target, closes the dialog, then focuses and smooth-scrolls to the destination. Cross-page and external CTAs and modified clicks are untouched | Salvacion Hall → "Enquire About This Venue": modal `hidden`, off-screen, **scroll lock released**, `#enquire` at 84px from the top and in view, focus on `#enquire`, scrollY 1696 → 6121, 0 page errors. Regressions clean: booking CTA still `_blank`+`noopener`, Escape still closes and restores focus to the card |
| **new** | *(found while verifying)* `/dev/` hero background never loaded — `.dev-hero` pointed at `../images/Restaurant/the-village-restaurant-22.webp`, but the file is in `Restaurant/Food/`. Also `dev.html` preloaded the **Home** hero, which `.dev-hero` never paints | `styles.css` — corrected the path (the image is intentional; confirmed with the owner). `dev.html` — preload now names the image the page actually paints | `/dev/` back to **0 console errors, 0 failed requests** (was 1× HTTP 404 + the "preloaded but not used" warning). Background renders |

**Cache-busters** were bumped so the changes actually ship: `custom.js?v=20260821` → `?v=20260823` on all 11 pages, matching `styles.css?v=20260823`.

### Regression check after the pass

Re-ran the full evidence sweep. Every baseline number held:

| Check | Before | After |
|---|---|---|
| Console errors / failed requests, 11 pages | 0 / 0 (+1 harness warning) | **0 / 0, no warnings** — the Range warning is gone with the seek |
| Horizontal overflow (11 pages × 5 viewports) | 0 / 55 | **0 / 55** |
| axe violations | 4 rules, 29 nodes, 1 serious | **identical** — no new violations |
| `html-validate` | 247 messages | **247** — no new markup issues |
| Local asset references | *reported 0 missing — see the correction below* | **0 missing**, now including CSS `url()` |
| Internal links + anchors | 0 problems | **0 problems** |
| Duplicate IDs / `h1` per page / unrendered icons / `_blank` without `noopener` | 0 / 1 / 0 / 0 | **identical** |
| `node --check assets/js/custom.js` | — | passes |

### Two corrections to this report

1. **§9 and §12 claimed "0 broken asset references". That was wrong — there was one.** The reference checker resolved `href`/`src`/`poster`/`data-pdf` in HTML but **did not cover CSS `url()`**, so it missed the `.dev-hero` background above. Of 13 local `url()` references in the stylesheet, that one was broken; the other 12 resolve. It is now fixed and the checker covers `url()`, resolved relative to `assets/css/`. Read the "0 broken references" claims in §9/§12 as applying to HTML references only, as originally measured.
2. **H-03's encode landed at 6.7 MB, not the ~2 MB `qa/encode-hero-video.ps1` targets in its own header comment.** The script ran unmodified with its documented knobs (1280px, CRF 26, 20s, 25fps); this footage is high-motion aerial video and settles at ~2.8 Mbps. The finding is resolved — 36.9 MB → 6.7 MB, an 81% cut, fetched once instead of four times — but the target is not met. Closing the remaining 3.4× needs a **quality decision that is the owner's, not mine**: CRF ~32 and/or 960px width would reach ~2 MB at the cost of a visibly softer image, and a shorter `$Duration` trades loop variety for bytes. Left as-is pending that call.

### Notes carried forward from this pass

- The **1080p master** `assets/video/Natures Village Resort.mp4` (36.9 MB) is now referenced by nothing. It was deliberately **not deleted** — it is the source for any future re-encode. Keep it out of the upload, or move it to the `_unused/` folder `.htaccess` already refuses to serve. This is the same call as **M-10**.
- `/dev/` transfer went **1,491 KB → 2,764 KB**, because its hero background now actually loads. The image is `the-village-restaurant-22.webp` at **1.95 MB** — and it is one of the byte-identical duplicate pairs in **M-10** (`-22` = `-46`). Re-encoding it belongs with the **M-08** image pass; it is a weight item, not a defect.

---

## 0b. Fix log — pass 2 (2026-08-23): live reviews on /testimonials/

The owner replaced the twelve hand-kept quote cards on `/testimonials/` with an Elfsight All-in-One Reviews embed, then asked for the orphaned code removed and the embed integrated properly.

### The embed was blocked in production

The snippet loads `https://elfsightcdn.com/platform.js` — the vendor's newer loader host. The homepage widget uses `https://static.elfsight.com/platform/platform.js`, and only that host was allowlisted. `elfsightcdn.com` was in neither `script-src` nor `connect-src`, so under the real policy the script was refused and **the section rendered completely empty** — 0 children, 0px tall. Not a soft failure.

> `Loading the script 'https://elfsightcdn.com/platform.js' violates the following Content Security Policy directive: "script-src 'self' https://unpkg.com …`

`.htaccess` now allows `https://elfsightcdn.com` in both `script-src` and `connect-src`, with the comment block explaining that the two pages use different loader hosts and that missing the loader host empties the section. Both embeds were left on their own host rather than rewriting a working snippet.

### Integration

The snippet was pasted inline, mid-section, with no container: the widget rendered **full-bleed at 1440px from x=0**, ignoring the site's 1240px grid and gutters, and its `<script>` sat in the document flow. It now uses the homepage's exact wiring:

| | Before | After | Homepage (reference) |
|---|---|---|---|
| Widget width / left offset | 1440 / 0 | **1144 / 148** | 1144 / 148 |
| Wrapper | *(none)* | `.nvr-reviews--tall .nvr-reveal` | `.nvr-reviews .nvr-reveal` |
| Container | *(none)* | `.nvr-container` (1240px) | `.nvr-container` (1240px) |
| Script position | inline in `<section>` | last in `<body>` | last in `<body>` |
| Under production CSP | 0 children, 0px | **1 child, 1031px** | renders |

One new CSS rule was added — `.nvr-reviews--tall { min-height: 30rem; }`. The shared `.nvr-reviews` floor is 18rem, tuned to the homepage widget's ~22rem; this one renders near 52rem because it is configured with platform tabs, a rating header and a card grid, so an 18rem floor would have let the section jump about half a screen when it paints. The raised floor still sits deliberately short of the real height, on the same reasoning the original comment gives.

Verified at 390 / 768 / 1440 under the production CSP: renders in all three, **0 CSP violations, 0 page errors, 0 horizontal overflow**, inside the gutters at every width (350px at x=20 on a 390px viewport), and all four `.nvr-reveal` elements fire on scroll.

### Orphaned code removed

| Removed | Where | Why safe |
|---|---|---|
| `.testi-masonry` block — column rules, 2 breakpoints, 2 reveal overrides (16 lines) | `styles.css` | The masonry grid it laid out is gone; 0 occurrences in any HTML |
| `.testi-rating`, `__stars`, `__score`, `__note` blocks (41 lines) | `styles.css` | Removed with the markup below; 0 occurrences in any HTML |
| `.nvr span.testi-rating__score` from the serif-font selector group | `styles.css` line 170 | Last live reference to the removed component |
| JSON-LD `review[]` — 4 hardcoded reviews | `testimonials.html` `<head>` | The quotes they mirrored no longer exist on the page. Also resolves **M-11**: it was self-serving `LocalBusiness` review markup, and one of the four never matched any visible text |
| `.testi-rating` markup — 5 stars, "4.9 / 5", the "Loved by…" note | `testimonials.html` | See below |

`figure.nvr-quote` was **kept** — `/restaurant/` still uses one. So were `.testi-feature`, `.testi-cta` and `.testi-hero`, all still on the page. A full unused-selector sweep now reports **zero orphaned `testi-*` selectors**.

### The rating claim

The widget reports the real aggregate: **4.6 from 13,581 reviews** (Facebook 4.6, Google 4.3, Tripadvisor 3.9, Booking.com 8.4). The hand-coded `4.9 / 5` block sat directly above it — about 130px away on a phone — so the page contradicted itself on one screen. On the owner's decision the block was removed outright rather than re-numbered: the widget already states the rating with its sources and counts, and a second hand-kept figure would only drift again. This closes **M-12**.

### Regression check

| Check | Baseline | After pass 2 |
|---|---|---|
| Console errors / failed requests, 11 pages | 0 / 0 | **0 / 0** |
| Horizontal overflow (11 × 5 viewports) | 0 / 55 | **0 / 55** |
| axe violations | 4 rules, 29 nodes | **identical** |
| `html-validate` | 247 | **247** |
| JSON-LD blocks parse | yes | **yes** (`Resort`, `BreadcrumbList`) |
| `/testimonials/` h1 / duplicate IDs / unrendered icons / empty headings | 1 / 0 / 0 / 0 | **1 / 0 / 0 / 0** |

### Noted, not changed

- **Vendor avatar proxy fails intermittently.** Several requests to `phosphor.utils.elfsightcdn.com/?url=…lh3.googleusercontent.com…` fail while fetching Google reviewer avatars. No CSP violation is reported and `img-src` allows all `https:`, so this is vendor-side — the widget falls back to initial-letter avatars. Recheck on the live domain, where the proxy sees a real referrer. **Requires manual verification.**
- **The widget's own styling is vendor default** — system font, blue "Write a Review" button, gold stars, square cards — and does not follow the site's palette. That is configured in the Elfsight dashboard, not in `styles.css`; overriding it here would mean targeting hashed styled-components class names that change on every vendor release. Change it in the dashboard.
- **`.dev-body` is an unused selector** (`styles.css`, in no HTML). Pre-existing and unrelated to this change — my original §6.4 list of dead selectors missed it. Add it to the **M-16** batch, which now stands at 21 unused selectors.
- The Elfsight widget sets third-party cookies, so `/testimonials/` now joins the homepage under **M-13** (no privacy policy or cookie notice).

---

---

## 0c. Fix log - pass 3 (2026-09-07): re-audit during the 2026 revision batch

Re-ran the audit against the current build (which has since taken Steps 1-2 of
the client revision batch - see `REVISIONS-2026-09.md`). Tooling: axe-core 4.10.2
on WCAG 2.0/2.1/**2.2** A+AA plus best-practice, 66 breakpoint checks
(11 pages x 320/360/390/768/1024/1440), console and request-failure capture,
duplicate IDs, heading order, alt text, in-page anchors, `_blank` safety.

### Correction to method - this report's earlier axe numbers are suspect

The "4 rules, 29 nodes, 1 serious" baseline in section 0 was very likely
**inflated by animation timing**. Running axe without settling the scroll-reveal
animations produced 25 phantom `color-contrast` nodes on `/` and `/restaurant/`
and a phantom `link-in-text-block` on `/press/`; all vanished once animations
were zeroed. A partially transparent element composites toward its background, so
mid-fade contrast readings are meaningless. Evidence that the page really was
still animating: the floating button measured 51x51, 19x19, 33x33 and 0x0 on
consecutive runs, versus a stable 60x60 afterwards.

**Any future axe run on this site must** set `prefers-reduced-motion: reduce`
(the site honours it correctly) **and** zero animation/transition durations,
or the results are not reproducible.

### Fixed in this pass

| ID | Finding | Sev | Change |
|---|---|---|---|
| **new** | `heading-order` on `/accommodations/`. A **regression introduced by revision R-01**, which removed the page's only `<h2>`, leaving `h1` -> `h3`. | moderate | 7 `.nvr-card__title` from `h3` to `h2`. Class-styled, not tag-styled, so visually identical. |
| **L-15** | `region` - the FAB was `document.body.appendChild`, outside every landmark, on all 11 pages. | moderate | `custom.js` `initFab` now wraps it in `<aside class="nvr-fab-region" aria-label="Book a stay">`. Wrapper measures 0px (the button is `position:fixed`), so layout is untouched. Closes L-15. |
| **new** | `/press/` at 320px: the press-enquiries block was **clipped and unreachable**. `info@naturesvillageresort.com` is a 29-char unbreakable token; grid tracks floor at min-content, giving a 294px track in 216px of space, and `body{overflow-x:hidden}` hid the symptom from plain overflow checks. | content loss | `overflow-wrap: anywhere` on `.nvr-featurelist li`. `anywhere`, not `break-word` - only `anywhere` lowers min-content, which is what actually frees the track. 347px -> 252px right edge at 320px. |
| **new** | `link-in-text-block` on `/press/` - mailto link at 1.26:1 against surrounding text, no underline, so identified by colour alone (WCAG 1.4.1). | serious | Underline on bare in-paragraph links, excluding buttons, `.nvr-textlink`, nav and card links. Specificity (0,3,2) - deliberately does not touch the fragile colour cascade documented at `styles.css:229`. |
| **L-16** | `image-redundant-alt` on `/` - chapel alt duplicated its adjacent label. | minor | Descriptive alt matching the sibling images' pattern. Closes L-16. |

### Verified false positive - no change made

`color-contrast`, 5 nodes, reported "serious", on `.contact-details__label`.
axe claimed **1.51:1** with foreground `#c5d2a3` on background `#f8faf0`. The
card's real background is `#2f3919`, every intermediate element transparent
(ancestor chain walked and recorded). True ratio for `#bccb95` on `#2f3919` is
**about 7:1** - passes AA. Cause: the label carries `opacity: 0.85`, which
defeats axe's compositing and made it fall back to the page's cream background.
Verified visually. Colours left untouched.

This is a second instance of the same class of error as the phantom contrast
above, and worth remembering: **axe contrast results are unreliable wherever
`opacity` is in play.**

### Still open after this pass

- **M-03** `nested-interactive` (serious, 7) + `aria-allowed-role` (minor, 10) on
  `/accommodations/` and `/about/`. **Scope correction:** this report says 30
  nodes across three pages, but `/function-rooms/`'s 20 venue cards have since
  been converted to real `<button>` elements with `<span>` children and now report
  **zero** violations. Real remaining scope is 10 nodes on two pages, and
  `/function-rooms/` is the in-repo reference implementation. `/accommodations/`
  differs in one respect that matters: its cards contain a genuine
  "Check Availability" link, so the recommended shape (non-interactive
  `<article>` + explicit "View details" `<button>` + booking link as sibling)
  still stands. Deferred: `/about/`'s cards are being reordered by revision A-05.
- **M-04 / M-05** wrong room photography - now carrying `TODO` comments in
  `accommodations.html` and blocked on client assets (B-05).
- **M-17** landlines still not `tel:` links and still use the fax/`printer` icon.
  Partly reduced: revision G-03 collapsed the footer's three landline `<li>` into
  one, so the unlabelled printer icon now appears once per footer instead of three
  times. The `/contact/` card still lists three separate landline lines.
- **M-08, M-09, M-10, M-13, M-15, M-16** unchanged - performance, unused assets,
  privacy policy, no-JS form fallback, dead CSS.

### Not defects - checked and dismissed

- Footer links are 20px tall (under the WCAG 2.2 24px minimum) but satisfy the
  **spacing exception** at 31px centre-to-centre; axe reports no `target-size`
  violation. Same for the 22x22 hero scroll cue. This supersedes **L-14** as
  written, which measured height alone.
- The homepage hero image overhangs the viewport by design - `object-fit: cover`
  inside `overflow: hidden`.
- Inline text links (21px) are exempt from target-size.

### State after pass 3, all 11 pages

| Check | Result |
|---|---|
| axe violation nodes | **10**, all M-03. Six pages report zero. |
| Console errors / page errors / failed requests | **0 / 0 / 0** |
| Responsive (66 checks) | **0 overflow, 0 clipped content** |
| `<h1>` per page / duplicate IDs / heading skips | 1 / 0 / 0 |
| Missing alt / broken images / broken anchors / `_blank` unsafe | 0 / 0 / 0 / 0 |
| `prefers-reduced-motion` | honoured; 0/29 reveals stuck, hero video suppressed |
| `node --check custom.js` / CSS braces | passes / 897 balanced |
| Regressions | none - room modal 2 paragraphs, 20 venue cards open, FAB intact |

Cache-busters bumped to `?v=20260907b` on the 10 in-scope pages. `dev.html` is
excluded from the current batch by instruction and therefore still reports the
`region` violation.

---

## 1. Audited version

The project is **not a git repository** (`git rev-parse` → *not a git repository*), so there is no branch or commit to cite. The audited version is identified by file size and modification time:

| File | Bytes | Modified |
|---|---:|---|
| `index.html` | 30,282 | 2026-08-23 05:45:54 |
| `about.html` | 23,767 | 2026-08-23 05:45:54 |
| `accommodations.html` | 35,143 | 2026-08-23 05:45:54 |
| `contact.html` | 23,520 | 2026-08-23 05:45:54 |
| `facilities.html` | 20,214 | 2026-08-23 05:45:54 |
| `function-rooms.html` | 59,600 | 2026-08-23 05:45:54 |
| `press.html` | 49,660 | 2026-08-23 05:45:54 |
| `restaurant.html` | 61,416 | 2026-08-23 05:45:54 |
| `testimonials.html` | 21,451 | 2026-08-23 05:45:54 |
| `dev.html` | 17,200 | 2026-08-23 05:45:54 |
| `404.html` | 10,472 | 2026-08-23 05:45:54 |
| `assets/css/styles.css` | 155,955 | 2026-08-23 05:46:06 |
| `assets/js/custom.js` | 92,541 | 2026-08-21 20:05:29 |
| `.htaccess` | 7,589 | 2026-08-21 18:54:51 |
| `sitemap.xml` | 1,381 | 2026-08-23 05:46:06 |
| `robots.txt` | 78 | 2026-08-20 20:16:48 |
| `assets/docs/the-village-restaurant-menu.pdf` | 1,966,614 | 2026-08-20 20:16:48 |
| `assets/font/FeelingPassionateRegular.otf` | 554,236 | 2026-08-20 20:16:48 |
| `assets/video/Natures Village Resort.mp4` | 36,950,689 | 2026-08-21 16:22:37 |
| `qa/encode-hero-video.ps1` | 3,193 | 2026-08-21 20:06:47 |
| `qa/make-og-images.py` | 2,243 | 2026-08-21 00:12:49 |

**Project totals:** 318 files, 178 MB on disk — `assets/images` 140 MB (293 files), `assets/video` 36 MB, `assets/docs` 1.9 MB, `assets/font` 544 KB, `assets/css` 156 KB, `assets/js` 92 KB.

---

## 2. Pages and files inspected

**HTML (11/11, all read in full and loaded in a real browser):**
`index.html`, `about.html`, `accommodations.html`, `contact.html`, `facilities.html`, `function-rooms.html`, `press.html`, `restaurant.html`, `testimonials.html`, `dev.html`, `404.html`

**Other files inspected:**

- `assets/css/styles.css` (4,120 lines) — read and analysed programmatically
- `assets/js/custom.js` (2,213 lines) — read in full, all four IIFE sections
- `.htaccess` — read in full; its CSP was extracted and enforced in a live test
- `robots.txt`, `sitemap.xml` — read and validated
- `assets/docs/the-village-restaurant-menu.pdf` — parsed (5 pages, A4 596×842pt, real text layer, unencrypted)
- `assets/docs/README.txt`, `CLAUDE.md` — read
- `qa/encode-hero-video.ps1`, `qa/make-og-images.py` — read
- `assets/font/FeelingPassionateRegular.otf`
- `assets/images/**` — 293 files enumerated, hashed, size-profiled, cross-referenced against every HTML/CSS/JS reference
- `assets/images/og/*.jpg` — 6 share cards, dimensions verified
- `assets/video/Natures Village Resort.mp4`

There is **no `README.txt` at the project root**; the only README is `assets/docs/README.txt` (documents the menu PDF workflow). There is no `package.json`, no build step, and no test suite — the project is hand-authored static HTML.

---

## 3. Tools and commands used

| Purpose | Tool / command |
|---|---|
| Local hosting with production URL semantics | Custom Python `http.server` that emulates the `.htaccess` clean-URL rewrite (`/about/` → `about.html`) and serves `404.html` with HTTP 404 — `http://127.0.0.1:8765` |
| CSP enforcement test | Second server on `:8766` that reads the `Content-Security-Policy` value **directly out of `.htaccess`** and sends it on every response |
| Browser automation | Playwright 1.x (`playwright-core`) driving bundled Chromium 1234, plus interactive Playwright MCP for exploratory checks |
| Accessibility scan | `axe-core` injected per page, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` |
| HTML validation | `html-validate` 11.9.0, `html-validate:recommended` |
| XML validation | `xml.dom.minidom` parse of `sitemap.xml` |
| PDF inspection | raw byte inspection + `pdfjs-dist` 3.11.174 page/text extraction |
| Link + asset resolution | Custom Python crawler: case-exact filesystem resolution of every `href`/`src`/`poster`/`data-pdf`, plus live HTTP status for every internal link and every in-page/cross-page anchor target |
| External link reachability | `curl` with a desktop browser User-Agent |
| Subresource integrity | `curl \| openssl dgst -sha384 \| openssl base64` against both CDNs |
| Duplicate / unused assets | `md5sum` content hashing + reference cross-check |
| Image sizing | in-browser `naturalWidth` vs `getBoundingClientRect()` vs declared `width`/`height` |
| CSS analysis | Custom Python: `!important` census, unused class selectors, duplicate blocks, breakpoint census, custom-property define-vs-use, inline-style census |
| Contrast maths | WCAG 2.x relative-luminance calculation on the palette tokens |
| Text/content extraction | rendered `body.innerText` of all 11 pages (5,501 words) for spelling/terminology/consistency passes |

**Viewports tested:** 360×740, 390×844 (touch/mobile UA), 768×1024, 1280×800/900, 1440×900, 1920×1080.

---

## 4. Audit limitations

1. **Form delivery was not exercised.** Both forms post to `https://formsubmit.co/ajax/nvrsales@gmail.com`. A live submission would send real mail to the client and could consume FormSubmit's one-time activation. Validation, error handling, success handling and the network-failure path were tested with the endpoint **intercepted** (aborted, and separately mocked with a 200). Actual delivery is marked **requires manual verification**.
2. **The local server is not Apache.** `.htaccess` was reviewed statically; its rewrite semantics were reproduced in the test server and its CSP was enforced verbatim, but redirect chains, `mod_deflate`, `mod_expires` and `ErrorDocument` behaviour must be confirmed on Hostinger.
3. **Byte totals are uncompressed.** The test server sends no `Content-Encoding`. In production `.htaccess` gzips HTML/CSS/JS, so text-asset figures in §12 will be roughly 4–5× smaller. Binary figures (font, images, video) are accurate as-is.
4. **The test server does not support HTTP Range.** The single console warning observed on the homepage (`could not seek to 5s`) is a harness artifact, not a site defect; Apache supports Range by default.
5. **Full-page screenshots are unreliable on this site.** Capturing beyond the viewport does not fire the `IntersectionObserver` that reveals `.nvr-reveal` sections, so full-page captures show blank bands. Every such case was re-verified by scrolling stepwise; after a real scroll **zero** reveal elements remained hidden on any page.
6. **Social-account ownership was not verified.** Facebook answers HTTP 400 to non-browser clients; X and TikTok return 200 for any path. These need a human eye in a browser.
7. **Only Chromium was used.** Safari/WebKit and Firefox were not tested — relevant to the `<video>` autoplay path, `navigator.pdfViewerEnabled`, and `-webkit-appearance` form styling.
8. **Out of scope by instruction:** databases, backend APIs, server-side logic, authentication, authorization, payments, server-side CRUD, application state, backend infrastructure, database security, API performance.

---

## 5. Summary of the website's current condition

**This is a well-built site.** It is not a rough draft with a list of breakages; it is a carefully engineered static site with an unusually disciplined codebase, and the findings below are refinements on a solid base — with five exceptions that should be fixed before or immediately after launch.

What the automated passes found *clean*:

- **Zero broken links.** Every internal link, every asset reference, and every in-page and cross-page anchor across all 11 pages resolves — verified both against the filesystem with case-exact matching and over live HTTP.
- **Zero console errors and zero failed network requests** on all 11 pages.
- **Zero horizontal overflow** at any of the five tested viewport widths on any page.
- **Zero duplicate IDs**, one `<h1>` per page, no heading-level skips in visible content.
- **Zero `axe-core` colour-contrast violations** on any page.
- **Zero placeholder content** — no lorem, TODO, `example.com`, or WordPress leftovers.
- Header, footer and mobile drawer markup are byte-identical across pages (one exception: **M-02**).
- Every keyboard interaction tested — six separate overlays — traps focus, closes on Escape, and restores focus to its trigger. Stacked dialogs (lightbox over a modal) correctly consume only one Escape.

The five things that genuinely need attention:

1. **Both forms stay on screen after a successful submission** (H-01) — a CSS `display` value defeats the `hidden` attribute the script sets. Confirmed visually.
2. **The Content-Security-Policy blocks the restaurant menu's own fallback viewer** (H-02) — confirmed with a live CSP violation from Chromium.
3. **A 36.9 MB hero video ships on the homepage with `preload="auto"`** (H-03) — and the repo already contains the script written to replace it with a ~2 MB encode.
4. **Form fields have no adequate focus indicator** (H-04) — the outline is removed and the replacement underline measures 2.16–2.37:1, below the 3:1 the stylesheet's own comment cites.
5. **A venue modal's primary CTA jumps to a form hidden behind the still-open modal** (H-05).

Beyond those, the recurring themes are **weight** (≈945 KB of font + icon library on every page, images served up to 10.9× larger than displayed, 68 MB of unreferenced images in the deploy tree), **naming drift** (the same page and the same room called three different things), and **two room photos that show the wrong room**.

---

## 6. Findings by category

### 6.1 HTML and page structure

Structurally the pages are consistent: identical `<!doctype html>` + `<html lang="en">`, `<meta charset>` first, viewport on all 11, one `<main id="main">` per page, a real skip link on all 11, `<header>`/`<main>`/`<footer>` landmarks throughout. Titles and meta descriptions are unique on every page.

`html-validate` reports 247 messages across 11 files. Triaged:

- **165 × `hidden-focusable`** — the closed mobile drawer carries `aria-hidden="true"` over 15 focusable descendants (15 × 11 pages). **Verified not a real keyboard trap:** the drawer is `visibility: hidden` when closed, and tab-order dumps at both 390 px and 1280 px confirm none of its links are reachable. Recorded as **L-04** (prefer `inert`).
- **22 × `no-implicit-button-type`** — `.nvr-burger` and `.nvr-mobile__close` lack `type="button"`. Neither is inside a form, so harmless. **L-03**.
- **18 × `element-permitted-content`** — genuine invalidity: `<h3>` and `<p>` inside `<button>` in `press.html`. **M-07**.
- **11 × `doctype-style`** — lowercase `<!doctype html>`. Valid per the HTML spec; a stylistic preference of the linter. **Not a finding.**
- **10 × `prefer-native-element`** — `role="button"` on `<article>`. Same root cause as **M-03**.
- **9 × `tel-non-breaking`** — stylistic. **L-14 (adjacent)**.
- **8 × `attribute-allowed-values`** — `src=""` on modal placeholder images. **L-01**.
- **4 × `empty-heading`** — modal title placeholders inside hidden dialogs, filled by script on open. **L-02**.

One inline style exists site-wide (`404.html:87`) — **L-17**.

### 6.2 Links and navigation

Full results in §9. **One wrong-destination link** (`dev.html` drawer) and **one navigation gap** (desktop header omits three pages that the mobile drawer includes). No 404s, no bad relative paths, no case mismatches, no missing anchor targets. Every `target="_blank"` link on every page carries `rel="noopener"` — including the two the script injects at runtime.

### 6.3 Forms

Full results in §10. Client-side validation is thorough and behaves correctly under every case tested. The two defects are the success-state bug (**H-01**) and the absent no-JS fallback (**M-15**). The forms are near-duplicate code (**L-19**), and delivery needs manual confirmation (**I-01**).

### 6.4 CSS and visual consistency

`styles.css` is 155,955 bytes, of which **33% (52 KB) is comments** — unusually well documented, and it gzips away in production. It is token-driven (`:root` custom properties for the full palette, type scale, spacing, radii, shadows, easing) with a consistent `nvr-` namespace, and **every one of the 40+ defined custom properties is used** — no dead tokens. Only **7 `!important` declarations** exist, five of which are the nav display toggle and the reduced-motion override.

Issues:

- Roughly 500 lines of **dead component CSS**: the entire `.nvr-slider` (28 selector occurrences), `.nvr-mosaic` (11), `.dine-pillars` (7), `.dine-speclist` (5), `.facilities-note__list` (3) — none appear in any HTML or JS, and a runtime check found 0 `.nvr-slider` elements on any page (**M-16**).
- **20 distinct media-query breakpoints** across 70 `@media` blocks (720, 620, 560, 900, 1000, 700, 480, 640, 860, 940, 820, 520, 780, 800, 1024, 980, 600, 779, 420, 1040 px) — no shared scale (**L-08**).
- **No `@media print` rules at all** — verified 0 print media rules in the parsed stylesheet (**L-07**).
- Form-control focus styling removes the outline and replaces it with a low-contrast underline (**H-04**).
- No genuine duplicate rule blocks: the 56 repeated selectors flagged by the analyser are all base rules plus their media-query overrides, which is correct authoring.

Cross-page visual consistency is good: header, footer and drawer are identical markup; buttons, cards, section spacing and container widths all derive from shared tokens; heading sizes come from one fluid scale.

### 6.5 Responsive design

**No page produced horizontal overflow at any tested width.** `document.scrollWidth` equalled `clientWidth` on 11 pages × 5 viewports = 55 measurements. No cut-off content, no overlapping elements, no stretched or cropped images (containers pin `aspect-ratio` and images use `object-fit: cover`), no video overflow.

Verified working:

- Mobile drawer opens, dims, traps focus, closes on Escape and backdrop, restores focus, and locks/unlocks scroll correctly at 390 px.
- Room modal at 390 px: dialog 358 × 776 inside a 390 × 844 viewport — fits with margin.
- Menu booklet at 390 px: single-page mode, 1 canvas, "Page 1 of 5", no overflow (screenshot captured).
- Contact page grid: single column at 768 px, two columns from 1024 px — measured, correct.
- The floating booking button is 50 × 50 at the bottom-right on every page and overlaps nothing (top element at its centre is itself).

Remaining responsive issues are tap-target sizes (**L-14**).

### 6.6 JavaScript

`custom.js` is one deferred bundle of four self-contained IIFEs, each guarding on its own DOM. **No syntax errors, no page errors, no console errors on any page.** Every feature was exercised on the page that uses it:

| Feature | Page | Result |
|---|---|---|
| Lucide icon injection + jsDelivr fallback | all 11 | ✅ 0 unrendered `<i data-lucide>` placeholders on any page; 15–73 SVGs drawn per page |
| Header transparent→solid on scroll | all | ✅ |
| Mobile drawer (open/close/Escape/backdrop/focus trap/scroll lock/focus restore) | all | ✅ full 16-step tab cycle stays inside the drawer |
| Active-nav highlighting + `aria-current` | all | ✅ where the page is in the desktop nav |
| Scroll reveal | all | ✅ 0 elements left hidden after scroll; visible without JS |
| Footer year | all | ✅ (and a hard-coded `2026` fallback in the markup) |
| Floating booking button | all | ✅ injected with `target="_blank" rel="noopener"` |
| Page-transition fade + `pageshow` reset | all | ✅ correctly yields to element-level handlers (`preventDefault` ordering verified) |
| Hero video (inject after `load`, seek, loop-reseek, reveal, poster fallback) | `/` | ✅ plays; suppressed under reduced motion |
| Hero parallax | `/` | ✅ |
| Photo lightbox (open/counter/alt/arrows/Escape/single-image mode) | rooms, venues, restaurant, press | ✅ 18 gallery triggers on `/restaurant/`, "1 / 18" |
| Room/venue detail modal | accommodations (7), function-rooms (20) | ✅ mouse and keyboard (Enter) |
| Story modal | about (3) | ✅ 2 paragraphs, 4 highlights, correct CTA |
| Press modal (11 items, meta, details `<dl>`, hand-off to lightbox) | press | ✅ |
| Stacked-dialog Escape guard | press + accommodations | ✅ one Escape closes only the lightbox; the dialog underneath survives |
| Menu booklet (pdf.js, 3 CDN mirrors, blob worker, spread/single, paging, zoom, swipe, resize) | restaurant | ✅ 5 pages, spread on desktop, single on mobile |
| Contact form validation | contact | ✅ all cases (see §10) |
| Events form validation | function-rooms | ✅ all cases (see §10) |
| Elfsight review widget | `/` | ✅ renders (358 px tall, real review DOM) after ~6 s |

Defects: the success-state bug (**H-01**), the venue CTA (**H-05**), image-fallback binding only at load (**L-18**), duplicated validation code (**L-19**), and three code comments pointing at a file that does not exist plus two naming the wrong form provider (**L-11**).

### 6.7 Accessibility

`axe-core` (WCAG 2.0/2.1 A + AA + best practice) across all 11 pages returned **15 violations total**, and 11 of those are the same one:

| Rule | Impact | Pages | Nodes |
|---|---|---|---|
| `region` (`.nvr-fab` outside all landmarks) | moderate | all 11 | 1 each |
| `nested-interactive` | **serious** | accommodations | 7 |
| `aria-allowed-role` (`role="button"` on `<article>`) | minor | accommodations (7), about (3) | 10 |
| `image-redundant-alt` | minor | index | 1 |

**No colour-contrast violations anywhere** — the palette work (including the documented brass → brass-ink substitution for small text) holds up.

Strong points verified by hand: skip link on all 11 pages with a proper `:focus` reveal; six overlays each with a focus trap, Escape, and focus restoration; `aria-expanded`/`aria-controls`/`aria-hidden` maintained on the drawer; `aria-current="page"` on the active nav link; `role="dialog"`/`aria-modal`/`aria-labelledby` on the menu booklet; visually-hidden labels on press modal meta rows; decorative icons `aria-hidden`; the hero video kept out of the accessibility tree and the tab order; `aria-live="polite"` on the booklet's page counter; a described `role="img"` label on each rendered menu canvas; every image has an `alt` attribute on every page.

Gaps: form-field focus visibility (**H-04**), the `role="button"` card pattern (**M-03**), misleading alt text on the Deluxe Room photo (**M-04**), tap-target sizes (**L-14**), `aria-hidden` over focusable drawer content (**L-04**), and the FAB's landmark placement (**L-15**).

Validation error messages are wired correctly for assistive tech: each field carries `aria-describedby` pointing at its own error paragraph and gets `aria-invalid="true"` on failure, and focus moves to the first invalid field — so the error is announced. Submit-level errors carry `role="alert"`. Success panels take `tabindex="-1"` and receive focus.

### 6.8 SEO and metadata

Solid. All 10 indexable pages have a unique title, a unique meta description, a canonical URL, `og:type/title/description/image/url`, `og:site_name`, `theme-color`, `twitter:card`, `twitter:image`, and `robots: index, follow`. `404.html` correctly carries `noindex, follow` and no canonical. Breadcrumb JSON-LD on 9 pages; type-appropriate primary JSON-LD per page (`Resort`, `AboutPage`, `EventVenue`, `Restaurant`, `WebPage`, `Person`) — all blocks parse as valid JSON.

All six Open Graph cards exist at exactly **1200 × 630 JPEG** with declared `og:image:width`/`height`/`type`/`alt`, generated reproducibly by `qa/make-og-images.py`.

`robots.txt` and `sitemap.xml` both reference the correct production domain `https://naturesvillageresort.com`. The sitemap is valid XML, 9 URLs, no staging or development URLs, no duplicates, correctly excludes `404.html`.

Issues: self-serving review markup that also mismatches visible content (**M-11**), an unsourced rating contradicted elsewhere on the site (**M-12**), `/dev/` indexable but not in the sitemap (**M-14**), a wrong `streetAddress` (**L-12**), three long titles (**L-09**), and inconsistent `twitter:title`/`twitter:description` coverage (**L-10**).

### 6.9 Performance and assets

Measured per page (uncompressed, cold cache, 1440 × 900):

| Page | Requests | Total | of which images | DOM nodes |
|---|---:|---:|---:|---:|
| `/` | 17 | 1,736 KB **+ 36.9 MB video** | 357 KB | 500 |
| `/about/` | 17 | 2,159 KB | 742 KB | 354 |
| `/accommodations/` | 18 | 3,322 KB | 1,974 KB | 713 |
| `/contact/` | 33 | 3,312 KB | 204 KB | 355 |
| `/facilities/` | 16 | 2,837 KB | 1,503 KB | 303 |
| `/function-rooms/` | 17 | 3,437 KB | 2,065 KB | 739 |
| `/press/` | 18 | 2,411 KB | 1,048 KB | 434 |
| `/restaurant/` | 18 | 3,874 KB | 2,420 KB | 600 |
| `/testimonials/` | 16 | 1,794 KB | 380 KB | 345 |
| `/dev/` | 14 | 1,491 KB | 168 KB | 271 |
| `/404.html` | 13 | 1,740 KB | 424 KB | 191 |

Every page carries a **~1.1 MB fixed overhead** before a single photograph:

| Asset | Size | Note |
|---|---:|---|
| `FeelingPassionateRegular.otf` | 541 KB | decorative script face, used for hero titles only |
| `lucide@1.28.0` UMD | 404 KB | complete icon library; ~15–73 icons actually used per page |
| `styles.css` | 152 KB | gzips well |
| `custom.js` | 90 KB | gzips well |
| Google Fonts (3 families) | ~110 KB | |

Done well: `loading="lazy"` on every content image; `fetchpriority="high"` and explicit dimensions on the LCP hero; `defer` on both scripts; SRI on the Lucide tag with a verified-correct hash; `preconnect` to all three font/CDN origins; a per-page `preload` for the hero image; `?v=` cache-busting on CSS and JS; every image is WebP except the 6 OG JPEGs and 5 stray files; CSS `aspect-ratio` on media containers so images reserve space and cannot shift layout; the review widget is `data-elfsight-app-lazy`; the map iframe is `loading="lazy"`; the hero video is injected after `load`, skipped under reduced motion, and skipped on `saveData` connections; pdf.js is warmed on pointer/focus intent rather than page load.

Issues: the 36.9 MB video (**H-03**), oversized image delivery with no `srcset` (**M-08**), the font + icon-library overhead (**M-09**), 68 MB of unreferenced images (**M-10**), and declared-vs-intrinsic aspect-ratio mismatches (**L-06**, cosmetic only).

### 6.10 `.htaccess`, robots, and sitemap

`.htaccess` is careful work: every module-dependent block is wrapped in `<IfModule>`, `Options -Indexes` and `ErrorDocument 404 /404.html` are set, and local-only folders (`_unused`, `qa`, `.playwright-mcp`, `.claude`) are refused with `[F,L]` so an accidental upload cannot be served. The clean-URL rewrite matches the canonical/OG/sitemap URLs exactly. Font MIME types and `video/mp4` are forced explicitly, with `Access-Control-Allow-Origin` on fonts. Security headers are complete and sensible: `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, a locked-down `Permissions-Policy`, and one-year HSTS.

**The CSP is the standout — and also the one real defect.** It is strict where it matters (`script-src` with no `'unsafe-inline'` and no `'unsafe-eval'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`), every allowed origin is justified in a comment, and **enforcing it verbatim produced zero violations on any page's primary path**. But `frame-src https://www.google.com` omits `'self'`, which blocks the menu viewer's own PDF-embed fallback (**H-02**).

Smaller items: chained HTTP→HTTPS→apex redirects, `/about` and `/about/` both serving 200, `DEFLATE` omitting XML and plain text, `Expires` omitting `application/pdf` and SVG, and `/404/` returning 200 (**L-20**, **L-22**).

`robots.txt` — 3 lines, correct syntax, blocks nothing, points at the correct sitemap URL on the correct domain. Correct.

`sitemap.xml` — valid XML, 9 URLs, correct production domain, no staging URLs, no duplicates. Missing `/dev/` (**M-14**) and `<lastmod>` (**L-23**).

### 6.11 Content consistency

Contact details are consistent across all 11 pages (identical footer markup), and the contact page agrees with the footer: one address, two mobiles (Smart / Globe), three landlines, one email, "front desk open 24 hours". Phone numbers match between visible text, `tel:` links and JSON-LD. The 12 testimonials, 11 press items, 7 room types and 20 function venues are internally coherent and cross-referenced correctly.

Spelling and grammar are clean — no misspellings found in 5,501 words of rendered text. Two mixed-variant pairs: "Favourites" (BrE) alongside American spellings elsewhere, and "programme" once against "program" three times (**L-24 group**).

Naming drift is the real content issue (**M-06**), plus two wrong room photos (**M-04**, **M-05**), the unsourced rating (**M-12**), and two quoted third-party phrasings worth a clarifying note (**L-24**).

---

## 7. Finding table

Severity key — **Critical**: a core page or important feature unusable · **High**: a major link/form/layout/accessibility/deployment issue · **Medium**: noticeable quality, consistency or usability issue · **Low**: minor visual, content or code-quality issue · **Info**: recommendation or manual-verification item.

**No Critical findings.** Every page loads, every link works, and every interactive feature functions.

### High

| ID | Sev | Category | Page / file | Location | Description | Evidence | User impact | Recommended fix | Verification | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **H-01** | High | Forms / CSS | `contact.html`, `function-rooms.html`, `assets/css/styles.css` | `styles.css:1510` (`.events-form`), `styles.css:3726-3729` (`.contact-form`); `custom.js:1988` and `custom.js:2151` (`form.hidden = true`) | After a successful submission the script sets `form.hidden = true`, but the author stylesheet declares `display: grid` on `.contact-form` / `.events-form`. An author `display` always beats the UA sheet's `[hidden] { display: none }`, so the form never hides. The success panel appears **below the still-visible form**. Note the codebase already guards this pattern elsewhere — `.nvr-lightbox[hidden]`, `.nvr-roommodal[hidden]`, `.nvr-menubook [hidden]` and 10 more all have explicit `[hidden] { display:none }` rules; the two forms are the gap. | Submitted both forms with the endpoint mocked at HTTP 200. Contact: `formHiddenAttr:true, formDisplay:"grid", formHeight:735px`, success panel `441px`. Events: `formHiddenAttr:true, formDisplay:"grid", formHeight:778px`, success `465px`. Screenshot shows the "SEND ENQUIRY" button and booking-engine note still on screen above "Thank you — your note is on its way." | A guest who has just sent an enquiry sees a filled-in form and a live submit button next to a thank-you message. Reads as a failed send; invites duplicate submissions. | Add `.contact-form[hidden], .events-form[hidden] { display: none; }` — matching the `[hidden]` guards the other 13 components already use. | Submit each form with the endpoint mocked 200; assert `getComputedStyle(form).display === 'none'` and the form's height is 0. | **Fixed (pass 1)** |
| **H-02** | High | `.htaccess` / JavaScript | `.htaccess`, `assets/js/custom.js` | `.htaccess` CSP `frame-src https://www.google.com`; `custom.js:1688-1706` (`useEmbed()`) | The menu viewer degrades in four documented steps: booklet → browser-native PDF frame → open-in-new-tab → honest message. Step 2 builds an `<iframe src="/assets/docs/…pdf">`. `frame-src` does **not** fall back to `default-src` when present, and the policy lists only `https://www.google.com`, so the same-origin PDF frame is refused. The code then calls `showOnly("embed")` and the guest is left with an empty stage — strictly worse than the step-4 message the chain was designed to reach. | Served the site with the CSP read verbatim out of `.htaccess`, then reproduced `useEmbed()`. Chromium: `Framing 'http://127.0.0.1:8766/assets/docs/the-village-restaurant-menu.pdf#view=FitH' violates the following Content Security Policy directive: "frame-src https://www.google.com". The request has been blocked.` Iframe present in DOM, content inaccessible. | Any guest whose browser or network blocks all three pdf.js mirrors — ad-blockers, corporate proxies, hotel Wi-Fi — gets a blank panel instead of the menu. | Change to `frame-src 'self' https://www.google.com`. | Re-run the CSP-enforcing server and the `useEmbed()` reproduction; expect no violation and a rendered PDF frame. | **Fixed (pass 1)** |
| **H-03** | High | Performance | `index.html`, `assets/video/` | `index.html:139-141` (`data-hero-video="/assets/video/Natures%20Village%20Resort.mp4"`, `data-hero-video-start="5"`); `custom.js:425` (`video.preload = "auto"`) | The homepage hero loads the **untrimmed 36.9 MB master** with `preload="auto"`, i.e. the whole file. `qa/encode-hero-video.ps1` exists precisely to fix this — it trims 5 s, cuts to 1280 px, drops audio, sets CRF 26 and `+faststart`, targets ~2 MB, and prints the exact `index.html` edit to make (`data-hero-video="/assets/video/nvr-hero.mp4"`, `data-hero-video-start="0"`). That encode has not been run, and the site still points at the master. The script's own comment notes that a file without `+faststart` is measured at "68 MB over the wire for a 35 MB file". | `assets/video/Natures Village Resort.mp4` = 36,950,689 bytes; `assets/video/nvr-hero.mp4` does not exist. Network log for `/` shows four requests for the video (200, ERR_ABORTED, 200, 206). `preload = "auto"` at `custom.js:425`. | Mobile visitors on metered data download tens of megabytes for decorative wallpaper behind a scrim. `saveData` and reduced-motion opt-outs exist, but a normal 4G visitor is not covered. | Run `pwsh -File qa/encode-hero-video.ps1`, apply the two attribute changes it prints, and remove the master from the deploy set. Consider `preload="metadata"` as well. | Re-measure `/` total transfer; expect ~2 MB for the video. Confirm the hero still plays and still falls back to its poster. | **Fixed (pass 1)** |
| **H-04** | High | Accessibility / CSS | `assets/css/styles.css` | `3786-3791` (`.contact-field input/textarea/select:focus`), `1556-1561` (`.events-field …:focus`) | Both rules set `outline: none` and substitute `border-bottom-color: var(--nvr-brass)`. Two problems: the 1 px brass underline measures **2.16–2.37:1** against the panel grounds — below the 3:1 WCAG 2.2 SC 1.4.11 requires of a focus indicator — and the change from `--nvr-line` to `--nvr-brass` is itself only a **1.91:1** state contrast. The stylesheet's own comment at line 188 already states brass measures "2.08:1 … under the 3:1 that WCAG 1.4.11 asks of a focus indicator, and in practice almost invisible", and chooses `--nvr-brass-ink` (5.77:1) as the site-wide ring for exactly that reason. The form-control rules override that decision at higher specificity (`.contact-field input:focus` = 0,2,1 vs `.nvr :focus-visible` = 0,2,0). | Keyboard-focused `#cf-email` after transition settle: `outlineStyle:"none"`, `borderBottomColor:"rgb(155,176,88)"` (`#9bb058`), `borderBottomWidth:"1px"`, `matches(':focus-visible'):true`. Computed WCAG ratios: `#9bb058` vs paper `#fdfef8` = **2.37:1**; vs cream `#f8faf0` = **2.28:1**; vs linen `#f1f5e2` = **2.16:1**. By contrast the submit button correctly shows `outline: rgb(92,107,40) solid 2px, offset 3px` (5.77:1). | A keyboard or low-vision user filling in the enquiry form cannot reliably tell which of the eight fields has focus. The one page where the site asks for input is the one page where focus is hardest to see. | Drop `outline: none` from both blocks so the inherited `--nvr-brass-ink` ring applies, or keep the underline and thicken it to ≥2 px in `--nvr-brass-ink`. | Tab through both forms; assert every control has an indicator at ≥3:1 against its surroundings. | **Fixed (pass 1)** |
| **H-05** | High | JavaScript / UX | `function-rooms.html`, `assets/js/custom.js` | `custom.js:829-836` (CTA href branch), `custom.js:900-911` (`close()`); venue cards carry `data-cta-href="#enquire"` | For the 20 venue cards the detail modal's CTA is "Enquire About This Venue" → `href="#enquire"`. Because the href is not the default booking URL, the code strips `target`/`rel` — correct — but nothing closes the modal. Clicking it moves the document to the enquiry form while the modal stays open over it, with the body scroll lock still applied. | Clicked `#roommodal-cta` on Salvacion Hall: URL became `…/function-rooms/#enquire`, `scrollY` 6121, `#nvr-roommodal` still visible, `document.body.classList.contains('nvr-lock')` still `true`. Screenshot shows the unchanged modal over the (now correctly positioned) form. | The primary conversion action on the events page appears to do nothing. A guest must notice the modal is still there and dismiss it manually to reach the form. | On a same-page hash CTA, close the modal first and then scroll to the target (and ideally pre-select the venue in the form's `#ev-venue` select). | Click the CTA on several venues; assert the modal is hidden, scroll is unlocked, and `#enquire` is in view. | **Fixed (pass 1)** |

### Medium

| ID | Sev | Category | Page / file | Location | Description | Evidence | User impact | Recommended fix | Verification | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **M-01** | Medium | Navigation | all 11 pages | `<nav class="nvr-nav">` in each header | The desktop header nav has 5 items — About, Rooms, Events, Restaurant, Contact. The mobile drawer has 9 plus 4 sub-items. **Facilities, Press and Testimonials are reachable from the desktop header only via the footer**, and `initActiveNav` consequently never marks them active. | Runtime `navItems` on all 11 pages: `["About","Rooms","Events","Restaurant","Contact"]`. Drawer list: Home, About, Rooms, Events, Facilities (+4 sub), Restaurant, Press, Testimonials, Contact. `activeNav` empty on `/facilities/`, `/press/`, `/testimonials/`, `/dev/`. | Three content pages — including the awards/press page carrying the resort's strongest credibility material — are invisible to a desktop visitor scanning the header. | Add Facilities to the desktop nav (Press/Testimonials could sit in a dropdown, or stay footer-only as a deliberate choice). Whatever is chosen, make the two menus agree. | Compare the two menus per page; confirm `aria-current` lands on every page that appears in the nav. | **Fixed (pass 2)** |
| **M-02** | Medium | Links | `dev.html` | `dev.html:136` | `<li><a href="/dev/">Testimonials</a></li>` — the drawer's Testimonials entry points at the current page instead of `/testimonials/`. This is the **only** markup difference between the 11 mobile drawers, which are otherwise byte-identical. | `diff` of the extracted drawer block, index vs dev: `- <li><a href="/testimonials/">Testimonials</a></li>` / `+ <li><a href="/dev/">Testimonials</a></li>`. Not caught by status-code link checking because `/dev/` returns 200. | A mobile visitor on the credits page who taps Testimonials reloads the credits page. | Change the href to `/testimonials/`. | Tap/click the entry on `/dev/` at mobile width; assert navigation to `/testimonials/`. | **Fixed (pass 2)** |
| **M-03** | Medium | Accessibility | `accommodations.html`, `function-rooms.html`, `about.html` | 7 `.nvr-detail-card` on accommodations, 20 on function-rooms, 3 `.nvr-story-card` on about | Cards are `<article role="button" tabindex="0">` containing a real `<a>` ("Check Availability"). A button may not contain interactive descendants. The script works around it (`if (e.target.closest("a[href]")) return;`) and keyboard opening via Enter/Space works, but the tab order interleaves confusingly and AT announces a button that contains a link. | `axe-core` on `/accommodations/`: `nested-interactive`, **impact: serious**, 7 nodes; `aria-allowed-role`, 7 nodes. `about.html`: `aria-allowed-role`, 3 nodes. `html-validate`: 10 × `prefer-native-element`. Tab order from the first card: `A|Check Availability` → `ARTICLE|View details for Superior Room` → `A|Check Availability` → `ARTICLE|View details for Deluxe Room`. | Screen-reader and keyboard users get an ambiguous control: one focus stop announces "button" but contains a separate link, and the two interleave down the grid. | Keep `<article>` non-interactive and put an explicit "View details" `<button>` inside it (the `.nvr-gallery-view` overlay is already the visual affordance), leaving the booking link as a sibling. | Re-run axe on all three pages; expect 0 `nested-interactive` and 0 `aria-allowed-role`. Re-check tab order. | Open |
| **M-04** | Medium | Content / Accessibility | `accommodations.html` | `216-241` — `data-detail-gallery` and `<img src>` both `/assets/images/Rooms/Superior/superior-rooms-1.webp`, `alt="Interior of a Deluxe Room at Nature's Village Resort"` | The Deluxe Room is illustrated with a **Superior Room** photograph — the same file the Superior Room card above it uses — and the alt text asserts it is a Deluxe Room. It is also the only room whose detail gallery has a single image (every other room has 3–12), so its modal shows no thumbnail strip. | Extracted `data-detail-gallery` per room: Standard 4 images, Superior 4, **Deluxe 1 (`Superior/superior-rooms-1.webp`)**, Deluxe East 4, Premier 4, Residences 3, Lola's House 12. `assets/images/Rooms/` contains no `Deluxe` folder. Runtime confirmed `superior-rooms-1.webp` rendered twice on the page. | A guest comparing Superior and Deluxe sees the identical photo under both, and a screen-reader user is told it is a Deluxe Room. Misleading on a booking decision. | Supply Deluxe Room photography and point the card, the gallery and the alt text at it. Until then, remove the claim from the alt text and say what the photo actually shows. | Confirm the Deluxe card and modal show Deluxe images and the alt text matches; confirm the thumbnail strip appears. | Open |
| **M-05** | Medium | Content | `index.html` | `231` (`<img src="/assets/images/Rooms/Premier/premier-rooms-1.webp" alt="The Village Residence">`) | The homepage's "The Village Residence" card uses a **Premier Room** photo — the same file the Premier Room uses on `/accommodations/` — even though `assets/images/Rooms/The-Village-Residences/` holds three purpose-shot images. The alt text also just repeats the heading. | `index.html:231` src vs `accommodations.html:277` Premier gallery — same file. `The-Village-Residences/the-village-residences-{1,2,3}.webp` exist and are used on `/accommodations/`. Related: the neighbouring "Deluxe & Premier" card at `index.html:221` uses `Superior/superior-rooms-1.webp` with `alt="Deluxe Room interior"` — the same substitution as M-04. | The homepage advertises a private house for families using a hotel-room photograph. | Point the card at `the-village-residences-1.webp`, fix the "Deluxe & Premier" card's source, and write descriptive alt text rather than repeating the heading. | Compare each homepage room card's image against the corresponding room on `/accommodations/`. | Open |
| **M-06** | Medium | Content consistency | `index.html`, `accommodations.html`, `function-rooms.html`, footers | see Description | The same things carry different names in different places. **Residence:** `index.html:234` and `accommodations.html:65` (JSON-LD) say "The Village Residence"; `accommodations.html:300,311` say "The Village Residence**s**". **Accommodations page:** nav "Rooms", footer "Accommodations", `<title>` "Rooms & Residence", breadcrumb "Accommodations", homepage button "View All Accommodations". **Events page:** nav "Events", footer "Function Rooms", `<title>` "Weddings, Retreats & Celebrations", breadcrumb "Events & Function Venues", drawer sub-item "Function Venues". | Counted occurrences: `accommodations.html` — "The Village Residence" ×2, "The Village Residences" ×4; `index.html` — "The Village Residence" ×2. Nav/footer/title/breadcrumb labels extracted per page. | Guests and search engines see one page under three names; the singular/plural split makes the JSON-LD offer name disagree with the page heading. | Pick one name per entity and apply it in nav, footer, `<title>`, `<h1>`/card heading, breadcrumb, JSON-LD and body copy. | Grep each canonical name; assert one spelling per entity. | Open |
| **M-07** | Medium | HTML validity | `press.html` | 18 sites, e.g. `177`, `197`, `218`, `239`, `276-277`, `296-297`, `316-317`, `336-337`, `356-357`, `376-377`, `396-397` | Press items are `<button>` elements containing `<span>` wrappers that contain `<h3>` and `<p>`. `<button>` permits phrasing content only, so flow content inside it is invalid. Browsers cope, but headings inside an interactive control land in the AT heading list as focusable-button content, and the pattern is fragile across parsers. | `html-validate`: 18 × `element-permitted-content` — "`<h3>` element is not permitted as content under `<span>`" / same for `<p>`. Selectors under `#coverage` and `#recognition`. Matches the outline dump, where 11 press-item titles appear as `h3`. | Screen-reader users navigating by heading find 11 headings that are actually inside buttons; the document outline and the interaction model disagree. | Replace the `<h3>`/`<p>` inside each button with `<span>`s carrying the same visual classes and expose the title through the button's accessible name — or make each card a non-interactive `<article>` with a nested "Read the story" button. | Re-run `html-validate`; expect 0 `element-permitted-content`. Re-check the heading outline. | Open |
| **M-08** | Medium | Performance | `accommodations.html`, `function-rooms.html`, `restaurant.html`, `press.html`, `facilities.html`, `index.html` | all content `<img>` | Images are delivered far larger than they render, and the site uses **no `srcset` and no `<picture>` anywhere** (verified: 0 on the homepage). Worst case is a 6016 × 4016 photo (1.7 MB) drawn into a 550 × 412 box. | Measured `naturalWidth` ÷ (CSS width × DPR): `the-village-restaurant-45.webp` 6016×4016 → 550×412 = **10.9×**; room/venue cards 2048×1365 → 349×262 = **5.9×** (14 images across accommodations, function-rooms, index); `hero-slide-1.webp` 2048×1365 → 509×636 = 4.0×; `press-08.webp` 3.7×; `Farm-3.webp` 3.8×. Per-page image payloads: `/restaurant/` 2,420 KB, `/function-rooms/` 2,065 KB, `/accommodations/` 1,974 KB, `/facilities/` 1,503 KB. | Mobile visitors download several megabytes of pixels they never see. Slow first render on the three most commercially important pages. | Generate 400 / 800 / 1600 px variants and add `srcset` + `sizes` to the card and gallery images; re-encode the handful of multi-megabyte originals. A companion to `qa/make-og-images.py` could do this reproducibly. | Re-measure the ratio for every image; target ≤2× at every breakpoint. | Open |
| **M-09** | Medium | Performance | all 11 pages | `<link rel=stylesheet>` → `@font-face` at `styles.css:23-29`; `<script src="https://unpkg.com/lucide@1.28.0/…">` in each page | Two assets dominate the fixed cost of every page: the **541 KB** `FeelingPassionateRegular.otf` (a decorative script face used only for hero titles) and the **404 KB** complete Lucide UMD bundle (~1,500 icons, of which 15–73 are used per page). Together ~945 KB before any content. OTF is also the least efficient webfont container — WOFF2 typically cuts such a file by 60–70%. | Resource breakdown for `/404.html`: `FeelingPassionateRegular.otf` 541 KB, `lucide.min.js` 404 KB, `styles.css` 152 KB, `custom.js` 90 KB, Google Fonts ~110 KB — a 10 KB HTML page costing 1,740 KB. Runtime icon counts: 15 (`/404.html`) to 73 (`/accommodations/`). | Slow first paint on every page, worst on mobile. The script font is `font-display: swap`, so hero titles visibly reflow. | Convert the OTF to WOFF2 (subset to the Latin glyphs the hero titles need) and keep the OTF only as a fallback `src`. Replace the Lucide CDN bundle with a self-hosted SVG sprite of the icons actually used (~10 KB) — this also removes a third-party dependency, its SRI/mirror machinery, and 3 `script-src` origins from the CSP. | Re-measure fixed per-page overhead; confirm every icon still renders and hero titles still use the script face. | Open |
| **M-10** | Medium | Assets / deployment | `assets/images/**` | see Description | **98 image files totalling 68.2 MB are referenced by nothing** — no HTML, CSS or JS. They include `Others/nvr-1…21.webp` (21 files), `Others/hero-slide-2…9.webp` (7), 27 `Restaurant/Food/*.webp` (many 1.3–2.0 MB), 6 `Organic Farm`/`Home` masters, and 4 `Camp-Edgar/*.jpg`. Six of the 98 are legitimate sources for `qa/make-og-images.py`. Separately, **5 pairs are byte-identical duplicates**. Also, 4 JPEGs sit in an otherwise all-WebP tree. | Content-hash + reference cross-check. Duplicates: `the-village-restaurant-{22,46}.webp` (1,994,398 B each), `the-village-restaurant-{23,45}.webp` (1,789,264 B each), `padre-pio-pavilion-a-{1,5}.webp` (386,164 B), `padre-pio-pavilion-c-{1,2}.webp` (256,816 B), `east-garden-{7,10}.webp` (531,400 B). `Camp-Edgar/camp-edgar-{6,7,8,9}.jpg` = 3.4 MB of JPEG. | Nothing visible to a guest, but every deploy pushes 68 MB of dead weight to Hostinger, and the duplicates make it unclear which file is authoritative. | Move genuinely unused files to the `_unused/` folder `.htaccess` already anticipates (or delete them), keeping the six OG sources. Collapse the five duplicate pairs. Convert or drop the 4 stray JPEGs. | Re-run the reference cross-check; expect only the OG sources unreferenced. Confirm no image 404s afterwards. | Open |
| **M-11** | Medium | SEO / structured data | `testimonials.html` | `47-80` (`Resort` → `review[]`) | Two problems in one block. **(a)** It is self-serving review markup: `Resort` is a `LodgingBusiness`/`LocalBusiness`, and Google's structured-data guidelines exclude reviews about a business that are hosted by that business — the markup is ineligible for rich results and can attract a manual action. **(b)** The markup does not match the visible page. Review 2 ("Andrea L.") is truncated relative to the on-page quote, and review 3 ("The Reyes Family": *"We hosted our celebration here and it was seamless and soulful. Nature did half the decorating for us."*) **does not appear on the page at all** — the page's wedding quote is different text. Google requires marked-up content to be visible. | Programmatic comparison of the four `reviewBody` values against the 12 `<blockquote>` texts: #1 exact match, #2 near-match only (LD ends "…honest and unhurried."; page ends "…honest and unhurried — I still think about that breakfast."), **#3 no match at all**, #4 exact match. Page has 12 quotes with 12 named/located attributions; the JSON-LD names only 4. | No guest-visible effect. Risk of a structured-data manual action, and no rich-result benefit for the markup as written. | Remove the `review[]` array from the `Resort` node. If review rich results are wanted, source them from a third-party platform (the Elfsight widget already aggregates Google/Tripadvisor/Booking on the homepage). If the array is kept, make every `reviewBody` byte-identical to a visible quote. | Google Rich Results Test on `/testimonials/`; assert no self-serving-review warning and that all marked-up text is visible. | Open |
| **M-12** | Medium | Content / trust | `testimonials.html` | `162-168` | The page presents `4.9 / 5` with five filled stars, `role="img"`, `aria-label="Rated 4.9 out of 5 by our guests"` — with no source, no review count, and no `aggregateRating` in the structured data. **The Google Maps embed on `/contact/` shows the resort at 4.3 (1,426 reviews)** — so the site contradicts itself on the same visit. | `testimonials.html:166` — `<strong>4.9</strong> / 5`. `grep aggregateRating testimonials.html` → no match. Screenshot of the `/contact/` map embed: "Nature's Village Resort … 4.3 ★ (1,426)". | A guest who sees 4.9 on one page and Google's 4.3 on another loses confidence in both. | Confirm the true figure with the client and cite its source and count (e.g. "4.3 / 5 from 1,426 Google reviews"), or replace the number with unquantified copy. If a real aggregate is used, mark it up with `aggregateRating` including `reviewCount`. | Compare the displayed rating with the cited platform's live figure. | Open |
| **M-13** | Medium | Privacy | site-wide | homepage Elfsight widget; `contact.html` form and map; Google Fonts on all 11 pages | There is **no privacy policy, no terms page and no cookie notice anywhere on the site**, yet: the homepage's review widget sets third-party cookies; the contact form collects name, email, phone, party size and travel dates and posts them to a third party (FormSubmit) with no privacy statement or consent; `/contact/` loads a Google Maps embed; and all 11 pages load fonts from Google's CDN, transferring visitor IPs. Relevant to the Philippine Data Privacy Act 2012 and to EU/UK visitors. | `grep -i "privacy\|cookie\|gdpr\|terms of"` across all 11 pages → no match. Cookies observed after visiting `/`: `core.service.elfsight.com:elfsight_viewed_recently`, `.elfsight.com:_cfuvid`. Third-party hosts contacted on `/`: `fonts.googleapis.com`, `unpkg.com`, `static.elfsight.com`, `core.service.elfsight.com`, `universe-static.elfsightcdn.com`, `service-reviews-ultimate.elfsight.com`, `phosphor.utils.elfsightcdn.com`. On `/contact/`: `fonts.googleapis.com`, `unpkg.com`, `www.google.com`. | Legal and trust exposure for the client, and no way for a guest to learn what happens to the details they submit. | Add a `privacy.html` (what is collected, why, who processes it, retention, contact for requests), link it from the footer, and add a short notice beside the form's submit button. Consider a lightweight consent gate for the review widget, and self-hosting the fonts to remove the Google transfer entirely. | Confirm the page exists, is linked from every footer, is in the sitemap, and that the form references it. | Open |
| **M-14** | Medium | SEO | `sitemap.xml`, `dev.html` | `sitemap.xml` (9 `<loc>`), `dev.html:8` canonical, `dev.html:23` `robots: index, follow` | `/dev/` is fully indexable — canonical, full OG set, `index, follow`, `Person` + `WebPage` + breadcrumb JSON-LD — but is absent from the sitemap. The sitemap and the page's own directives disagree on whether it should be indexed. | Sitemap `<loc>` list: `/`, `/about/`, `/accommodations/`, `/function-rooms/`, `/facilities/`, `/restaurant/`, `/press/`, `/testimonials/`, `/contact/`. Missing: `/dev/`. `404.html` correctly absent. | Ambiguous signal to crawlers; a developer-credits page may rank for the client's brand. | Decide the intent: if it should be indexed, add `<loc>https://naturesvillageresort.com/dev/</loc>`; if not, set `noindex` on the page. Note the page is also not linked from any nav or footer, so it is currently orphaned. | Assert the sitemap and the page's robots directive agree, and that the page is either linked or deliberately orphaned. | Open |
| **M-15** | Medium | Forms | `contact.html`, `function-rooms.html` | `contact.html:169`, `function-rooms.html:575` — `novalidate action="https://formsubmit.co/ajax/nvrsales@gmail.com"` | Both forms carry `novalidate`, which disables native constraint validation, and all validation plus the `fetch()` submission live in JavaScript. With JavaScript unavailable the browser performs a plain form POST to FormSubmit's **`/ajax/`** endpoint, which is documented to answer with a JSON body rather than a redirect — so a no-JS guest is dropped on a raw JSON page, with no validation having run. Every other feature on this site degrades deliberately (the hero falls back to its poster, reveals stay visible, the menu trigger stays a real PDF link); the forms are the one place that does not. | Attributes as quoted. `custom.js:2014` and `custom.js:2181`: `form.addEventListener("submit", function (e) { e.preventDefault(); … fetch(form.action …) })`. Not exercised live — see I-01. | A guest with JavaScript blocked either cannot tell their enquiry was sent or sees a JSON blob. Also affects the window before `custom.js` executes. | Point `action` at the non-AJAX endpoint (`https://formsubmit.co/<address>`) with a `_next` redirect to a thank-you URL, and let the script upgrade to the `/ajax/` path — or drop `novalidate` so native validation still applies without JS. | With JS disabled, submit each form and confirm the guest reaches a readable confirmation. | Open |
| **M-16** | Medium | CSS | `assets/css/styles.css` | `1770-1948` (`.nvr-slider*`), `1903-1949` (`.nvr-mosaic*`), `2558-2626` (`.dine-pillars`), `2561-2646` (`.dine-speclist`), `2489-2506` (`.facilities-note__list`) | Roughly 500 lines style five components that no longer exist in any page. `.nvr-slider` is the largest — a full carousel with track, viewport, slides, dots, counter, nav, caption and two responsive breakpoints — and there is no slider JavaScript either, so it is entirely orphaned. | Occurrence counts (html / js / css): `nvr-slider` 0/0/28, `nvr-mosaic` 0/0/11, `dine-pillars` 0/0/7, `dine-speclist` 0/0/5, `facilities-note__list` 0/0/3. Runtime confirmation: `document.querySelectorAll('.nvr-slider').length === 0` on `/`, `/testimonials/`, `/facilities/`, `/restaurant/`, `/contact/`. | None visible; it inflates the stylesheet and misleads the next maintainer into thinking a carousel exists. | Delete the five blocks (or move them to a clearly-marked archive file outside the deploy set). | Re-run the unused-selector analysis; visually diff every page before and after. | Open |
| **M-17** | Medium | Content / usability | all 11 footers, `contact.html` | footer `Get In Touch` list; `contact.html:284-291` | The three landline numbers — `(034) 495-0808`, `495-3368`, `495-3369` — are plain `<span>` text everywhere, not `tel:` links, while the two mobiles are properly linked. In the footer each landline is also given a **`printer` (fax) icon** with no label, and on `/contact/` the same printer icon labels a block titled "Landline". Meanwhile the JSON-LD on `index.html`, `about.html`, `facilities.html` and `press.html` publishes `+63 34 495 0808` as the resort's `telephone`. | Footer markup: `<li><i data-lucide="printer"></i><span>(034) 495-0808</span></li>` ×3, versus `<li><i data-lucide="phone"></i><span>Smart +63 922 851 2231</span></li>`. `contact.html:284-291`: label "Landline", icon `printer`, numbers unlinked. `index.html:52` JSON-LD: `"telephone": "+63 34 495 0808"`. | Mobile visitors cannot tap the landlines. The fax icon suggests these are fax lines, contradicting both the "Landline" label and the structured data. | Wrap the landlines in `tel:+6334495…` links and use the `phone` icon (reserve `printer` for genuine fax numbers, clearly labelled). Keep footer and contact page identical. | Tap each number on a phone; confirm the dialler opens with the right number. | Open |

### Low

| ID | Sev | Category | Page / file | Location | Description | Evidence | Impact | Recommended fix | Verification | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **L-01** | Low | HTML | 6 pages | `about.html:292`, `accommodations.html:398,418`, `function-rooms.html:719,743`, `press.html:463,490`, `restaurant.html:487` | `src=""` on modal placeholder `<img>` elements. An empty `src` resolves against the document URL; some engines request the page again as an image. | `html-validate`: 8 × `attribute-allowed-values` — `Attribute "src" has invalid value ""`. Targets `#nvr-lightbox-img`, `#roommodal-img`, `#storymodal-img`, `#pressmodal-img`. | Possible stray request; invalid markup. | Omit `src` until the script assigns one, or use a 1×1 transparent data URI. | Re-run `html-validate`; expect 0. | Open |
| **L-02** | Low | HTML / a11y | `about.html`, `accommodations.html`, `function-rooms.html`, `press.html` | `about.html:296`, `accommodations.html:~420`, `function-rooms.html:~745`, `press.html:468` | Modal title placeholders are empty `<h3>` elements, filled by script on open. They sit inside `hidden` dialogs, so axe does not flag them, but the outline dump shows `h2 → h3(empty) → h4`. | `html-validate`: 4 × `empty-heading`. Outline dump: `h3 (empty)` then `h4 Room Features` / `h4 Highlights` / `h4 Details`. | Cosmetic; no user-visible effect. | Give each placeholder default text the script overwrites. | Re-run `html-validate`; expect 0 `empty-heading`. | Open |
| **L-03** | Low | HTML | all 11 pages | `.nvr-burger` and `.nvr-mobile__close` in each header | Both buttons omit `type`, defaulting to `submit`. Neither is inside a form, so behaviour is unaffected. | `html-validate`: 22 × `no-implicit-button-type` (2 per page). | None. | Add `type="button"` to both. | Re-run `html-validate`. | Open |
| **L-04** | Low | Accessibility | all 11 pages | `<div class="nvr-mobile" id="mobile-menu" aria-hidden="true">` | The closed drawer marks a subtree of 15 focusable elements `aria-hidden="true"`. **Verified harmless in practice** — `styles.css:501` sets `visibility: hidden`, and tab-order dumps at 390 px and 1280 px show no drawer element receiving focus. `inert` would express the intent without the validator flag. | `html-validate`: 165 × `hidden-focusable` (15 × 11). Tab order at 390 px: skip link → logo → Open menu → hero CTAs → … (no `DRAWER:` prefix on any stop). Same at 1280 px. | None today; fragile if the CSS ever changes. | Add the `inert` attribute alongside `aria-hidden` when closed, and remove both when open. | Re-run `html-validate`; re-verify the tab order at both widths. | Open |
| **L-05** | Low | Consistency | 5 pages | `about.html:88`, `accommodations.html:92`, `contact.html:~104`, `function-rooms.html:91`, `restaurant.html:~92` | Five pages hard-code `is-active` on a nav item; `facilities`, `press`, `testimonials`, `dev` and `404` do not. `initActiveNav` sets and clears the class at runtime, so the static markup is redundant either way — but the inconsistency will confuse the next editor. | Header diffs: `is-active` present only on about, accommodations, contact, function-rooms, restaurant. | None. | Either drop all static `is-active` and rely on the script, or add it everywhere for a correct no-JS state. | Diff the 11 headers; confirm one convention. | Open |
| **L-06** | Low | HTML / performance | 6 pages | 15 images, e.g. `index.html:231`, `accommodations.html:226`, `restaurant.html` gallery | Declared `width`/`height` do not match intrinsic aspect ratio (e.g. `600x450` declared for a `2048x1365` file; `800x600` for `6016x4016`; `1024x683` for `1080x1080`). **No visual or layout-shift effect** — the containers pin `aspect-ratio` and images use `object-fit: cover`. | Measured declared vs intrinsic on all 11 pages: 15 mismatches >3%. `styles.css:634-635`: `.nvr-card__media { aspect-ratio: 4/3 }`, `.nvr-card__media img { width:100%; height:100%; object-fit:cover }`. | None observed; the attributes are simply inaccurate. | Set the attributes to each file's real intrinsic size (or to the container ratio consistently). | Re-run the comparison; expect 0 mismatches. | Open |
| **L-07** | Low | CSS | `assets/css/styles.css` | — | No `@media print` rules at all. Printing any page produces the full-bleed dark hero, the fixed header, the floating booking button and the navigation. | Runtime scan of the parsed stylesheet: 0 media rules whose `conditionText` matches `print`. | Guests printing a room list, directions or contact details waste ink and get a poor result. | Add a small print block: hide `.nvr-header`, `.nvr-mobile`, `.nvr-fab`, heroes and decorative media; set black-on-white body text; expand link hrefs. | Print-preview `/contact/`, `/accommodations/`, `/restaurant/`. | Open |
| **L-08** | Low | CSS | `assets/css/styles.css` | 70 `@media` blocks | 20 distinct breakpoints with no shared scale: 720 (×9), 620 (×8), 560 (×7), 900 (×5), 1000 (×4), 700 (×4), 480/640/860/940 (×3), 820/520/780/800 (×2), 1024/980/600/779/420/1040 (×1). Several are near-duplicates (779 vs 780, 800 vs 820, 980 vs 1000). | Breakpoint census over the comment-stripped stylesheet. | None visible (no overflow at any tested width), but each new component invents its own breakpoint. | Define 4–5 breakpoints as the house scale and migrate outliers, keeping any that are genuinely content-driven. | Re-test all five viewports for overflow and layout after consolidation. | Open |
| **L-09** | Low | SEO | `index.html`, `function-rooms.html`, `dev.html` | `<title>` / `<meta name=description>` | Three titles exceed the ~60-character display limit — index 64, function-rooms 63, dev 62 — and `dev.html`'s description is 180 characters (~160 displays). All titles and descriptions are otherwise unique and well written. | Measured lengths for all 11 pages; only these four exceed the guidance. | Minor truncation in search results. | Trim the three titles to ≤60 and the dev description to ≤160. | Re-measure. | Open |
| **L-10** | Low | SEO | 7 pages | `<head>` | `twitter:title` and `twitter:description` appear on only 4 of 10 indexable pages (contact, function-rooms, testimonials, dev). The others rely on the `og:` fallback, which works — the inconsistency is the issue. Note also `twitter:title` on `testimonials.html:23` says "Testimonials — Guest Stories" while `og:title` says "Guest Stories", so the two channels advertise different names. | Per-page presence matrix. `testimonials.html:10` vs `:23`. | None functionally. | Either add the pair everywhere or drop it everywhere; align the wording with `og:title`. | Re-run the matrix. | Open |
| **L-11** | Low | Documentation | `assets/js/custom.js`, `assets/docs/README.txt` | `custom.js:20,547,2062`; `README.txt` "Adding / updating the menu"; `custom.js:547,2062,2019,2186` | Four documentation drifts. (a) Three comments point at **`operating-brief.md` at the project root** — the file does not exist. (b) `README.txt` instructs the maintainer to "Double-click `qa\add-menu-pdf.cmd`" — `qa/` contains only `encode-hero-video.ps1` and `make-og-images.py`. (c) Section headers say "the **FormSubmit** integration contract" while the inline comments at both `fetch()` calls say "deliver … via **Formspree**" — the endpoint is FormSubmit. (d) `initImageFallback`'s comment says "Hotlinked photos can intermittently fail" — every image is now local. | `grep -rn operating-brief` → 3 hits, all in `custom.js`; no such file anywhere. `ls qa/` → 2 files. `custom.js:2019` / `:2186`: "via Formspree (see form's action attribute)" vs `action="https://formsubmit.co/…"`. | Wastes the next maintainer's time and can mislead a fix toward the wrong provider's API. | Either add `operating-brief.md` or move its content into `README.txt` and update the three references; add or de-document `add-menu-pdf.cmd`; correct "Formspree" → "FormSubmit"; refresh the image-fallback comment. | Confirm every referenced file exists and every named service matches the code. | Open |
| **L-12** | Low | SEO / structured data | `contact.html` | JSON-LD `address` | `"streetAddress": "Talisay City"` duplicates `"addressLocality": "Talisay City"`. The Google Maps embed on the same page shows the real street as "Talisay Highway". `contact.html` is also the only page whose JSON-LD includes `streetAddress` at all. | `contact.html` `PostalAddress`: `streetAddress` and `addressLocality` both "Talisay City". Map embed screenshot: "Talisay Highway, Talisay City, Metro Bacolod, 6115 Negros Occidental". | Slightly degraded local-SEO signal. | Set the real street address (confirm with the client) or omit `streetAddress`. Apply the same address object on every page. | Compare the JSON-LD address across all pages against the verified postal address. | Open |
| **L-13** | Low | Assets / deployment | `assets/images/**` | 3 directories, several filenames | Asset paths use uppercase segments, spaces and `&` — `Function Venue/`, `Organic Farm/`, `Pool and Park/`, `Pool&Park-1.webp`, `Home/June-22-6PM-1-1024x683.webp`, `Natures Village Resort.mp4`, 50 mixed-case segments in all. **Every reference is correctly percent-encoded and case-exact**, so nothing is broken — but `assets/docs/README.txt` states the house convention is "lowercase, hyphenated filenames with no spaces", and the image tree does not follow it. Spaces and `&` are also the characters most often mangled by FTP clients and archive tools. | Checked every `href`/`src`/`data-*gallery`/CSS `url()`: **0 raw spaces, 0 unescaped `&`**; encodings present (`Function%20Venue`, `Pool%26Park-1.webp`, `Natures%20Village%20Resort.mp4`). Case-exact filesystem resolution: **0 mismatches**. `README.txt` convention quoted above. | No breakage today; a rename or a careless upload would break silently on case-sensitive Hostinger. | If renaming, do it as one pass with a scripted find-and-replace across HTML/CSS/JS, then re-run the reference check. Otherwise document the exception in `README.txt`. | Re-run case-exact reference resolution; expect 0 missing. | Open |
| **L-14** | Low | Accessibility | all 11 pages | footer `.nvr-footer__list a`; `index.html` `.nvr-hero__scroll`; `.nvr-textlink` | Several targets fall below the 24 × 24 CSS-pixel minimum of WCAG 2.2 SC 2.5.8. At 360 px the eight footer nav links measure 20 px tall, the footer email link 22 px, and the homepage hero scroll cue 22 × 22. (The floating booking button is a healthy 50 × 50.) | Measured at 360 × 740 on all 11 pages: footer links `41x20` (About), `119x20` (Accommodations), `110x20` (Function Rooms), `59x20` (Facilities), `153x20` (The Village Restaurant), `80x20` (Press Room), `86x20` (Testimonials), `56x20` (Contact), `209x22` (email); `.nvr-hero__scroll` `22x22`. | Fiddly footer navigation on a phone; mis-taps between adjacent links. | Add ~6 px vertical padding to `.nvr-footer__list a` (or increase list `gap`) and grow the scroll cue to ≥24 × 24 (a transparent padded hit area preserves the visual size). | Re-measure at 360 px; assert every interactive box ≥24 × 24. | Open |
| **L-15** | Low | Accessibility | all 11 pages | `custom.js:290-308` (`initFab`) — `document.body.appendChild(a)` | The floating booking button is appended directly to `<body>`, outside `<header>`, `<main>` and `<footer>`, so it belongs to no landmark. This is the single most repeated axe violation on the site (11 of 15). | `axe-core`: `region`, impact moderate, `.nvr-fab`, 1 node on each of the 11 pages. | Screen-reader users navigating by landmark can miss the button. | Wrap it in `<aside aria-label="Booking">` or append it inside a landmark. | Re-run axe on all 11 pages; expect 0 `region`. | Open |
| **L-16** | Low | Accessibility | `index.html` | `<img alt="The Village Chapel">` in the facilities/spaces grid | The alt text repeats the adjacent visible label verbatim, so screen-reader users hear "The Village Chapel" twice. Same pattern as `alt="The Village Residence"` at `index.html:231` and `alt="Deluxe Room interior"`/`alt="Standard Room interior"` on the room cards. | `axe-core` on `/`: `image-redundant-alt`, impact minor, 1 node — "Element contains `<img>` element with alt text that duplicates existing text". | Minor verbosity. | Describe what the photograph shows, or use `alt=""` where the adjacent text already names it. | Re-run axe on `/`; expect 0 `image-redundant-alt`. | Open |
| **L-17** | Low | HTML | `404.html` | `87` — `<p class="nvr-lead" style="max-width: 46ch; margin-inline: auto;">` | The only inline `style` attribute on the site. | Inline-style census across all 11 pages: exactly 1. | None. | Move to a class in `styles.css`. | Re-run the census; expect 0. | Open |
| **L-18** | Low | JavaScript | `assets/js/custom.js` | `276-286` (`initImageFallback`) | The broken-image fallback binds `error` handlers only to images present at `DOMContentLoaded`. Images created later — room-modal thumbnails, the lightbox image, the story/press modal images — get no handler, so a failure there shows the browser's broken-image glyph instead of the `.nvr-img-broken` placeholder. | `document.querySelectorAll("img").forEach(...)` runs once from `init()`. The thumbnail strip is built in `initRoomModal`'s `open()` (`custom.js:812-828`); `#nvr-lightbox-img` gets its `src` in `show()`. | Cosmetic, and only when an image fails. | Add the `error` listener where each image is created, or use a capture-phase `error` listener on `document`. | Point a gallery entry at a missing file; confirm the placeholder appears inside the modal. | Open |
| **L-19** | Low | JavaScript | `assets/js/custom.js` | `1916-2035` (events) and `2055-2213` (contact) | The two form modules are near-identical: same `EMAIL_RE`, same `fieldOf`/`errorOf`/`setError`/`clearError`, same `validate` shape, same guest-count rule, same submit/`fetch`/success/error flow. They differ only in element-ID prefix (`ev-`/`cf-`), the required-field list, and the contact-only date comparison. ~120 lines duplicated. | Side-by-side read of both IIFEs. | None functional — but a fix applied to one (H-01, for instance) is easy to forget in the other. | Extract one `initValidatedForm(config)` taking the prefix, required fields, and extra rules. | Re-run the full form test matrix (§10) against both forms after refactoring. | Open |
| **L-20** | Low | `.htaccess` | `.htaccess` | HTTPS block; www block; clean-URL rewrite; `mod_deflate`; `mod_expires` | Four small items. (a) HTTP→HTTPS and www→apex are separate 301s, so `http://www.…` costs two redirects; the HTTPS rule preserves `%{HTTP_HOST}`, which is what makes the second hop necessary. (b) `RewriteRule ^([^/]+)/?$ /$1.html [L]` serves both `/about` and `/about/` with HTTP 200 and no redirect between them — canonical tags mitigate it, but two URLs serve one page. (c) `AddOutputFilterByType DEFLATE` omits `application/xml`/`text/xml` (so `sitemap.xml` is sent uncompressed) and `text/plain` (`robots.txt`). (d) `ExpiresByType` omits `application/pdf` (the 1.9 MB menu) and `image/svg+xml`. | `.htaccess` as read. | Slightly slower first hop from `http://www`; a duplicate-URL signal; the sitemap and menu PDF miss compression/caching. | (a) Combine into one rule that rewrites scheme and host together. (b) Add a 301 from the no-slash form to the trailing-slash form. (c) Add `application/xml text/xml text/plain` to the DEFLATE list. (d) Add `ExpiresByType application/pdf "access plus 1 month"` and an SVG entry. | On Hostinger: `curl -I` each variant and count hops; check `Content-Encoding` on `/sitemap.xml` and `Cache-Control` on the PDF. | Open |
| **L-21** | Low | Content / icons | `restaurant.html` | `516-520` (toolbar) and `546-549` (fallback) | Both links to the menu PDF use `data-lucide="download"` but open the file in a new tab rather than downloading it — the toolbar link is even labelled just "PDF" with `aria-label="Open the original menu PDF in a new tab"`. | Markup as quoted: `<i data-lucide="download"></i><span>PDF</span>` on `target="_blank"` links with no `download` attribute. | Small expectation mismatch. | Use `external-link` (or `file-text`), or add `download` if downloading is the intent. | Click both; confirm the icon matches what happens. | Open |
| **L-22** | Low | SEO / `.htaccess` | `.htaccess`, `404.html` | clean-URL rules + `ErrorDocument 404 /404.html` | A direct request for `/404.html` is 301'd to `/404/`, which then serves the page with **HTTP 200**. The error page is therefore reachable at a success-status URL. Genuine missing paths behave correctly (404 status with the styled page — verified locally), and `404.html` carries `noindex`, so the exposure is small. | Local rewrite-emulating server: `/nonexistent/` → **404**, 10,472 bytes of `404.html`; `/404.html` → 200. The `.html`→`/slug/` redirect rule matches `404.html` like any other page. | Negligible; a crawler could index a soft-404 URL if `noindex` were ever removed. | Exclude `404.html` from the `.html`→`/slug/` redirect, or add a rule returning 404 for `/404/`. | On Apache: `curl -I` for `/404.html`, `/404/` and a random missing path. | Open |
| **L-23** | Low | SEO | `sitemap.xml` | all 9 `<url>` entries | No `<lastmod>` on any entry. `changefreq` and `priority` are present but are largely ignored by Google; `lastmod` is the element it actually uses. | Sitemap contains `changefreq` and `priority` only. | Slower re-crawl of updated pages. | Add `<lastmod>` per URL and update it on publish (a small script alongside `qa/make-og-images.py` could generate the file). | Validate the sitemap; confirm each `lastmod` matches the page's last content change. | Open |
| **L-24** | Low | Content consistency | `press.html`, `restaurant.html`, `about.html` | `press.html:210`, `press.html:177`, `restaurant.html` menu section, `about.html` | Four wording items. (a) `press.html:210` quotes "Nature's Village Resort **in Bacolod**" while the resort is in Talisay City — faithful to the original article, but a reader may take it as the site's own claim. (b) `press.html:177` uses the UNEP title "Nature's Village **Hotel**" — also a faithful third-party title, but "Hotel" appears nowhere else on the site. (c) Mixed spelling variants: "Negrense **Favourites**" (BrE) alongside American spellings elsewhere; "**programme**" once against "program" three times. (d) `press.html` heading "Downloads" introduces a panel that offers nothing to download — assets are "available on request" by email. | (a)(b) as quoted. (c) `grep` over 5,501 words of rendered text: "Favourites" ×1, no "Favorites"; "programme" ×1, "program" ×3. (d) `press.html` "Assets for editors & journalists" → `<h3>Downloads</h3>` → "available on request". | Small credibility wobbles on the page whose job is credibility. | (a)(b) Add a bracketed clarification or an "as published" note. (c) Pick one English variant and apply it. (d) Rename to "Press kit on request", or host the files. | Re-read the press page end to end; re-run the variant grep. | Open |

### Informational

| ID | Category | Item | Detail | Recommended action |
|---|---|---|---|---|
| **I-01** | Forms | **FormSubmit delivery requires manual verification** | Both forms post to `https://formsubmit.co/ajax/nvrsales@gmail.com`. Not exercised live: a real submission would email the client and could consume FormSubmit's one-time activation. Configuration looks complete but minimal — only a `_subject` hidden field; no `_honeypot`, no `_next`, no `_template`, no `_cc`. Validation, error handling, success handling and the network-failure path were all verified with the endpoint intercepted. | Submit one real test enquiry from each form, confirm arrival at the destination inbox, and complete FormSubmit activation if still pending. Consider adding `_honeypot` for spam resistance. |
| **I-02** | External links | **Facebook link inconclusive** | `https://facebook.com/NVROfficialPage` returns HTTP 400 to `curl` even with a desktop browser User-Agent, for both the apex and `www` forms. Facebook commonly refuses non-browser clients, so this is not evidence of a broken link. | Open the link in a browser and confirm it reaches the resort's page. |
| **I-03** | External links | **Social handles need ownership confirmation** | `instagram.com/naturesvillageresort` → 200, `tiktok.com/@naturesvillageresort` → 200, `twitter.com/naturesvillage` → 200 (redirects to `x.com/naturesvillage`). X and TikTok return 200 for non-existent handles, so status alone proves nothing. The X handle also differs in form from the others (`naturesvillage`, not `naturesvillageresort`). | Open all four in a browser and confirm each is the resort's official account. |
| **I-04** | Privacy / performance | Google Fonts loaded from Google's CDN | Three families (Fraunces, Manrope, Poppins) from `fonts.googleapis.com`/`fonts.gstatic.com` on all 11 pages, ~110 KB. Transfers visitor IPs to Google — a documented GDPR concern for EU visitors. See also **M-13**. | Consider self-hosting subset WOFF2 files; this also removes two `preconnect` origins and two CSP entries. |
| **I-05** | Security / privacy | Recipient address visible in page source | `nvrsales@gmail.com` appears in the `action` of both forms. Inherent to FormSubmit's plain-email endpoint form and not a vulnerability, but it does publish a staff inbox to scrapers. | Switch to FormSubmit's random-token endpoint so the address is not in the HTML. |
| **I-06** | Deployment | Site requires a web server | All CSS/JS/image/PDF references are root-absolute (`/assets/…`), so the pages do not render from `file://`. Correct for Hostinger; the menu viewer even has a dedicated `file://` branch. Worth knowing before anyone previews by double-clicking an HTML file. | None — record the expectation. |
| **I-07** | Deployment | Hostinger module dependencies | `.htaccess` relies on `mod_rewrite`, `mod_headers`, `mod_expires`, `mod_deflate` and `mod_mime`. All are `<IfModule>`-guarded, so a missing module degrades rather than 500s — but silently: clean URLs, CSP, caching or compression could all be absent with no error. | After deploying, verify on the live host: a clean URL resolves, `Content-Security-Policy` and `Strict-Transport-Security` are present, CSS returns `Content-Encoding: gzip`, and an image returns a one-year `Cache-Control`. |
| **I-08** | Method | Local-server artifacts | The test server sends no `Content-Encoding` (so §12 text figures are uncompressed) and does not support HTTP Range — which is the sole cause of the one console warning observed and of the repeated video requests in the network log. | None — accounted for in §4 and §11. |
| **I-09** | Method | Screenshot artifacts | Full-page screenshots do not fire the `IntersectionObserver` that reveals `.nvr-reveal` sections, producing blank bands in the captures. Verified by scrolling stepwise instead: **0** elements remained unrevealed on any page. | None — do not treat full-page captures of this site as layout evidence. |
| **I-10** | Cross-browser | Only Chromium tested | Not exercised: WebKit `<video>` muted-autoplay (`defaultMuted`/`playsinline` are handled in code), `navigator.pdfViewerEnabled` in Safari < 16.4 and Firefox < 97, `-webkit-appearance: none` form rendering, and `visibility`-transition focus timing in the drawer. | Spot-check `/`, `/restaurant/`, `/contact/` and `/accommodations/` in Safari (iOS and macOS) and Firefox. |

---

## 8. Console errors and failed resources

**Zero JavaScript errors and zero failed network requests across all 11 pages.** Each page was loaded in Chromium at 1280 × 800, held for 2.5 s after `load`, then resized through five viewports; `console`, `pageerror`, `requestfailed` and every response with status ≥ 400 were captured.

| Page | Console errors | Console warnings | Failed requests | HTTP ≥400 |
|---|---:|---:|---:|---:|
| `/` | 0 | 1 (harness artifact, see below) | 0 | 0 |
| `/about/` | 0 | 0 | 0 | 0 |
| `/accommodations/` | 0 | 0 | 0 | 0 |
| `/contact/` | 0 | 0 | 0 | 0 |
| `/facilities/` | 0 | 0 | 0 | 0 |
| `/function-rooms/` | 0 | 0 | 0 | 0 |
| `/press/` | 0 | 0 | 0 | 0 |
| `/restaurant/` | 0 | 0 | 0 | 0 |
| `/testimonials/` | 0 | 0 | 0 | 0 |
| `/dev/` | 0 | 0 | 0 | 0 |
| `/404.html` | 0 | 0 | 0 | 0 |

The one warning:

```
[WARNING] [nvr] Hero video: could not seek to 5s — the server may not support HTTP Range
requests. Playing from the start instead.
  at assets/js/custom.js:462
```

**Resolved in fix pass 1** — H-03 sets `data-hero-video-start="0"`, so no seek is attempted and the warning is gone (all 11 pages now report zero console output). What follows is the original diagnosis. This is the site's own diagnostic firing correctly against a test server that does not implement Range. Apache does, so it should not appear in production — but it is worth re-checking on Hostinger, because if it *does* appear, the hero will play the 5 seconds the encode script is meant to trim. Fixing **H-03** removes the offset entirely (`data-hero-video-start="0"`).

The homepage network log also shows the video fetched four times (200, `ERR_ABORTED`, 200, 206) — the seek-retry loop reacting to the missing Range support. Same root cause; not a site defect.

**Interactive flows** were separately monitored for `pageerror`: mobile drawer, room modal, lightbox, story modal, press modal, menu booklet (including 9 s of pdf.js work), and both forms across every validation branch — **0 page errors in every case**.

**Third-party resources all resolved:** `unpkg.com` Lucide (200, SRI hash verified byte-identical on both unpkg and jsDelivr), Google Fonts CSS and 4 WOFF2 files (200), `static.elfsight.com/platform/platform.js` (200) plus 4 further Elfsight hosts, and the Google Maps embed on `/contact/` (200, renders).

**Under the production CSP** (enforced verbatim from `.htaccess`): **zero violations** on `/`, `/about/`, `/accommodations/`, `/contact/`, `/function-rooms/`, `/press/`, `/restaurant/`. The only violation found in the whole audit was the deliberately-reproduced PDF-embed fallback (**H-02**).

---

## 9. Complete broken-link list

Every link on all 11 pages was extracted and checked: internal paths against both the filesystem (case-exact) and live HTTP; in-page and cross-page anchors against the actual `id` attributes of the target page; external URLs with `curl`.

**Internal links and HTML asset references: 0 broken.** (CSS `url()` was outside this check as first run; extending it found one broken background, now fixed — see §0.)

- Local resource references checked (`href`, `src`, `poster`, `data-pdf`): **0 missing, 0 case mismatches.**
- Internal page links and anchor targets over HTTP: **0 problems.** Every anchor target exists — `/#intro`, `/facilities/#chapel`, `/facilities/#farm`, `/facilities/#park`, `/function-rooms/#venues`, `/function-rooms/#enquire`, `#main` on all 11 pages.
- Anchors without `href`: 0.
- `target="_blank"` without `rel="noopener"`: **0** — including the two links the script injects (`.nvr-fab` and the modal CTA), both of which set `rel="noopener"` in code.
- URL encoding: **0 raw spaces, 0 unescaped `&`** in any reference, despite three directories with spaces and three filenames containing `&`.

### Wrong-destination and suspicious links

| Source page | Link text | Destination | Issue | Recommended fix | Finding |
|---|---|---|---|---|---|
| `dev.html:136` (mobile drawer) | Testimonials | `/dev/` | Points at the current page instead of `/testimonials/`. Returns 200, so status-code checking cannot catch it. | Change to `/testimonials/` | **M-02** |
| all 11 footers, `contact.html:284-291` | `(034) 495-0808`, `495-3368`, `495-3369` | *(no link)* | Landlines are plain text while mobiles are `tel:` links; footer also labels them with a fax icon. | Wrap in `tel:` links; use the `phone` icon | **M-17** |
| all 11 footers | *(social icons)* | `https://facebook.com/NVROfficialPage` | HTTP 400 to non-browser clients — inconclusive, not confirmed broken. | Verify in a browser | **I-02** |
| all 11 footers | *(social icons)* | `twitter.com/naturesvillage`, `tiktok.com/@naturesvillageresort` | 200, but these platforms return 200 for any handle. The X handle also differs in form from the other three. | Verify ownership in a browser | **I-03** |

### External links verified reachable

| URL | Status | Used on |
|---|---|---|
| `https://staahmax.staah.net/be/index_be?propertyId=Mjk5Ng==&individual=true` | 200 | all 11 pages (header CTA, FAB, hero, cards, modals) |
| `https://instagram.com/naturesvillageresort` | 200 | all 11 footers |
| `https://tiktok.com/@naturesvillageresort` | 200 | all 11 footers |
| `https://twitter.com/naturesvillage` | 200 (→ `x.com`) | all 11 footers |
| `https://unpkg.com/lucide@1.28.0/dist/umd/lucide.min.js` | 200, SRI verified | all 11 pages |
| `https://cdn.jsdelivr.net/npm/lucide@1.28.0/dist/umd/lucide.min.js` | 200, same SHA-384 | fallback in `custom.js` |
| `https://static.elfsight.com/platform/platform.js` | 200 | `index.html` |
| `https://formsubmit.co/` | 200 | form endpoint host |
| `https://www.google.com/maps?q=…&output=embed` | 200 | `contact.html` |
| `https://kennali.dev/` | 200 | `dev.html` |
| `https://wa.me/639186044171` | 200 | `dev.html` |
| `https://www.linkedin.com/in/kenn-jan-ali-b5aba1121/` | 999 | `dev.html` — LinkedIn's standard anti-bot response, not a broken link |
| `mailto:info@naturesvillageresort.com` | n/a | all 11 pages |
| `mailto:kennkennali@gmail.com` | n/a | `dev.html` |
| `tel:+639228512231` | n/a | `contact.html`, `restaurant.html` |
| `tel:+639173007576` | n/a | `contact.html` |

The Lucide SRI hash deserves a note: the `integrity` attribute in the HTML and the hash hard-coded for the jsDelivr fallback in `custom.js:88` are **both** `sha384-VrnzGPiSyQxm3mI2VhlssyR85zugSHtxMkgO42qV3wUAbNk1oRdZkCWjXKOhuVu6`, and independently computing the SHA-384 of the file served by each CDN produces exactly that value. The mirror really is byte-identical, as the comment claims.

---

## 10. Form-testing summary

Two forms exist. Both were tested with the FormSubmit endpoint intercepted (see **I-01**).

| | Contact form | Events / enquiry form |
|---|---|---|
| Page | `contact.html:169` | `function-rooms.html:575` |
| `id` | `contact-form` | `events-form` |
| Action | `https://formsubmit.co/ajax/nvrsales@gmail.com` | `https://formsubmit.co/ajax/nvrsales@gmail.com` |
| Method | `POST` | `POST` |
| Hidden fields | `_subject` | `_subject` |
| Required | name, email, subject, message | name, email, event type, message |
| Optional | phone, guests (1–200), check-in, check-out | phone, venue (25 options), date, guests (1–2000) |
| Validation module | `custom.js:2055-2213` | `custom.js:1916-2035` |

### Test matrix

| # | Test | Contact | Events | Notes |
|---|---|---|---|---|
| 1 | Every input has a programmatically associated `<label for>` | ✅ | ✅ | 8 and 7 fields respectively |
| 2 | Required fields marked `required` + `aria-required="true"` + visible `*` (`aria-hidden` on the glyph) | ✅ | ✅ | |
| 3 | Each field has `aria-describedby` → its own error paragraph | ✅ | ✅ | |
| 4 | Empty submit blocks and reports every missing field | ✅ | ✅ | Contact: 4 errors — "Please enter your full name." / "…your email address." / "…a subject." / "…a short message." Events: 4 errors on `ev-name`, `ev-email`, `ev-type`, `ev-message` |
| 5 | `aria-invalid="true"` set on failing fields | ✅ | ✅ | Contact: `cf-name`, `cf-email`, `cf-subject`, `cf-message` |
| 6 | Focus moves to the first invalid field | ✅ | ✅ | `document.activeElement.id === "cf-name"` |
| 7 | Invalid email rejected | ✅ | ✅ | `not-an-email` → "Please enter a valid email address." |
| 8 | Values retained after a validation error | ✅ | ✅ | name "Test Person" and message intact after 3 failed submits |
| 9 | Errors clear as the guest corrects the field | ✅ | ✅ | `input`/`change` listeners on all 8 / 7 fields |
| 10 | Guest count must be positive | ✅ | ✅ | `0` → "Please enter a valid number of guests." |
| 11 | Check-out cannot precede check-in | ✅ | n/a | `2026-09-10` → `2026-09-05` → "Check-out cannot be before check-in." |
| 12 | Valid submit reaches the network | ✅ | ✅ | `fetch(form.action, {method:'POST', body:FormData, headers:{Accept:'application/json'}})` |
| 13 | Submit button disabled during the request | ✅ | ✅ | `submitBtn.disabled = true` before `fetch` |
| 14 | Submit button re-enabled after failure | ✅ | ✅ | `.finally()` — measured `isDisabled() === false` after an aborted request |
| 15 | Network failure shows an error, not a false success | ✅ | ✅ | `#contact-form-submit-error` visible, `role="alert"`, offers a direct mailto |
| 16 | Success panel shown on HTTP 200 | ✅ | ✅ | "Thank you — your note is on its way." / "…your enquiry is on its way." |
| 17 | Focus moves to the success message | ✅ | ✅ | `tabindex="-1"` + `focus()` + `scrollIntoView` |
| 18 | **Form hidden on success** | ✅ | ✅ | Was ❌ / ❌ — **H-01**, `display:grid` defeated `hidden` and the form stayed 735 px / 778 px tall. **Fixed in pass 1**: both now measure `display:none`, height 0 |
| 19 | Visible focus indicator on every field | ✅ | ✅ | Was ❌ / ❌ — **H-04**, `outline:none` plus a 2.16–2.37:1 underline. **Fixed in pass 1**: 16/16 fields show the 2px brass-ink ring at 5.77:1 |
| 20 | Keyboard-only completion | ✅ | ✅ | All controls reachable and operable by Tab/typing/Space; select is a native `<select>` |
| 21 | Usable on mobile | ✅ | ✅ | 390 px: single column, no overflow, correct `inputmode`/`autocomplete`/`type` (`tel`, `email`, `number`, `date`) |
| 22 | Sensible autocomplete | ✅ | ✅ | `autocomplete="name"`, `"email"`, `"tel"` |
| 23 | No sensitive data mishandled | ✅ | ✅ | No passwords or payment fields; POST body only; no logging to console; no local storage (verified: `localStorage` empty on both pages) |
| 24 | Delivery to the intended destination | ⚠️ | ⚠️ | **I-01** — requires manual verification |
| 25 | No-JS fallback | ❌ | ❌ | **M-15** — `novalidate` + JS-only handler; a native post hits the `/ajax/` endpoint |

**Third-party service:** FormSubmit (`formsubmit.co`), AJAX endpoint, keyed on the raw address `nvrsales@gmail.com`. Correctly allowed in the CSP under both `connect-src` and `form-action`. Configuration is minimal but functional for AJAX use; no honeypot or `_next` (see **I-01**, **I-05**, **M-15**).

---

## 11. Pages requiring manual browser verification

Everything below was checked as far as automation honestly allows; each item needs a human, a real browser, or the live host.

| Page / area | What to verify | Why automation can't |
|---|---|---|
| `/contact/` and `/function-rooms/` forms | Send one real test enquiry from each; confirm arrival at the destination inbox; complete FormSubmit activation if pending | Would email the client and could consume the one-time activation (**I-01**) |
| All 11 footers — 4 social links | Open each in a browser; confirm each is the resort's official account | Facebook returns 400 to non-browsers; X and TikTok return 200 for any handle (**I-02**, **I-03**) |
| Whole site on Hostinger | Clean URL resolves; `http://www` reaches `https://` apex; a missing path returns HTTP 404 with the styled page; `Content-Security-Policy` and `Strict-Transport-Security` present; CSS `Content-Encoding: gzip`; image `Cache-Control` one year; fonts and MP4 served with correct MIME types | `.htaccess` is not interpreted by the test server (**I-07**, **L-20**, **L-22**) |
| `/` hero video | On the live host, confirm no Range warning in the console and that playback starts at the intended frame | Test server lacks Range support (**I-08**) |
| `/restaurant/` menu booklet | Safari (iOS + macOS) and Firefox: booklet renders, swipe paging works, zoom works; then with an ad-blocker enabled, confirm the fallback chain | Only Chromium tested; the embed fallback also needs **H-02** fixed first (**I-10**) |
| `/` hero video, Safari/iOS | Muted autoplay actually starts (`defaultMuted` + `playsinline` are handled in code but untested) | WebKit not available (**I-10**) |
| All pages, Safari/Firefox | Form controls with `-webkit-appearance: none`, native `<input type="date">` rendering, drawer focus timing across the `visibility` transition | Only Chromium tested (**I-10**) |
| `/testimonials/` | Confirm the true guest rating and its source with the client | Factual question, not a technical one (**M-12**) |
| `/accommodations/` and `/` room cards | Confirm with the client which photographs actually show the Deluxe Room and The Village Residence(s) | Requires knowledge of the property (**M-04**, **M-05**) |
| `press.html` | Confirm the 11 press items, dates, sources and award citations against the originals | Cannot verify third-party facts |
| All pages | A real screen reader (NVDA/JAWS/VoiceOver) pass over the six overlays and both forms | axe and scripted keyboard tests cover structure and focus, not announcement quality |

---

## 12. Positive findings

Recorded because they are load-bearing and should survive any fix pass.

**Links and structure**
1. **Zero broken links** — every `href`, `src`, `poster` and `data-pdf` across 11 pages resolves, case-exact, on the filesystem and over HTTP. (Originally measured over HTML references only; a later pass extended the check to CSS `url()` and found one broken background, now fixed — see §0.)
2. **Every anchor target exists.** All eight distinct in-page and cross-page fragments resolve to real `id` attributes.
3. **All URLs correctly percent-encoded** despite three directories with spaces and three filenames containing `&` — 0 raw spaces, 0 unescaped ampersands.
4. **Zero duplicate IDs** on any page, statically and at runtime.
5. Exactly one `<h1>` per page; no heading-level skips in visible content.
6. Header, footer and mobile drawer markup are **byte-identical across all 11 pages** (single exception: **M-02**) — impressive discipline for hand-maintained HTML.
7. `<header>`/`<main id="main">`/`<footer>` landmarks and a working skip link on all 11 pages.

**Responsive**
8. **Zero horizontal overflow** in 55 measurements (11 pages × 5 viewports from 360 px to 1920 px).
9. No cut-off content, overlapping elements, broken grids, text overflow, or distorted images at any width.
10. Containers pin `aspect-ratio` and images use `object-fit: cover`, so images reserve their space and cannot shift layout.
11. The menu booklet adapts genuinely: two-page spread with a spine on desktop, single page on mobile, and the decision keys off the *shape* of the space, not width alone.

**JavaScript and interaction**
12. **Zero console errors and zero failed requests** on all 11 pages, and zero page errors across every interactive flow tested.
13. Every one of the 15 JavaScript features works on the page that uses it (§6.6 table).
14. **All Lucide icons render on every page** — 0 unrendered `<i data-lucide>` placeholders, 15–73 SVGs drawn per page.
15. Six overlays — drawer, lightbox, room modal, story modal, press modal, menu booklet — each with a focus trap, Escape, and focus restoration to the trigger. Verified individually.
16. **Stacked-dialog handling is correct**: opening the lightbox from a press or room modal and pressing Escape closes only the lightbox; the dialog underneath survives, and the shared scroll lock is counted rather than toggled, so it never releases early.
17. Progressive enhancement is real, not claimed: without JavaScript all content is present and readable (1,162–4,884 characters of `#main` text per page), reveal animations do not hide anything, the footer year has a hard-coded fallback, and the menu trigger remains a working link to the PDF.
18. `prefers-reduced-motion` is genuinely honoured: hero video suppressed, reveals shown immediately, page transitions skipped entirely rather than merely shortened.
19. The hero video degrades to its poster on six independent failure paths (missing file, network, refused autoplay, reduced motion, `saveData`, no seek support) and never removes the photograph.
20. The menu booklet has a four-step documented degradation chain, three CDN mirrors, a same-origin blob worker shim, and — notably — distinguishes "the file is missing" (operator's problem) from "this browser can't run the viewer" (guest's browser) and words the message differently for each.

**Accessibility**
21. **Zero `axe-core` colour-contrast violations** on any page. The palette work — including the documented brass → brass-ink substitution for small text and focus rings — holds up.
22. Only 15 axe violations site-wide, 11 of which are one repeated item (**L-15**); one "serious" (**M-03**).
23. Every image on every page has an `alt` attribute; decorative icons are `aria-hidden`; the hero video is kept out of both the accessibility tree and the tab order.
24. Form errors are announced correctly: `aria-describedby` + `aria-invalid` + focus to the first invalid field; submit-level errors carry `role="alert"`; success panels take focus.
25. Thoughtful details: visually-hidden labels on press-modal meta rows so a date is announced as a date; `aria-current="page"` on the active nav link; `aria-live="polite"` on the booklet page counter; a described `role="img"` on each rendered menu canvas; `aria-haspopup="dialog"` added to the menu trigger.
26. Closed-drawer links are genuinely unfocusable (verified at two widths) despite the validator's `aria-hidden` warning.

**SEO**
27. Unique, well-written `<title>` and meta description on **all 11 pages** — no duplicates.
28. Canonical + full Open Graph + `twitter:card` + `theme-color` + `robots` on all 10 indexable pages; `404.html` correctly `noindex, follow` with no canonical.
29. **All six OG cards exist at exactly 1200 × 630 JPEG** with declared width/height/type/alt — and are reproducible from source via `qa/make-og-images.py`.
30. Type-appropriate JSON-LD per page (`Resort`, `AboutPage`, `EventVenue`, `Restaurant`, `WebPage`, `Person`) plus breadcrumbs on 9 pages; every block parses as valid JSON.
31. **`robots.txt` and `sitemap.xml` both reference the correct production domain.** No staging or development URLs anywhere; sitemap is valid XML with no duplicates and correctly excludes `404.html`.
32. A real styled 404 page that returns HTTP 404 for genuine missing paths, with `noindex` and full navigation.

**Performance**
33. `loading="lazy"` on every content image; `fetchpriority="high"` and explicit dimensions on the LCP hero; per-page hero `preload`.
34. `defer` on both scripts; `preconnect` to all three third-party origins; `?v=` cache-busting on CSS and JS, both matching their file dates.
35. WebP throughout (except the 6 intentional OG JPEGs and 5 strays).
36. The review widget is lazy (`data-elfsight-app-lazy`), the map iframe is `loading="lazy"`, and pdf.js is warmed on pointer/focus intent rather than page load — so guests who never open the menu never pay for the library.
37. `.htaccess` sets a full caching and compression policy, one-year immutable-style expiry for media, and forces the font and video MIME types that shared hosting often gets wrong.

**Security and code quality**
38. **The CSP produced zero violations on every page's primary path** when enforced verbatim — and it is strict where it counts: no `'unsafe-inline'` and no `'unsafe-eval'` in `script-src`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`. Every allowed origin carries a comment explaining what breaks without it.
39. **SRI on the Lucide script, independently verified** — the hash matches the bytes served by unpkg *and* by the jsDelivr mirror, so the fallback is honestly pinned.
40. Complete security header set: `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, a locked-down `Permissions-Policy`, one-year HSTS.
41. **No inline `<script>`, no inline event handlers, no `javascript:` URLs, no `eval`, no `innerHTML` from untrusted input** — user-supplied strings go through `textContent`. Only one inline `style` attribute site-wide.
42. Local-only folders (`_unused`, `qa`, `.playwright-mcp`, `.claude`) are refused with `[F,L]`, and `Options -Indexes` is set.
43. Every `target="_blank"` carries `rel="noopener"`, including the two the script creates at runtime.
44. **No exposed secrets, credentials, API keys or tokens anywhere** in the HTML, CSS or JS.
45. Token-driven stylesheet with **all custom properties used and none dead**, only 7 `!important` declarations, no genuine duplicate rule blocks, and 33% of it explanatory comments that consistently record *why* rather than *what*.
46. **No placeholder content anywhere** — no lorem, TODO, FIXME, `example.com`, "coming soon" — and no WordPress leftovers despite the codebase's WordPress origins.
47. **No spelling or grammar errors** in 5,501 words of rendered copy.
48. `qa/` contains two reproducible, well-documented generator scripts (OG cards, hero video encode) so those assets are rebuildable rather than hand-made one-offs.
49. The menu PDF has a real text layer (1,495–1,825 characters per page), so the canvas booklet's "use the PDF link for the actual text" accessibility fallback genuinely works.

---

## 13. Prioritised fix plan

### Fix first — before or immediately after launch (5 findings)

| Order | ID | Why first | Rough effort |
|---|---|---|---|
| 1 | **H-01** | Both contact paths visibly appear to fail after a successful send. One CSS rule. | 1 line + retest |
| 2 | **H-02** | Silently kills the menu viewer's fallback for anyone whose network blocks the CDNs. One CSP token. | 1 word + retest |
| 3 | **H-03** | 36.9 MB on the homepage. The fix script is already written and prints the exact edit. | run script + 2 attributes |
| 4 | **H-04** | The one page that asks for input is the one with no visible focus. Contradicts the stylesheet's own documented decision. | 2 declarations |
| 5 | **H-05** | The events page's primary CTA appears to do nothing. | ~10 lines |

Fixes 1, 2 and 4 are each a one-or-two-line change with an obvious test. Do them together.

### Fix next — before handover (17 findings)

**Navigation and content accuracy** (guest-facing, low effort)
- **M-02** — `dev.html` Testimonials link → `/testimonials/` *(1 line)*
- **M-01** — reconcile desktop nav with the mobile drawer
- **M-04**, **M-05** — the Deluxe Room and Village Residence photographs, and their alt text *(needs client input)*
- **M-06** — settle one name per entity across nav, footer, title, heading, breadcrumb and JSON-LD
- **M-17** — `tel:` links and the correct icon for the landlines
- **M-12** — confirm the real rating and cite it, or drop the number *(needs client input)*

**Compliance and correctness**
- **M-13** — privacy policy + form notice *(needs client input; may need legal review)*
- **M-11** — remove or repair the self-serving review markup
- **M-15** — a working no-JS form path
- **M-03** — replace the `role="button"` card pattern with real buttons
- **M-07** — valid content inside the press-item buttons
- **M-14** — make the sitemap and `/dev/`'s robots directive agree

**Performance** (do as one pass)
- **M-08** — `srcset`/`sizes` on card and gallery images; re-encode the multi-megabyte originals
- **M-09** — OTF → subset WOFF2; Lucide bundle → self-hosted SVG sprite (also simplifies the CSP)
- **M-10** — quarantine the 68 MB of unreferenced images; collapse the 5 duplicate pairs

**Code quality**
- **M-16** — delete the ~500 lines of dead component CSS (21 unused selectors; `.testi-masonry` and `.testi-rating` were already removed in pass 2)

### Optional improvements (24 findings)

Group them so each touches one file:

- **`.htaccess`** — **L-20** (redirect chain, trailing-slash 301, DEFLATE for XML/plain, Expires for PDF/SVG), **L-22** (`/404/` returning 200)
- **`styles.css`** — **L-07** (print stylesheet), **L-08** (breakpoint consolidation), **L-17** (move the one inline style in)
- **HTML hygiene, all pages** — **L-01** (`src=""`), **L-02** (empty headings), **L-03** (`type="button"`), **L-04** (`inert` on the closed drawer), **L-05** (one `is-active` convention), **L-06** (accurate `width`/`height`)
- **Accessibility polish** — **L-14** (tap-target sizes), **L-15** (FAB inside a landmark), **L-16** (redundant alt text)
- **SEO polish** — **L-09** (title/description lengths), **L-10** (consistent `twitter:*`), **L-12** (`streetAddress`), **L-23** (`lastmod`)
- **JavaScript** — **L-18** (image fallback for dynamic images), **L-19** (extract one shared form module — worth doing *before* **H-01** and **M-15** so each is fixed once, not twice), **L-21** (menu link icon)
- **Documentation and content** — **L-11** (`operating-brief.md`, `add-menu-pdf.cmd`, "Formspree" → "FormSubmit", stale image-fallback comment), **L-13** (asset naming vs the documented convention), **L-24** (quoted-source clarifications, one English variant, the "Downloads" heading)

### Verification pass after any fix

Re-run the same evidence-gathering, so the numbers stay comparable:

1. Case-exact reference resolution + live HTTP link and anchor crawl — expect **0** problems.
2. All 11 pages in Chromium — expect **0** console errors and **0** failed requests.
3. Overflow sweep at 360 / 390 / 768 / 1280 / 1920 — expect **0** overflow in 55 measurements.
4. `axe-core` on all 11 pages — expect fewer than the current 15 violations and **0** "serious".
5. `html-validate` — expect a drop from 247 messages, with **0** `element-permitted-content` and **0** `attribute-allowed-values`.
6. The 25-row form matrix in §10 against both forms.
7. The CSP-enforcing server across all pages, **plus** the `useEmbed()` reproduction — expect **0** violations including the PDF frame.
8. Per-page weight table in §6.9 — expect the homepage video near 2 MB and the fixed per-page overhead well below 945 KB.
9. Interactive re-test of all six overlays for focus trap, Escape, focus restore, and the stacked-dialog Escape guard.
10. Manual items from §11 — forms, social links, Hostinger headers, Safari/Firefox.

---

## 14. What changed on disk

During the **audit phase**, nothing under `c:\dev\nvr-custom` was created, edited or deleted except this report.

**Fix pass 1** (2026-08-23, on the approval "Fix first") then changed exactly these files — see §0:

| File | Change |
|---|---|
| `assets/css/styles.css` | H-01 (two `[hidden]` guards), H-04 (two `outline: none` removals), `.dev-hero` background path |
| `.htaccess` | H-02 (`frame-src 'self'` + comment) |
| `assets/js/custom.js` | H-05 (same-page CTA handler on `#roommodal-cta`) |
| `index.html` | H-03 (hero video source + start offset + comment), JS cache-buster |
| `dev.html` | preload target, JS cache-buster |
| the other 9 `.html` files | JS cache-buster only |
| `assets/video/nvr-hero.mp4` | **new** — built by `qa/encode-hero-video.ps1` from the existing master |

**Fix pass 2** (same day, on the request to clear the orphans and integrate the new reviews embed) — see §0b:

| File | Change |
|---|---|
| `testimonials.html` | Embed wrapped in `.nvr-container` + `.nvr-reviews--tall .nvr-reveal`; platform `<script>` moved to end of `<body>`; JSON-LD `review[]` removed; `.testi-rating` markup removed |
| `assets/css/styles.css` | Added `.nvr-reviews--tall`; removed the `.testi-masonry` and `.testi-rating*` blocks and the stale `testi-rating__score` selector |
| `.htaccess` | Added `https://elfsightcdn.com` to `script-src` and `connect-src`, with an expanded comment |

**Nothing was deleted.** The 1080p master is untouched on disk. `robots.txt`, `sitemap.xml`, the menu PDF, the font and all 293 images are unchanged.

Transient test output that browser tooling wrote into the project root (`.playwright-mcp/`, `net-index.txt`) was removed after use. All test servers, scripts, screenshots, JSON results, logs and the ffmpeg binary used for H-03 live outside the project, in this session's scratchpad directory.

**Findings from Medium down are unchanged and awaiting approval.**
