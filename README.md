# Nature's Village Resort — Website

A custom, hand-coded website for **Nature's Village Resort**, a regenerative farm resort in Talisay City, Negros Occidental, Philippines. It covers rooms, the farm-to-table restaurant, weddings and events, facilities, press, and guest stories.

- **Production domain:** [naturesvillageresort.com](https://naturesvillageresort.com/)
- **Staging preview:** [teal-raven-684541.hostingersite.com](https://teal-raven-684541.hostingersite.com/)

## Pages

| Page | File | URL |
|---|---|---|
| Home | `index.html` | `/` |
| Our Story | `about.html` | `/about/` |
| Rooms & Residence | `accommodations.html` | `/accommodations/` |
| The Village Restaurant | `restaurant.html` | `/restaurant/` |
| Weddings, Retreats & Celebrations | `function-rooms.html` | `/function-rooms/` |
| Facilities & Spaces | `facilities.html` | `/facilities/` |
| Guest Stories | `testimonials.html` | `/testimonials/` |
| Press Room | `press.html` | `/press/` |
| Contact | `contact.html` | `/contact/` |
| Site Credits | `dev.html` | `/dev/` |
| Not Found | `404.html` | — |

## Tech stack

Plain HTML, CSS and JavaScript. There is no framework and no build step.

- **Styles:** one stylesheet, `assets/css/styles.css`, built on CSS custom properties with an `nvr-` class namespace
- **Scripts:** `assets/js/custom.js` (vanilla JS)
- **Fonts:** Fraunces, Manrope and Poppins from Google Fonts, plus a self-hosted display font
- **Icons:** [Lucide](https://lucide.dev/)
- **Restaurant menu:** a page-by-page booklet viewer rendered from the PDF in `assets/docs/` with [pdf.js](https://mozilla.github.io/pdf.js/)
- **Forms:** [FormSubmit](https://formsubmit.co/), so no backend is needed
- **Reviews:** an Elfsight widget on the home and guest stories pages
- **Map:** a Google Maps embed on the contact page
- **SEO:** canonical URLs, Open Graph images, JSON-LD structured data, `sitemap.xml` and `robots.txt`

## Project structure

```
├── *.html              One file per page
├── .htaccess           Clean URLs, redirects, caching, security headers, 404 page
├── sitemap.xml
├── robots.txt
└── assets/
    ├── css/            styles.css
    ├── js/             custom.js
    ├── font/           Self-hosted display font
    ├── images/         Photos grouped by section, plus og/ share images
    ├── video/          Home page hero video
    └── docs/           Restaurant menu PDF
```

`qa/` holds local helper scripts (hero video encoding, Open Graph image generation), and `audit-reports/` holds the site audit. Neither is part of the live site.

## Running locally

Serve the folder with any static file server:

```bash
python -m http.server 8080
```

Then open http://localhost:8080/.

The local server ignores `.htaccess`, so clean URLs like `/about/` won't resolve locally. Open the `.html` files directly, for example http://localhost:8080/about.html.

## Deployment

The site is hosted on Hostinger (Apache). Deploy by uploading the site files to the website's `public_html` folder, leaving out the local-only files: `qa/`, `audit-reports/`, `.claude/`, `CLAUDE.md` and `color-scheme.md`.

## Credits

Designed and built by [Kenn Jan Ali](https://kennali.dev/).
