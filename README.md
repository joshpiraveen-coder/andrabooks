# Andra Books

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github)](https://github.com/joshpiraveen-coder/andrabooks)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat&logo=vercel)](https://andrabooks.vercel.app)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

Responsive Andra Books storefront and custom store-admin prototype, built with React, TypeScript, Vite, Express, Prisma, and MySQL. The UI follows the supplied Andra Books reference screenshots: a bright magenta brand, bookstore navigation, product-led home and shop pages, service-benefit strip, and dark multi-column footer.

- **GitHub Repository:** [https://github.com/joshpiraveen-coder/andrabooks](https://github.com/joshpiraveen-coder/andrabooks)
- **Live Vercel Storefront:** [https://andrabooks.vercel.app](https://andrabooks.vercel.app) (or connected Vercel domain)

This README is the project handoff. It describes what exists, where to change it, how to run each mode, deployment instructions for Vercel, and backend integrations.

---

## Deployment to Vercel

The storefront is fully optimized for continuous deployment on [Vercel](https://vercel.com).

### 1. Client-Side Routing Configuration (`vercel.json`)
Since Andra Books is a Single Page Application (SPA) powered by React Router with dynamic URLs (`/shop`, `/product/:id`, `/admin`, `/checkout`, etc.), `vercel.json` provides rewrite rules ensuring direct deep links and browser refreshes serve `index.html` without 404 errors:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Deploy via GitHub Integration (Recommended)
1. Push this repository to GitHub: [https://github.com/joshpiraveen-coder/andrabooks](https://github.com/joshpiraveen-coder/andrabooks).
2. Go to your [Vercel Dashboard](https://vercel.com/new).
3. Select **Import Git Repository** and choose `andrabooks`.
4. Vercel will automatically detect the **Vite** framework preset:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. *(Optional)* Add Environment Variables:
   - `VITE_API_URL`: `https://your-api-domain.com/api` (if deploying with the Express backend). When omitted, the storefront runs in standalone client demo mode with complete `localStorage` persistence.
6. Click **Deploy**. Any future commits pushed to the `main` branch will automatically trigger production deployments.

### 3. Deploy via Vercel CLI
```sh
# 1. Login to your Vercel account
vercel login

# 2. Deploy a preview build
vercel

# 3. Deploy directly to production
vercel --prod
```

---

## Current implementation

### Customer storefront

- Responsive site shell with announcement bar, search/category picker, primary navigation, account/cart/wishlist/compare indicators, service benefits, newsletter form, contact details, and footer.
- Home page with editable hero and promotional content, new-arrival/featured/popular/top-rated collections, language tabs, sale countdown, and testimonials.
- Product catalog with search, category, language, dual-ended Rs.210–1,200 price, sale and stock filters; grid density, page size, sorting, and pagination.
- Product detail pages, cart quantity/removal controls, wishlist, compare list, checkout, customer account registration/sign-in, order history, contact form, newsletter subscription, and informational pages.
- Sri Lankan rupee formatting and checkout fields for Sri Lanka districts. Checkout offers Cash on Delivery and an “Online Payment” option that currently instructs the team to share a payment link; no payment gateway is integrated.
- SEO title/description support, product metadata, social sharing metadata, and BookStore structured data on the home page.

### Admin area (`/admin`)

The admin screen has these sections:

- **Overview:** sales total, order count, low-stock count, and recent order summary.
- **Books & Catalog:** add/edit/delete books, prices, stock, categories, language, ISBN, age group, grade and term, page count, set information, dimensions, collection flags, SEO fields, cover and inside images.
- **Categories:** add, reorder, and remove categories. Categories containing books cannot be removed.
- **Orders:** review orders, update fulfillment status, and open a printable invoice.
- **Customers & Inquiries:** review submitted contact inquiries and newsletter subscribers; export newsletter email addresses as CSV.
- **SEO & Redirects:** edit site-level SEO defaults and add/remove path redirects.
- **Site Customizer:** edit announcement, contact details, brand color, home hero, promotional campaign/cards, social links, and testimonials; upload the transparent store logo, three promotional images, and the About page shop photo.
- **Page Editor:** edit text and SEO metadata for the supported static information pages.

When no `VITE_API_URL` is set, admin login is a local preview gate. Credentials are `admin@andrabooks.lk` / `AndraBooks2026!`. Do not use these credentials for a deployed site.

---

## Routes

| Area | Routes |
| --- | --- |
| Storefront | `/`, `/shop`, `/about-us`, `/contact-us` |
| Shopping | `/product/:id`, `/cart`, `/checkout`, `/wishlist`, `/compare` |
| Account and info | `/my-account`, `/faqs`, `/privacy-policy`, `/refund-policy`, `/terms`, `/track-order` |
| Admin | `/admin/*` |

---

## Source map

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Route table, shared storefront layout, redirect lookup when API mode is enabled. Admin renders outside the storefront header/footer. |
| `src/main.tsx` | React, router, Helmet, store-provider setup, global stylesheet import. |
| `src/context/StoreContext.tsx` | Shared products, cart, wishlist, compare list, orders, inquiries, newsletter, settings, categories; browser storage and API sync. |
| `src/data/catalogProducts.ts` | Generated 141-book catalog, including sourced product metadata and links to extracted images. |
| `src/data/products.ts` | Catalog/category exports and default storefront settings. Seed data imports this file too. |
| `catalog/books-profile-source.md` | Owner-supplied 141-row transcription of the PDF. Explicit per-book values take precedence over PDF text. |
| `catalog/books-profile-audit.json` | PDF SHA-256, page/panel mapping, price and image availability for every imported book. |
| `scripts/import-books-profile.mjs` | Reproducible PDF image/catalog importer (Node 22.13+). |
| `public/books/` | Extracted WebP cover and open-spread images used by the storefront. |
| `src/types.ts` | Shared TypeScript models for products, orders, inquiries, settings, and SEO. |
| `src/pages/` | Storefront route-level screens. `CollectionPages.tsx` contains wishlist, compare, and basic static-page rendering. |
| `src/components/storefront/` | Header, footer, product card/cover, logo, and SEO helpers. `BookCover.tsx` draws the fallback covers as inline SVG; uploaded `imageUrl` covers replace them. |
| `src/components/admin/AdminDashboard.tsx` | Admin login, dashboard panels, catalog editor, image upload UI, page editor, SEO, redirects, and invoice export. |
| `src/services/api.ts` | Fetch wrapper, JSON helper, configured API base URL, bearer-token handling. |
| `src/services/content.ts` | Static-page content retrieval from local storage/API. |
| `src/styles.css` | Storefront and admin styles, including responsive breakpoints. |
| `server/index.ts` | Express API routes, validation, auth middleware, uploads, and Prisma access. |
| `prisma/schema.prisma` | MySQL data models and enums, including catalog metadata fields. |
| `prisma/migrations/` | Checked-in baseline and catalog metadata migrations. |
| `prisma/seed.ts` | Creates owner/categories/books/settings; preserves existing credentials, prices, stock and uploaded media on rerun. |
| `vercel.json` | Vercel deployment rewrite rules for SPA client-side routing. |
| `.env.example` | Environment-variable template. Copy to `.env` for API mode. |

The catalog now includes the cover and inside artwork available in `Books Profile.pdf`. Some PDF panels are blank, and the app retains its fallback cover for those records. Promo banners, the transparent logo, and the About shop photo still need the owner's original brand photographs for a final visual match. API uploads are saved to `uploads/`; local demo uploads are stored as data URLs in browser storage.

### Books Profile catalog import (October 2026)

- `Books Profile.pdf` has 49 pages. The owner supplied a 141-row transcription in `catalog/books-profile-source.md`; the import treats those rows as the canonical product list and matches the relevant PDF page/panel for artwork. Six repeated picture-book panels are excluded. All 141 IDs and slugs are unique; a handful of earlier product IDs are retained for existing cart links.
- Category counts are Picture Books **8**, Coloring Books **14**, Activity & Dot-to-Dot **6**, Tamil Workbooks **13**, English & Math Workbooks **19**, Exam Papers (Yarl Aruvi) **17**, Story Books **55**, History & Health (Grade 6-10) **7**, Puzzles & Wall Charts **2**. The source brief claims 20 English & Math books, but lists only 19 distinct entries, for a total of 141. No extra product was invented.
- The imported metadata includes language, SKU, supplied ISBN, age group, grade/term, page count, series/set, dimensions and per-book price. Only books **100** and **108** have explicit Rs.210 sale prices against Rs.260 regular prices. Other story books remain Rs.260. Duplicate ISBNs in the source are preserved as supplied; the wall chart has no supplied ISBN. Book **54** has a title/grade inconsistency in the source; its explicit grade metadata is retained.
- The PDF yields **100 cover WebPs and 100 inside-spread WebPs**. Forty-one cover panels and forty-one inside panels are blank in the supplied PDF; the unavailable media are listed per book in `catalog/books-profile-audit.json`. Do not substitute unrelated art. The PDF's SHA-256 in that report identifies the exact source used.
- `public/books/` contains these imported assets at 516×696 pixels (covers) and 584×440 pixels (spreads). The storefront card hover uses the inside spread when present; the detail gallery exposes the same images.
- The PDF does not contain inventory counts or customer ratings. Standalone browser demo seeds products with **20 demo units** and a **0 rating** so the existing shopping flow is usable; new MySQL seed records start at **0 stock** and must be verified in admin before sale. The flags for new/featured/top-rated collections are display choices, not source facts.
- `andra:products:v2` and `andra:categories:v2` replace the old browser catalog/category keys. Existing v2 edits remain authoritative, including deleted books; clearing these two keys reloads this release's catalog. Cart, wishlist and compare hide IDs that no longer exist in the loaded catalog.
- To regenerate after receiving an updated PDF, place it at the repository root as `Books Profile.pdf` or pass an absolute path with `npm run catalog:import -- "C:\\path\\to\\Books Profile.pdf"`. The raw PDF is ignored by Git; the transcription, audit report, generated TypeScript and WebP assets are committed. The importer needs Node **22.13+** and installed dev dependencies.

---

## Run the storefront demo

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. If `VITE_API_URL` is unset, the UI uses the imported catalog and browser `localStorage`; no database is required. Demo changes remain in that browser profile and do not sync to other devices.

On Windows PowerShell, if script execution blocks `npm.ps1`, use `npm.cmd install`, `npm.cmd run dev`, and the other npm commands with the `.cmd` suffix.

---

## Run the MySQL-backed API

1. Install packages and create `.env` from `.env.example`.
2. Set `DATABASE_URL` to a reachable MySQL database, `JWT_SECRET` to a long random value, and `ADMIN_PASSWORD` to a private password. Set `ADMIN_EMAIL` if the default owner email should change. Keep `.env` out of source control.
3. Apply the checked-in migrations, generate Prisma Client, and seed the owner/catalog/settings:

   ```sh
   npx prisma migrate deploy
   npm run db:generate
   npm run db:seed
   ```

   The baseline migration creates a fresh database; the second migration adds catalog metadata. For a database previously made with `prisma db push`, first confirm it matches the baseline and mark only the baseline as applied with `npx prisma migrate resolve --applied 20261027000000_baseline`, then run `migrate deploy`. `db:seed` requires `ADMIN_PASSWORD` when creating a new owner and preserves an existing owner's password. Existing catalog prices, stock and uploaded media are preserved on rerun; new database books start at zero stock.

4. Run the API and storefront in separate terminals:

   ```sh
   npm run server
   npm run dev
   ```

The API defaults to port `4000`; health check is `http://localhost:4000/api/health`. Set `VITE_API_URL=http://localhost:4000/api` in the Vite environment before starting the frontend to enable API mode. Vite environment variables are read at startup, so restart Vite after changing them. `CORS_ORIGIN` can be set to a comma-separated list of allowed origins; when omitted, the current API allows any origin.

---

## API surface

All paths below are prefixed with `/api`. Admin routes require `Authorization: Bearer <admin-token>` unless marked public; customer order history requires a customer token.

| Capability | Routes |
| --- | --- |
| Health and admin auth | `GET /health`, `POST /auth/login` |
| Customer account | `POST /account/register`, `POST /account/login`, `GET /account/orders` (customer token) |
| Products | `GET /products` (optional `category`, `language`, `search` query), `POST /products` (admin upsert), `DELETE /products/:id` (admin) |
| Categories | `GET /categories`, `POST /categories`, `PATCH /categories/reorder`, `DELETE /categories/:id` |
| Orders | `POST /orders` (public checkout), `GET /orders` (admin), `PATCH /orders/:id/status` (admin) |
| Contact/newsletter | `POST /inquiries`, `GET /inquiries` (admin), `POST /newsletter`, `GET /newsletter` (admin) |
| Store settings/pages | `GET /settings`, `PUT /settings` (admin), `GET /pages/:slug`, `PUT /pages/:slug` (admin) |
| Redirects | `GET /redirects/resolve?path=...`, `GET /redirects`, `POST /redirects`, `DELETE /redirects/:id` (admin except resolve) |
| Product image uploads | `POST /uploads` (admin; multipart field `image`, image MIME type, max 8 MB); cover, inside-page, and gallery images are served under `/uploads/`. |

Prisma models cover admin users, categories, products, customer accounts, customers, orders/order items, inquiries, newsletter subscribers, site settings, page content, and redirects. Order statuses are `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, and `CANCELLED`; payment methods are `CASH_ON_DELIVERY` and `ONLINE`.

---

## Persistence and integration boundaries

- Browser demo data is stored under `andra:*` keys in `localStorage` (including `andra:products:v2`, `andra:categories:v2`, cart, wishlist, compare, orders, inquiries, newsletter, settings, admin/demo state, page copy, SEO, and redirects). Clearing those keys resets that browser's demo state.
- With `VITE_API_URL` set, `StoreProvider` loads products, settings, and categories from the API, while the UI still uses local storage as its immediate state/cache. Customer auth tokens are stored separately from admin tokens.
- The admin contacts/newsletter panel fetches authenticated `GET /inquiries` and `GET /newsletter` data after login when API mode is enabled, with visible loading and fetch-error states. Without API mode it continues to use browser-local demo data.
- Contact and newsletter submissions await their API response in API mode; failure messages are shown and the storefront does not report a successful send or add the record locally until the API accepts it. Demo mode continues to save submissions in browser storage.
- Several admin/store mutations update local state optimistically and make fire-and-forget API requests whose errors are swallowed. Add visible save/loading/error states and reconcile server responses before relying on these flows operationally.
- Checkout waits for the API to accept an order before clearing the cart or showing confirmation. API order creation now runs customer creation, conditional stock deductions, and order creation in one transaction, and the response reconciles the confirmation number, total, and remaining stock. Checkout still has no payment processor, payment verification, tax calculation, or shipping-rate integration; coupon validation is not implemented server-side (the client currently passes the `ANDRA10` discount amount).
- The local admin demo check is client-side only. In API mode, backend admin login uses the seeded bcrypt password and JWT. The API currently has a development fallback JWT secret; configure `JWT_SECRET` before running API mode outside local development.
- The backend is a starter implementation rather than a production launch package: harden configuration/CORS, add API tests for the transactional order/stock path, and review upload/static-file handling before deployment.

---

## Product image gallery and detail page

- Product cards use `coverImage` for the closed cover and `insideImage` (or the first `galleryImages` entry) for the hover crossfade. Cards without an inside image keep the cover visible and still reveal the compare/wishlist action bar on hover or keyboard focus.
- `/product/:slug` resolves a product by its API slug or local product ID. Its gallery combines the cover, inside spread, and extra gallery images; the page also provides a full-screen viewer, quantity/cart controls, compare and wishlist actions, product metadata, sharing links, description/review/shipping tabs, and paginated related books.
- Admin product editing uploads those three image types through the existing `POST /uploads` endpoint in API mode. In local demo mode, uploaded images are stored as data URLs in that browser's `andra:products:v2` localStorage entry.
- `Product.coverImage` and `Product.insideImage` are nullable text URLs; `Product.galleryImages` is an optional JSON array of URLs. `imageUrl` remains as a legacy cover alias so existing products continue to render.
- Apply the checked-in Prisma migrations and regenerate the client before running the API. The baseline already contains the product gallery fields; the catalog migration adds age group, pages, set info and dimensions while changing grade to text.
- Product reviews currently live in browser localStorage under `andra:reviews:<product-id>`; they are not yet submitted to an API or shared across browsers.

---

## Interactive Andra Buddy mascot

- `src/components/storefront/AndraMascot.tsx` mounts on storefront routes and is hidden on `/admin`. Its SVG combines the Andra logo's double-circle glasses with a storybook body, mouse-tracking pupils, blinking, page flaps, per-section perching, and a dock/free-roam toggle.
- `StoreContext` exposes `notifyMascot` and the latest transient `mascotSignal`; product hover, cart, wishlist/compare, search focus, and shop filters use it to trigger character reactions.
- The helper popup is rendered in a viewport-level portal so it stays clear of the mascot's moving container and screen edges. It offers preset category/price routes plus an instant local catalog search with one-click add-to-cart. Prompt filters use `/shop` query parameters for `category`, `language`, and `maxPrice`.
- Admin's **Interactive Mascot** section stores the enable switch, default mode, section messages, and periodic broadcast in the existing `SiteSettings` JSON. Mobile defaults to docked mode. The speech mute choice is stored per browser.
- Broadcast announcements and section messages are client-side behavior; they use the same settings persistence as the rest of the storefront and do not require another database model.

---

## Handoff notes

- Product names, ISBNs, specifications and listed prices come from the supplied catalog transcription and PDF. Inventory/ratings, some promotional flags, contact details, homepage campaign content and testimonials still need owner verification before launch.
- The admin page editor stores plain text paragraphs and metadata; it is not a general block editor. `src/services/content.ts` handles the saved page body.
- `package.json` has `dev`, `build`, `preview`, `server`, and Prisma scripts. It currently has no dedicated test script or test suite.
- Keep changes consistent with the reference design: magenta `#df0067` by default, clean white shop pages, dark footer, responsive layouts, and accessible labels on controls.
- Components, especially `AdminDashboard.tsx`, and much of `styles.css` are densely formatted. Preserve existing behavior and split/refactor carefully when extending them.
