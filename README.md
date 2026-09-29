# Elimuhub website

> A better education for all.

The website for **Elimuhub**, the school management system for Kenyan primary and secondary schools: fees and M-Pesa, CBC and KCSE exams, report cards, payroll, a parent app and a school website builder.

**Live site:** https://pizzatechies.github.io/elimuhb/

Elimuhub is a product of **Pizza Technologies**.

## What's here

| Path | Purpose |
| --- | --- |
| `index.html` | The whole site: one self-contained page (HTML, CSS and a little JavaScript) |
| `img/` | App screenshots and the Pizza Technologies logo |
| `icons/`, `favicon.svg` | Browser and home-screen icons |
| `og-image.jpg` | Preview image shown when the link is shared on WhatsApp, Facebook, X, etc. |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

There is no build step. Edit `index.html` and push to `main`; GitHub Pages republishes the site within a minute or two.

## Adding your contact details

The "Book a demo" section shows WhatsApp, phone, email and website buttons once you fill them in. Near the bottom of `index.html`, find:

```js
var CONTACT = {
  whatsapp: "",   // e.g. "254712345678" (country code, no +)
  phone: "",      // e.g. "0712 345 678"
  email: "",      // e.g. "hello@example.co.ke"
  website: ""     // e.g. "https://app.example.co.ke"
};
```

Any value left empty stays hidden.

## Hosting

The site is served by GitHub Pages from the `main` branch (root folder): **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`**.

To use your own domain (for example `www.elimuhub.co.ke`), add it under **Settings → Pages → Custom domain** and point a `CNAME` DNS record at `pizzatechies.github.io`. Then update the `canonical`, `og:url` and `og:image` addresses at the top of `index.html`, and the URL in `sitemap.xml` and `robots.txt`.
