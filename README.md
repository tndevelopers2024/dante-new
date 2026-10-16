# Dante Gonzales Orthodontics — website

A static rebuild of drdantegonzales.com: plain HTML, CSS and vanilla
JavaScript. No framework, no build step. What is in the repo is what ships —
edit the files directly and serve the folder.

## Layout

```
index.html                 homepage
*.html                      25 more top-level pages (about, invisalign, braces, …)
blog/*.html                 49 blog posts
css/styles.css              design tokens + every component
js/main.js                  nav, reveal, counters, before/after, carousel, tabs, forms, video
404.html                    error page (wired via .htaccess)

.htaccess                   legacy .php -> .html 301s, HTTPS + host canonicalisation
sitemap.xml                 published URLs
robots.txt

assets/brand/               logo, favicon
assets/hero/                page banner photography
assets/team/                Dr. Gonzales and staff portraits
assets/cases/               before-and-after cases
assets/treatments/          braces, Invisalign, surgical, accelerated
assets/locations/           Dublin and Tracy page imagery
assets/blog/                per-post imagery, one folder per slug
assets/photos/              general photography, report + book art
assets/ui/                  badges, partner logos, quiz options
assets/video/               video posters
assets/docs/                downloadable PDFs

redirects.json              final canonical URL mappings
audit/metadata.json         source metadata from the supplied SEO audit
audit/implementation-status.csv  per-issue changes and remaining account tasks
scripts/check-seo.py        static content/link/schema audit (Python standard library)
tests/seo.test.js           HTTP page, redirect and security-header checks
```

## Working locally

Serve the repo root over HTTP — **not** `file://`, and not a subfolder:

```
npm ci
npm start
# then open http://localhost:3000/
```

`css/styles.css` and `js/main.js` are linked with paths relative to the site
root (`css/styles.css`, or `../css/styles.css` from `blog/`), so the page must
be served from this directory to resolve them. Opening an `.html` file directly
from disk will render it unstyled.

Edit any `.html` file, `css/styles.css` or `js/main.js` and refresh
(hard-refresh — `Cmd/Ctrl+Shift+R` — after CSS changes, the browser caches the
stylesheet).

The site-wide header, footer and `<head>` are duplicated into every page. To
change the nav or footer, edit it across all files (find-and-replace).

## Notes for deployment

* **Appointment delivery still needs the existing backend.** The appointment,
  quiz and modal forms post to `contact-form1.php`. That handler is absent
  from this repository, and Express cannot execute PHP. Retain and verify
  the production handler on a PHP-capable host, or connect a real submission
  service before accepting online requests. Configure the handler's expected
  reCAPTCHA integration and test delivery with practice-approved test data.
  Local rendering and validation do not establish delivery. Both office phone
  links remain available, including the mobile contact bar.
* **Newsletter:** the unconnected form and misleading confirmation have been
  removed. Add a subscription form only when a real list provider is available.
* **Apache/LiteSpeed:** deploy `.htaccess` along with the HTML and assets;
  it includes legacy PHP redirects, consolidated-article redirects, canonical
  URL handling, compression, caching and security headers. Confirm the host
  permits `Options -MultiViews` and the required rewrite/header modules.
  Run post-deployment HTTP checks: local Node tests do not execute Apache rules.
* **Node hosting:** `server.js` uses the same consolidation mapping and explicit
  legacy page rules. Configure HTTPS and the www host at the hosting proxy.
  The application trusts one proxy hop for forwarded HTTPS and HSTS.
* **Sitemap:** 69 canonical HTML pages and four existing PDFs. Redirected URLs,
  `/index.html` and the sitemap self-reference are excluded. HTML lastmod dates
  reflect these actual 2026-10-16 edits; unchanged PDF dates come from Git.
  Update lastmod only when the corresponding document is edited.
* **Images:** 130 compressed WebP variants are referenced by the pages;
  originals remain available for legacy asset redirects. The book cover is
  54,252 bytes. Do not remove original assets without updating legacy mappings.

## SEO audit implementation — October 16, 2026

The supplied workbook's replacement titles and descriptions were applied to
all surviving pages. Six overlapping URLs were consolidated, and the TMJ
`dysfuntion` URL was corrected with a permanent redirect. Article excerpts and
useful sections were retained in the destination guides, internal links updated,
and duplicate blog-index cards removed. `redirects.json` identifies final targets.

The homepage now uses one static hero with a visible local H1 and immediate
calls to action. Mobile visitors can call either office or open the existing
consultation dialog. The page preloader was removed. Small labels, tap targets,
image dimensions, image alts, page-specific social imagery, service resource
links, footer headings and motion preferences were updated.

Visible FAQs have matching FAQPage markup. The 45 surviving blog posts have
BlogPosting markup, original publication dates, current update dates, linked
practice bylines and clinician biography links. Individual authorship or a
"medically reviewed" statement has not been asserted without confirmation.
Have the practice review the existing clinical content and confirm reviewers.

`audit/implementation-status.csv` records the outcome and remaining action for
each of the workbook's 44 issues. External follow-up still required:

* Confirm the previous domain and authoritative old URL inventory. Verify
  page-to-page 301s on that domain, identify actual injected spam URLs for
  targeted 410s, keep the domain renewed, and submit GSC Change of Address.
* Submit `https://www.drdantegonzales.com/sitemap.xml` in Search Console after
  deployment and inspect the destination URLs and removed URLs.
* Update both Google Business Profiles and citations using the correct URLs:
  Dublin `https://www.drdantegonzales.com/contact-dublin.html`; Tracy
  `https://www.drdantegonzales.com/contact-tracy.html`.
* Supply verified per-location coordinates, actual GBP links, price ranges and
  rating/count evidence if those schema fields are desired. Existing addresses
  supply map links; the invalid medicalSpecialty value was removed.
* Validate production HTTPS/host redirects, HSTS and structured data in Google's
  tools after deployment. Local tests establish markup consistency, not search
  eligibility, production behavior or ranking improvements.

For new articles, use short descriptive slugs (usually 3–5 words) and avoid
changing existing indexed URLs unless consolidating or correcting an error.

## Verification

Run `npm test`. It checks supplied metadata against canonical pages, local
links and images, image attributes, one H1, JSON-LD and FAQ counts, sitemap
membership, all sitemap HTTP responses, legacy/consolidation redirects (GET
and HEAD with query preservation), unknown-page 404s, and security headers.
It needs Python 3 and permission to bind a loopback test server.

## Browser support

Evergreen Chrome, Safari, Firefox and Edge. Respects
`prefers-reduced-motion`; the page is readable with JavaScript disabled.
