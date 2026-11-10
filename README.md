# Business Income Tracker

A private, device-local business income tracker with a dark Notion-style workspace. It runs entirely in the browser — there is no backend, no account, and no upload. Your records stay in your browser's local storage on the device where you enter them.

All views — dashboard, income & expenses, monthly overview, monthly earnings, clients, analytics, and categories — derive from one transaction ledger.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Production build

```bash
npm run build
npm run preview
```

The static build is written to `dist/`. Routes use hash navigation, so the app works on any static host without server rewrites.

## Deploy to Vercel

`vercel.json` is included. Import this repository into Vercel, or deploy from the CLI:

```bash
vercel
```

Vercel runs `npm run build` and serves `dist/`.

Because data is stored in each browser's `localStorage`, every device has its own private workspace. Deploying the app does not upload or sync your financial records.

## Data & privacy

- Workspace records — transactions, clients, categories, saved views, and settings — are stored under `finance-tracker:workspace:v1` in `localStorage`.
- Legacy attachment files, if any exist, are kept in local IndexedDB (`finance-tracker-files`). New records do not ask for files.
- No API requests, analytics, external font CDNs, or other external network calls are made by the app.
- Clearing browser site data removes the workspace permanently. Use Settings → Export if you want a CSV backup.
- Money is stored as integer minor units and formatted with `Intl.NumberFormat` using the workspace currency (default INR) and locale (default en-IN).

The workspace starts completely empty. There is no demo or sample data.

## Typography

- **Clash Display** is self-hosted from `src/assets/fonts/` and used for headings, labels, navigation, and interface text. Source: [Fontshare](https://www.fontshare.com/fonts/clash-display).
- **Inter** is self-hosted via `@fontsource-variable/inter` and used for amounts, dates, counts, and other numeric data.
- Fonts are bundled with the app, so no external font requests are made at runtime.

## Features

- Dashboard with cash-basis metrics, cash flow, pending income, recent records, and top clients.
- Transaction database with search, month/type/status filters, sorting, grouping, table and calendar views, saved views, totals, and CSV export.
- A focused transaction editor: name, type, amount, date, status, payment date, payment method, and description. No client, category, files, or notes required.
- Income & Expenses split: expected vs received income, paid vs outstanding expenses. Pending income never counts as cash.
- Monthly Earnings page: a dedicated year view with total, received, pending, best month, income-by-month chart, 12 month cards, and a drill-down list for each month.
- Monthly overview with per-month cards, month/year navigation, historical metrics, and links into the filtered ledger.
- Clients portal with derived revenue, paid, outstanding, overdue, collection rate, transaction history, and profiles.
- Analytics with eight date ranges, income vs expenses, net profit, growth, revenue by client, payment status, and category breakdowns.
- Categories with usage protection and uncategorized record review.
- Settings for workspace identity, currency, locale, week start, exports, and device-local data management.
- Keyboard shortcuts: `N` for a new transaction, `Ctrl/Cmd+K` for commands, `/` for search, `Ctrl/Cmd+Enter` to save, `Esc` to close.
- Responsive dark UI with mobile sidebar, reduced-motion support, toasts, and empty states.
