# Application architecture

Nexo Commerce is a single-workspace Laravel monolith. Blade owns the interface structure; Livewire connects interactive pages to the server; Alpine owns local interaction state. All fonts, icons, and illustrations are served locally. Product illustrations and the brand mark are native SVG assets.

## Boundaries

| Layer | Responsibility |
| --- | --- |
| `app/Livewire` | Page state, validation, authorization, user feedback |
| `app/Actions/Commerce.php` | Order lifecycle, payments, inventory transactions |
| `app/Queries/Overview.php` | Period metrics, comparisons, chart data |
| `app/Models` | Eloquent entities and relationships |
| `app/Http/Controllers` | Session authentication and streaming CSV downloads |
| `resources/views/components` | Shared layout, forms, dialogs, icons, badges, pagination |
| `resources/js/app.js` | Alpine stores and Chart.js lifecycle management |
| `resources/css/app.css` | Theme tokens, component styles, responsive breakpoints |

## Business rules

- Amounts are integer USD cents. Totals are calculated on the server.
- Drafts snapshot product names, SKUs, and unit prices. Subsequent catalog edits do not alter existing orders.
- Drafts do not reserve inventory. Confirmation locks the order, locks products in ID order, validates availability, and deducts inventory in one transaction.
- Repeated confirmation, cancellation, or payment requests are idempotent.
- Cancellation of an unpaid, confirmed order returns stock. Paid and fulfilled orders cannot be cancelled in this MVP.
- Payment records represent receipt of a full manual payment. No external charge is performed.
- Fulfillment is independent of payment state, allowing an unpaid shipment to remain outstanding.
- Product inventory cannot be negative. Every adjustment includes a reason and resulting balance.
- Products are archived. Customers with order history are archived; customers without orders may be deleted.
- Revenue uses payment date and paid totals. Order counts exclude cancelled orders. Outstanding payments exclude drafts and cancelled orders.
- All reporting dates use UTC. Comparisons use immediately preceding periods of equal length. No previous-period baseline is displayed as a percentage when it is zero.

## Access

Administrators manage catalog, stock, workspace settings, customers, and sales. Operators manage customers and sales and can read catalog data. Both roles can edit their own account. Gates authorize Livewire actions on the server; hiding controls is an additional usability measure.

Routes require authenticated sessions. Login is rate-limited, sessions regenerate on authentication, and forms use CSRF protection. Exported cells neutralize leading spreadsheet-formula characters.

The one-click local demo requires both `APP_ENV=local` and `DEMO_ENABLED=true`. The seeder refuses production execution. This is not a production multi-tenant or public sandbox implementation.

## Verification

`php artisan test --compact` runs feature tests against the dedicated `nexo_commerce_testing` database. The test bootstrap rejects any other database name before migrations run. Fixtures and business transactions are isolated by the test framework.

`scripts/smoke-http.ps1` checks the deployed local HTTP stack, including session login, real CSRF handling, Livewire updates, compiled assets, and CSV downloads. This is separate from visual browser QA.

## Deliberate MVP boundaries

One workspace, one currency, one catalog, manual full payments, fixed administrator/operator roles, and no tax engine. Projects, tasks, subscriptions, webhooks, external payment providers, multi-tenant workspaces, and public visitor isolation are future extensions.
