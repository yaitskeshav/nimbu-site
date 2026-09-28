# nimbu-site

Marketing site and privacy policy for **Nimbu**, served at <https://nimbu.keshavbits.tech> via GitHub Pages.

Plain static HTML/CSS/JS, with no build step. Push to `main` to deploy.

```
index.html            landing page
privacy/index.html    privacy policy (Play Store listing link)
404.html              not-found page
assets/css/site.css   Obsidian Lime styles (dark canonical, light derived)
assets/js/site.js     motion + interactions (respects prefers-reduced-motion)
assets/fonts/         Unbounded + Manrope WOFF2 subsets (OFL, see OFL.txt)
assets/screens/       app screenshots (demo data only), 720px WebP
assets/img/           favicon, touch icon, social preview
CNAME                 custom domain for GitHub Pages
```

## Preview locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Custom domain

DNS at the registrar: `CNAME  nimbu  →  yaitskeshav.github.io`.
GitHub → Settings → Pages: source `main` / root, custom domain `nimbu.keshavbits.tech`, Enforce HTTPS.
