# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A "Spin & Win" promo page for BillingSphere. The user logs in with a mobile number (the OTP is shown on screen, no SMS is sent), spins a weighted prize wheel and claims each win through a pre-filled WhatsApp message.

There are two halves, and **only the client is live**:

- `client/` is a React 19 + Vite SPA. It is deployed as a **fully static site with no backend**. All "server" logic runs in the browser.
- `server/` is an Express + Mongoose API that was written for a later switch to a database. **It has never been run or tested.** It is not wired to the client, and its behaviour has drifted from the client's (see below).

There are no tests, no linter and no TypeScript. The git remote is `github.com/FuerteEmployee/spin` (branch `main`). The root `*.zip` files are upload bundles of `client/dist` made for hosting.

## Commands

```bash
# client (the deployed app)
cd client
npm install
npm run dev               # http://localhost:5173
npm run build             # dist/ with base '/'            -> https://spin.billingsphere.com (Hostinger)
npm run build:subfolder   # dist/ with base '/spinandwin/' -> https://billingsphere.com/spinandwin/ (nginx)
npm run preview           # serves dist on :4173

# server (not used in production yet)
cd server
npm install               # then copy .env.example to .env
npm run dev               # node --watch, port 5000; seeds rewards on first start if the collection is empty
```

Pick the build script that matches the deploy target, because the asset base path differs. Deployment steps are in [README.md](README.md). `client/public/.htaccess` only matters for Hostinger (Apache/LiteSpeed). The nginx variant is [deploy/nginx-spinandwin.conf](deploy/nginx-spinandwin.conf).

## Client architecture

- **[client/src/config.js](client/src/config.js)** is where the business settings live: `BRAND_NAME`, `WHATSAPP_NUMBER`, OTP timings and the `REWARDS` array. Each reward has an `id`, labels, `color`, `weight` (relative odds) and `isWin`. The **array order is the clockwise segment order on the wheel**, and `rewardIndex` is derived from it, so reordering changes where the wheel lands.
- **[client/src/services/spinService.js](client/src/services/spinService.js)** is the seam between UI and "backend". Every export is `async` and mirrors an API endpoint (the mapping is listed at the top of the file), so switching to the server only means swapping the function bodies for `fetch` calls. Components must go through this module and must not touch `localStorage` directly. In the static version:
  - the OTP is held in a module-level `pendingOtp` variable, so it is lost on reload;
  - the session lives in `localStorage['spinwin_session']`;
  - wins are stored in `localStorage['spinwin_wins']` as `{ [mobile]: Spin[] }`, newest first. `readWins` also accepts the older format of a single object per mobile;
  - "Try Again" results (`isWin: false`) are returned but not stored;
  - errors are thrown as `ServiceError(message, code, data)`, and the UI shows `err.message`.
- **The spin result is decided before the animation starts.** `SpinPage.handleSpin` calls `spinWheel()` first, then sets a target rotation using `spinTargetRotation()` from [SpinWheel.jsx](client/src/components/SpinWheel.jsx). The result is revealed in `handleSpinEnd`, which runs on the SVG's `transitionend`, with a `setTimeout` fallback for when that event doesn't fire. Keep that order. The wheel only animates to an outcome that already exists.
- `SPIN_DURATION` and confetti respect `prefers-reduced-motion`.
- [client/src/whatsapp.js](client/src/whatsapp.js) builds the `wa.me` claim link and message. A "claim" is only recorded locally, as `claimedAt`, when the link is tapped.
- All styling is in one global file, [client/src/styles.css](client/src/styles.css). There is no CSS framework.

## Server architecture (dormant)

`src/index.js` connects to Mongo, seeds rewards and starts `app.js`. `app.js` mounts `/api/auth` (send-otp, verify-otp, JWT issuing) and `/api` (rewards, spin). If `client/dist` exists, it also serves it. The server picks rewards with `crypto` (`utils/random.js`). OTPs are stored hashed in a TTL-indexed collection.

**Gaps you need to know about before connecting the client to it:**

- **One win per user** is enforced by a unique partial index on `Spin`. The client allows unlimited wins, a win list and a Reset button.
- **Endpoint names differ.** The server has `GET /api/spin/me` (a single win) and `POST /api/spin/claim`. The service file expects `GET /api/spins/me` (a list), `POST /api/spins/:id/claim` and `DELETE /api/spins/me`. None of the client-expected endpoints exist yet.
- **Rewards are defined twice.** The client has [config.js](client/src/config.js) (string ids such as `off5`). The server has [server/src/seed.js](server/src/seed.js) (Mongo ObjectIds, used only to seed an empty collection). Edits to odds or labels have to be made in both places.
- **Proxy:** no Vite proxy for `/api` is configured yet.
- **SMS:** sending is a TODO in `routes/auth.js`. `SHOW_OTP_ON_SCREEN` controls whether the OTP is returned in the response.

`server/.env` exists locally and is gitignored. Don't print its contents or copy them anywhere.
