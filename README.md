# Nexo Commerce

A considered workspace for sales, customers, and inventory. Built as a complete Laravel portfolio application with a custom interface, connected business workflows, light/dark appearance, and responsive layouts.

## Interactive static preview

The portfolio demo is also available as a standalone HTML/CSS/JavaScript build. It uses browser-local sample data and supports customer/product forms, inventory adjustments, the order lifecycle, CSV export, and light/dark appearance without PHP or MySQL.

```powershell
npm ci
npm run test:demo
npm run build:demo
npm run preview:demo
```

Upload the contents of `dist/demo/` to a static host, or use the included manual GitHub Pages workflow. See the [static demo deployment guide](docs/STATIC-DEMO.md) for complete instructions. The Laravel application below remains the full server-backed implementation.

## What works

- Authenticated workspace with administrator and operator permissions.
- Customer creation, editing, search, filters, purchase history, and archival.
- Product catalog, pricing, categories, archival, and inventory adjustments with movement history.
- Multi-product draft orders with server-calculated totals and historical price snapshots.
- Transactional confirmation, stock checks, cancellation, manual payment recording, and fulfillment.
- Revenue dashboard, previous-period comparisons, daily charts, category sales, and bestsellers.
- Searchable, sortable, paginated tables and authenticated CSV exports.
- Account, workspace, appearance, and password settings.
- Coherent demo fixtures and automated business-rule tests.

## Stack

PHP 8.5, Laravel 13, MySQL/MariaDB, Livewire 4, Alpine.js, Tailwind CSS 4, Chart.js, Vite 6. Fonts are bundled locally. Icons and product illustrations are SVG. Alpine is provided by Livewire and initialized once through the ESM bundle.

## Requirements

- PHP 8.5 with PDO MySQL, mbstring, intl, fileinfo, openssl, XML, DOM, ctype, tokenizer, and curl.
- A recent Composer 2 release compatible with PHP 8.5.
- Node.js 22 and npm.
- MySQL or MariaDB with an InnoDB database (verified locally against MariaDB 10.4.24).

## Local setup

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Set your MySQL connection in `.env`, then run:

```powershell
php scripts/setup-database.php
php artisan migrate
php artisan db:seed
npm ci
npm run build
php artisan serve --host=127.0.0.1 --port=8000
```

Open **http://127.0.0.1:8000**. For frontend development use `npm run dev` in a separate terminal. The database setup helper creates only the dedicated `nexo_commerce` database and never drops an existing database. The seeder skips workspaces that already have customer or product data.

With XAMPP, the current checkout is also available at **http://localhost/adminTemplate/public/** when Apache and MySQL are running. For a deployed virtual host, point the document root directly at `public/`; the project root must not be exposed.

The implementation environment included an old global Composer. A current local executable was downloaded to the ignored `.tools/composer.phar`; in this checkout, `php .tools/composer.phar install` is an alternative to the global `composer` command.

## Local demonstration accounts

| Account | Email | Password |
| --- | --- | --- |
| Administrator | `demo@nexo.test` | `NexoDemo!2026` |
| Operator | `operator@nexo.test` | `NexoDemo!2026` |

The login page offers **Explore the demo** only when `APP_ENV=local` and `DEMO_ENABLED=true`. These credentials belong to generated sample users. This workspace is shared locally and is not an isolated public demo.

## Tests

Configure the same local database server in `.env`, then create the separate testing database:

```powershell
php scripts/setup-database.php --testing
php artisan test --compact
```

Tests require `nexo_commerce_testing`; the bootstrap rejects other database names. They do not run against the application database. The database account needs permission to create and migrate this dedicated test database.

For a full local HTTP smoke check with demo mode enabled:

```powershell
powershell -NoProfile -File scripts/smoke-http.ps1
# Alternative when using artisan serve:
powershell -NoProfile -File scripts/smoke-http.ps1 -BaseUrl http://127.0.0.1:8000
```

The HTTP script checks authentication, CSRF, all workspace pages, a real Livewire search request, CSV export, and compiled assets. Visual browser QA and portfolio screenshots are pending because the computer-use tool could not verify the active Chrome URL.

## Business decisions

Money is stored as integer USD cents. Confirming a draft locks the order and its products and deducts stock in one transaction. Cancellation returns inventory once. Paid or fulfilled orders cannot be cancelled. Payment records represent full manual payments; the application never charges a card. Revenue is recognized on the recorded payment date. Dates use UTC.

Products are archived to preserve sale history. Customers with existing orders are archived rather than deleted. Roles are enforced on the server through Laravel Gates. CSV exports neutralize spreadsheet-formula prefixes.

## Deployment

Deploy to a PHP 8.5 host with MySQL support. Configure HTTPS, the production `APP_URL`, a production application key, and production database credentials. Set `APP_ENV=production`, `APP_DEBUG=false`, `DEMO_ENABLED=false`, and `SESSION_SECURE_COOKIE=true`. Use a fresh production database and create private user accounts rather than shipping the local sample credentials. The demo seeder refuses production execution.

```sh
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize
```

Grant the PHP process write access to `storage/` and `bootstrap/cache/`. No queue worker or external mail service is required by the current MVP. Back up production data before schema updates.

A public editable portfolio demo needs per-visitor workspaces, automatic reset/expiry, and protected administrator settings. Those capabilities are outside this local MVP and must be implemented before making the demo publicly editable.

## Project documentation

- [Architecture and business rules](docs/ARCHITECTURE.md)
- [English portfolio copy and capture plan](docs/PORTFOLIO.md)
- [Static demo, GitHub Pages, and hosting guide](docs/STATIC-DEMO.md)

## Scope

This release focuses on commerce operations. Projects, tasks, subscription billing, tax invoices, external integrations, and multi-tenant demo isolation are future extensions.
