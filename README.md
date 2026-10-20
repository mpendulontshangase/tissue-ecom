# Softmill

A small ecommerce site for a tissue business that sells facial-tissue cartons of 24 and 48 boxes. Customers order in bulk, pay on delivery or by EFT, and follow the order in the app. The owner confirms orders, changes status, and sends updates.

Prices are in South African rand (ZAR).

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Postgres via `DATABASE_URL` (Neon pooled URL or any Postgres, including Vercel Marketplace Neon)
- Drizzle ORM and SQL migrations in `drizzle/`
- Email + password accounts, scrypt password hashes, signed httpOnly session cookies
- Optional email through [Resend](https://resend.com)

`postgres` (postgres.js) talks to both local Postgres and Neon. Use Neon’s **pooled** connection string on Vercel and keep `prepare` disabled (the app already does). Card payments are not wired up. `lib/payments.ts` is the place to add PayFast, Paystack, or Stripe later.

## Environment variables

Copy `.env.example` to `.env.local`. Never commit real secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Must be available at **build** time so migrations can run. |
| `AUTH_SECRET` | Yes | Random string, 32+ characters, used to sign session cookies. |
| `ADMIN_EMAIL` | Yes, for the owner | Email of the first owner account. |
| `ADMIN_PASSWORD` | Yes, for the owner | Password used when that account is first created. |
| `RESEND_API_KEY` | No | Resend API key. Email is skipped when this is empty. |
| `EMAIL_FROM` | No | From address Resend is allowed to send as. |
| `NEXT_PUBLIC_APP_URL` | No | Public URL for links inside emails. |
| `SEED_RESET_ADMIN_PASSWORD` | No | Set to `true` for one deploy to overwrite the owner password. |

Product pictures are stored in Postgres (`product_images`) and served from `/api/images/[id]`. That works with `npm run dev` against a local database and on Vercel’s read-only filesystem. No extra image environment variable is required.

Shop name, phone, email, and social links live in the `shop_settings` row. The seed creates it with the name Softmill and does not overwrite later edits. Change them under **Shop settings** in the owner sidebar.

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Local setup

1. Create a Postgres database and set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env.local`.
3. Install and prepare the database:

```bash
npm install
npm run db:prepare
npm run dev
```

`db:prepare` migrates and seeds. It upserts the Everyday (24) and Household (48) cartons, and stores their starter pictures in the database when a product has none yet. It creates the owner when `ADMIN_EMAIL` does not exist yet, and promotes that email to admin if it already signed up as a customer. The password is not changed on later runs unless `SEED_RESET_ADMIN_PASSWORD=true`. It also inserts the shop settings row (name Softmill) if that row is missing.

On an existing database, run `npm run db:prepare` again after pulling. It applies new migrations, including product pictures and shop settings, without wiping orders.

Open [http://localhost:3001](http://localhost:3001). The owner desk is at `/admin`.

## Deploying on Vercel

1. Create a Postgres database (Neon works) and set `DATABASE_URL` to the pooled connection string for Production, Preview, and Development. Include it in the build environment.
2. Set `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` the same way.
3. Optionally set `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL`.
4. Deploy. The build script runs migrations and the seed before `next build`. If `DATABASE_URL` is missing, that step logs a skip and the build continues; the app will not serve data until the database is configured.

### Owner login

After the first successful build or `npm run db:prepare`:

1. Open `/login`.
2. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. Open `/admin`.

If you change the password in the database, keep using the new password. Set `SEED_RESET_ADMIN_PASSWORD=true` only when you intentionally want the seed to replace it, then remove that variable.

## Order flow

Customers sign up, add cartons (the quantity field accepts up to the stock on hand, with shortcuts for 5, 10, 20, and 50), and check out with a delivery address. The order is stored as **pending** with payment **pending**. The owner filters orders, changes status (`pending`, `confirmed`, `processing`, `out for delivery`, `delivered`, `cancelled`), and writes a message. The message is always saved in the customer’s Updates page. Email is sent only when Resend is configured.

Cancelling an order returns stock. Reopening a cancelled order reserves stock again when enough remains.

Delivery is R85, and free from R800.
