# Static portfolio demo

This repository contains the complete Laravel application and a standalone interactive preview. The preview compiles to HTML, CSS, JavaScript, SVG, and font files. It requires no PHP runtime, Composer, database, API, or external CDN in production.

## What visitors can do

- Explore Overview, Orders, Customers, Products, and Settings.
- Change reporting periods and switch between light and dark themes.
- Search, filter, sort, and paginate sample records.
- Create and edit customers and products.
- Adjust inventory and inspect movement history.
- Create multi-product draft orders, confirm them, simulate payments, and mark them fulfilled.
- Cancel eligible unpaid orders and observe stock being returned.
- Export filtered orders to CSV.
- Change the sample profile and workspace details.
- Restore the original sample data using Reset demo.

Changes are stored under `nexo-commerce-static-v1` in the current browser's localStorage. No information is sent to a server. If localStorage is blocked or full, the preview remains usable for the current visit. Appearance uses the separate `nexo-theme` key. Resetting the demo replaces only its own workspace data and preserves appearance.

Sample records are generated locally from deterministic fixtures, with dates relative to the visitor's first visit. The demo does not export or read the Laravel database. It contains no production credentials or application secrets.

## Build and preview

Only Node.js and npm are needed:

```powershell
npm ci
npm run test:demo
npm run build:demo
npm run preview:demo
```

Open the local URL printed by Vite. During development, use `npm run dev:demo` instead. With this checkout served by XAMPP, the compiled preview is also available at:

**http://localhost/adminTemplate/dist/demo/**

The output is `dist/demo/`, containing `index.html`, `.nojekyll`, and `assets/`. Open it through an HTTP server rather than double-clicking the HTML file; browsers restrict local ES module loading through `file://`.

All asset paths are relative. Navigation uses `#/orders`, `#/customers`, and similar hash routes, so the demo works on either a domain root or a subdirectory without server rewrite rules.

## Upload to Hostinger or another static host

1. Build the demo with `npm run build:demo`.
2. Choose a dedicated folder or subdomain for the preview.
3. Upload the **contents** of `dist/demo/` to that site's document root. Keep `index.html` and `assets/` together.
4. Open the public HTTPS URL and test navigation, dialogs, CSV export, and both themes.

For example, uploading to a `nexo/` folder under your existing website's document root makes the preview available at `https://your-domain.example/nexo/`.

Upload only the compiled demo files. The Laravel project, `.env`, `vendor`, `node_modules`, source files, tests, and database files are not needed by the static host.

To create a ZIP on Windows:

```powershell
powershell -NoProfile -File scripts/package-demo.ps1
```

Extract the ZIP in the chosen destination folder. If your hosting file manager extracts into an extra directory, move the extracted `index.html` and `assets/` together into the intended document root.

The packaging script uses portable ZIP entry paths so the archive extracts correctly on Linux hosting even when created on Windows.

## Publish with GitHub Pages

1. Create a public GitHub repository, such as `nexo-commerce`. Leave it empty when creating it, because this project already has its own README.
2. Push this project's source code, including `.github/workflows/static-demo.yml`, `static-demo`, the shared resources, and npm manifests. Generated `dist/` files are ignored and rebuilt by GitHub Actions.
3. Open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Open **Actions → Publish static demo → Run workflow**, and select your main branch.
5. The workflow installs npm dependencies, runs demo tests, builds the static output, and publishes only `dist/demo/`.
6. Open the deployment URL shown by the successful workflow. Run it again whenever you want to publish a newer version.

No PHP or MySQL is provisioned by this workflow. The repository can still contain the complete Laravel implementation for code review.

To initialize Git locally after reviewing the source and ignore rules:

```powershell
git init -b main
git add .
git status
git commit -m "Add Nexo Commerce and interactive static demo"
git remote add origin https://github.com/YOUR_USERNAME/nexo-commerce.git
git push -u origin main
```

Replace the repository URL with your own. A new remote repository and public deployment have not been created automatically.

## Connect your domain

For GitHub Pages, enter the domain under **Settings → Pages → Custom domain**, then create the DNS records specified by GitHub and enable HTTPS when available. The exact DNS records depend on whether you use a subdomain or a root domain. Preserve existing DNS records for your other services. See [GitHub's custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

When uploading the same build to Hostinger, use the domain or subdomain assigned to that hosting document root.

## Representing the demo in your portfolio

Describe the public preview as an **interactive demo with sample data**. Its local operations illustrate the experience; real authentication, authorization, concurrency control, and persistent database transactions belong to the Laravel application in the repository.

The static preview is intentionally open to visitors and performs no real authentication. Payment controls simulate records and never charge or transfer money.

## Verification

`npm run test:demo` covers fixture consistency, order lifecycle, inventory rollback, local persistence, reset, CSV handling, and DOM-level navigation/forms. Chart rendering, visual layout, and real-browser accessibility still need manual browser review; browser-control tools were unavailable in the implementation session.
