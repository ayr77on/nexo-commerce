# Nexo Commerce — Sales, CRM & Inventory Management Platform

## Portfolio description

Nexo Commerce is a carefully designed operations workspace for independent brands and growing retail businesses. It brings customer relationships, sales orders, payment records, and inventory into one cohesive interface, with light and dark themes and responsive layouts.

I designed and developed the application end to end using Laravel, Livewire, Alpine.js, Tailwind CSS, and MySQL. Its order workflow connects the interface to real business rules: confirming an order deducts inventory, cancellation restores stock, and recorded payments feed the revenue dashboard. Database transactions and row locks protect inventory updates, while historical line-item prices preserve accurate sales records.

The application includes searchable, filterable tables, customer purchase history, inventory movement tracking, manual payment recording, role-based authorization, period comparisons, and CSV exports. Automated tests cover the critical business workflows and access controls.

## Suggested Upwork fields

- **Title:** Nexo Commerce — Laravel Sales & Inventory Dashboard
- **Role:** Full Stack Developer, Software Architect & UI Designer
- **Skills:** Laravel, PHP, MySQL, Livewire, Alpine.js, Tailwind CSS
- **Deliverables:** Application architecture, custom UI, relational database, order management, reporting, authentication, automated testing.

## Demo walkthrough

1. Open Overview and switch between reporting periods.
2. Compare the light and dark appearance.
3. Find a customer and inspect their purchase history.
4. Create a draft with multiple products.
5. Confirm the order and inspect the inventory change.
6. Record a manual payment and fulfill the order.
7. Review the corresponding revenue and export orders as CSV.
8. Sign in as an operator to demonstrate restricted catalog access.

## Capture plan

Capture the application after browser visual QA at 1440 × 1000, plus a 390 px mobile viewport. Use browser-free captures with consistent framing:

1. Overview in the light theme: the primary portfolio cover.
2. Overview in the dark theme.
3. Order detail with its lifecycle and line items.
4. Customer profile and order history.
5. Inventory adjustment and movement history.
6. Mobile overview and navigation.

Screenshots and manual browser visual review are pending.

## Positioning

Explain the business outcome first: connected operations and trustworthy inventory. Show the order lifecycle in a short recording, then use the transaction, authorization, and testing details to support the implementation quality. Clearly identify this as a portfolio demonstration and describe payments as manually recorded payments.

The static preview is ready to build from `static-demo/` and uses browser-local sample records. Each visitor can explore and modify their own demo data, then restore it with Reset demo. Describe it as an interactive preview; the complete Laravel backend is available separately in the repository. See [static demo deployment](STATIC-DEMO.md).

The Laravel-backed local demo is shared and does not isolate visitors. A public editable Laravel deployment still needs separate visitor workspaces and automatic expiry/reset before being offered to clients.
