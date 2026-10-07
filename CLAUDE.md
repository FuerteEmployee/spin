# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A "Scan & Win" promo for **Sadguru Selection** (sadguruselection.com, Navratri campaign). A customer scans a QR code at the stall, logs in with mobile number + OTP, gets **one spin per mobile number**, and claims the voucher via WhatsApp. Everything shown to customers (texts, T&C, rewards/odds, backgrounds, logo, WhatsApp behaviour, campaign on/off) is edited in the admin panel at `/admin`.

- `client/`: React 19 + Vite SPA. One bundle serves both the public page and `/admin` (lazy-loaded, path checked in [App.jsx](client/src/App.jsx); no router library).
- `server/`: Express + Mongoose API on MongoDB Atlas (`spin_win` database). In production it also serves `client/dist`, so the whole app is **one Node process on one port**.

There are no tests, no linter and no TypeScript. The git remote is `github.com/FuerteEmployee/spin` (branch `main`). The root `*.zip` files, `deploy/nginx-spinandwin.conf` and `client/public/.htaccess` are left over from the old static BillingSphere build and don't apply to this Node setup.

## Commands

```bash
cd server && npm install && npm run dev   # API on :5000 (node --watch); serves client/dist if it exists
cd client && npm install && npm run dev   # :5173, proxies /api to :5000
cd client && npm run build                # then http://localhost:5000 serves site + /admin
```

On Windows, if Atlas fails with `querySrv ECONNREFUSED`, set `DNS_SERVERS=8.8.8.8,1.1.1.1` in `server/.env` (applied in [db.js](server/src/config/db.js)).

## Current deployment (Hostinger, temporary until sadguruselection.com is ready)

- **Website:** static files on https://fuertedevelopers.com/spinandwin/, built with `npm run build:hostinger`. That uses `--base=/spinandwin/` plus `client/.env.hostinger`, which sets `VITE_API_URL` to the API and switches Firebase phone test mode off. `client/public/.htaccess` rewrites unknown paths (e.g. `/admin`) to `index.html`.
- **API:** a Hostinger Node.js app at https://spin-api.fuertedevelopers.com (entry `src/index.js`, Node ≥ 20.19). Production env vars include `CLIENT_ORIGIN` (CORS for the website's origins) and `PUBLIC_URL`, which makes `/api/media` image links absolute because the site is on another domain.
- **Upload packages** are built into `deploy-upload/` (gitignored): `spinandwin-website.zip`, `spinwin-api.zip` and `hostinger-env.txt` (secrets). Create the zips with Windows `tar -a`, not PowerShell 5.1 `Compress-Archive`, whose backslash paths break when unpacked on Linux.
- After `build:hostinger`, run `npm run build` again for local use. Both builds write to the same `client/dist`.

## Configuration

- `server/.env` holds the Mongo URI, `JWT_SECRET`, `ADMIN_USERNAME`/`ADMIN_PASSWORD` (the admin login, env-only), `OTP_MODE` and `FIREBASE_PROJECT_ID`. See `.env.example`.
- `client/.env` holds the `VITE_FIREBASE_*` web config. Vite inlines these at **build time**, so rebuild after changing them. The current values belong to a **test** Firebase project (`spin-and-win-e3395`) and are meant to be replaced.
- Both `.env` files are gitignored (`*.env`). So is the Atlas credentials file in the repo root.

## Architecture

**OTP modes** (`OTP_MODE`, exposed to the client as `site.otpMode`):

- `firebase`: [client/src/firebase.js](client/src/firebase.js) sends the SMS through Firebase Phone Auth using an invisible reCAPTCHA. The browser sends the resulting ID token to `POST /api/auth/firebase`. The server verifies it with `firebase-admin`, which only needs the project id, and takes the mobile number **from the token**. In this mode `/send-otp` and `/verify-otp` return 404, so the on-screen OTP can't be used to bypass SMS.
- `screen`: the server generates the OTP and returns it in the response. This is for testing only: anyone can then claim any number's spin.

Both modes end in `createSession()` in [routes/auth.js](server/src/routes/auth.js), which issues the app's own JWT (`role: 'user'`). Admin tokens carry `role: 'admin'`. `requireAuth` and `requireAdmin` each reject the other role.

**One spin per number** is enforced by a unique partial index on `Spin {user}` where `isWin: true`. Concurrent spins resolve to the same win (409 `ALREADY_WON` with the existing spin). Rewards with `isWin: false` ("Try Again") don't create a win, so the user can spin again. The server picks the reward with `pickWeighted`, and the client only animates the wheel to `rewardIndex`. **Wheel order = reward `order`**, so the index must match `/api/site`'s reward list. The admin "Allow re-spin" action deletes a user's spins.

**Dynamic content:**

- A single `Settings` document (`key: 'site'`, created on demand by `getSettings()` in [services/site.js](server/src/services/site.js)) holds all texts, T&C, WhatsApp settings, coupon prefix, campaign flag and image refs. `TEXT_FIELDS` there is the whitelist and length limits for editable texts. A new text field has to be added in the model, `TEXT_FIELDS` and the admin form.
- `GET /api/site` returns everything the public page needs. Reward **weights are never sent publicly**.
- Rewards are saved as a whole list (`PUT /api/admin/rewards`): the server updates, adds, reorders and **deletes** to match. Spins keep a snapshot of the reward label, icon and description, so deleting a reward doesn't break past wins. `seed.js` only seeds an empty collection. Its `DEFAULT_REWARDS` also feed the admin's "Load Navratri defaults" button.
- Images (desktop and mobile backgrounds, logo) are stored **in MongoDB** (`Media`). They're uploaded as a raw request body (`express.raw`, 6 MB limit) after the admin resizes them in the browser ([imageResize.js](client/src/admin/imageResize.js)), and served from `/api/media/:id` with immutable caching. A replaced image gets a new id.
- On the public site, backgrounds are CSS variables on `.bg-image` ([theme.js](client/src/theme.js)): the mobile image by default and the desktop image from 768px up. If only one is uploaded, it's used for both.

**WhatsApp claim** ([whatsapp.js](client/src/whatsapp.js)): `claimTarget: 'self'` opens a `wa.me` chat with the **customer's own number**. `'business'` sends to `businessWhatsapp` instead. The message is the admin's template with `{brand} {reward} {description} {code} {mobile} {date}` filled in. Tapping the button sets `claimedAt`. Staff set `redeemedAt` from the admin panel.

**Client conventions:** components call the API only through `services/spinService.js` (public) and `services/adminService.js` (admin), both built on `services/api.js`. Errors are thrown as `ServiceError`, and a 401 always has code `UNAUTHORIZED`. An admin 401 dispatches `ADMIN_LOGOUT_EVENT`. Admin styles live in `admin/admin.css` (`ad-` prefix, light theme, scoped by `body.admin-body`). Public styles live in `styles.css`.
