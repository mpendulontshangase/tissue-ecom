# Softmill

A small ecommerce site for a tissue business that sells facial-tissue cartons of 24 and 48 boxes. Customers order in bulk, pay by card with Yoco or by EFT, and follow the order in the app. The owner confirms orders, changes status, and sends updates.

Prices are in South African rand (ZAR).

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Postgres via `DATABASE_URL` (Neon pooled URL or any Postgres, including Vercel Marketplace Neon)
- Drizzle ORM and SQL migrations in `drizzle/`
- Email + password accounts, scrypt password hashes, signed httpOnly session cookies
- Optional email through [Resend](https://resend.com)

`postgres` (postgres.js) talks to both local Postgres and Neon. Use Neon’s **pooled** connection string on Vercel and keep `prepare` disabled (the app already does). Card payments use the Yoco Checkout API. EFT uses the bank details saved under Payments.

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
| `YOCO_PUBLIC_KEY` | No | Overrides the Yoco public key saved under Payments. |
| `YOCO_SECRET_KEY` | No | Overrides the Yoco secret key. Never shown in the browser. |
| `YOCO_WEBHOOK_SECRET` | No | Overrides the Yoco webhook secret (`whsec_...`). Never shown in the browser. |
| `PAYMENT_ENCRYPTION_KEY` | No | Encrypts Yoco secrets in Postgres. `AUTH_SECRET` is used when this is empty. |

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

On an existing database, run `npm run db:prepare` again after pulling. It applies new migrations, including product pictures, shop settings, and payments, without wiping orders. Older pay-on-delivery orders stay in the database and still display as pay on delivery.

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

Customers sign up, add cartons (the quantity field accepts up to the stock on hand, with shortcuts for 5, 10, 20, and 50), and check out with a delivery address. Checkout offers Yoco card payment and EFT, and hides a method the owner has switched off. At least one method stays enabled. The order is stored as **pending** and **awaiting payment**.

An EFT order shows the bank account holder, bank, account number, branch code, account type, and the order number as the payment reference on the confirmation, the order page, and the order email. It stays awaiting payment until the owner uses **Mark as paid**. The customer gets an in-app notification.

A Yoco order redirects to Yoco’s hosted page. The order is marked paid only after a signature-checked webhook, or after a server-side lookup of that checkout shows it completed. The browser redirect alone does not mark it paid. Yoco rejects amounts under R2.00.

### Yoco setup

1. In the Yoco App, open the Checkout API integration and copy the test public key and test secret key.
2. In the owner desk, open **Payments**, paste the keys, and enable Yoco. The page shows Test mode or Live mode from the key prefix.
3. Copy the webhook URL shown there and register it with Yoco (`POST https://payments.yoco.com/api/webhooks` with the secret key, or the webhook field in the Yoco dashboard). Save the `whsec_...` secret Yoco shows once into Payments. Yoco only calls a public `https` URL, so a tunnel is required for local webhook tests.
4. Pay with a test card from the Yoco App’s test card details. Test payments do not appear on the live sales report.
5. Before live payments, verify the shop domain in Yoco and replace the test keys with the live keys.

`npm test` checks webhook signatures and a mocked checkout call without real keys.

The owner filters orders, changes status (`pending`, `confirmed`, `processing`, `out for delivery`, `delivered`, `cancelled`), and writes a message. The message is always saved in the customer’s Updates page. Email is sent only when Resend is configured.

Cancelling an order returns stock. Reopening a cancelled order reserves stock again when enough remains.

Delivery is R85, and free from R800.
