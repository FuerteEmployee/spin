# Spin & Win

Users log in with a mobile number (the OTP is shown on screen), spin the wheel, get a random reward, and claim it on WhatsApp with a pre-filled message.

## Current setup: static site (no backend)

Everything runs in the browser. The offers and the WhatsApp number are hardcoded in **[client/src/config.js](client/src/config.js)**:

| Setting | What it does |
| --- | --- |
| `WHATSAPP_NUMBER` | Number that receives claims: country code + number, e.g. `919876543210` |
| `BRAND_NAME` | Name shown on the page and in the WhatsApp message |
| `REWARDS` | Wheel segments: label, colour, icon, `weight` (chance) and `isWin` |

Default odds: 5% Off 30 · 10% Off 22 · 15% Off 12 · Try Again 33 · 1 Month Free 2.5 · 6 Months Free 0.5.
Any 10-digit mobile number is accepted. Users can keep spinning after a win: every win is added to **My Rewards**, each with its own WhatsApp Claim button. The **Reset** button clears that list. "Try Again" isn't added to the list.

The favicon is the BillingSphere logo: `favicon.ico` (16/32/48 px), `favicon-192.png` and `apple-touch-icon.png` in `client/public/`.

### Run and build

```bash
cd client
npm install
npm run dev        # development: http://localhost:5173
npm run build      # outputs client/dist
npm run preview    # serve the built dist: http://localhost:4173
```

### Deploy

billingsphere.com itself runs on a separate nginx server (13.201.55.204). Its DNS zone is in Hostinger (`ns1/ns2.dns-parking.com`).

**Option A: subdomain on Hostinger (https://spin.billingsphere.com)**
1. Run `npm run build` (assets are served from `/`).
2. In hPanel, create the subdomain `spin` with its folder set to `public_html/spinandwin`.
3. In the DNS zone, add an A record: `spin` → the Hostinger website IP. Leave `@` and `www` as they are.
4. Upload the contents of `dist/` to `public_html/spinandwin`, then install the free SSL for the subdomain.

**Option B: sub-folder on the main nginx server (https://billingsphere.com/spinandwin/)**
1. Run `npm run build:subfolder` (assets are served from `/spinandwin/`).
2. Copy the contents of `dist/` to `/var/www/spinandwin/` on 13.201.55.204.
3. Add the blocks from [deploy/nginx-spinandwin.conf](deploy/nginx-spinandwin.conf) to the site's nginx config.
4. Run `sudo nginx -t && sudo systemctl reload nginx`.

`dist/.htaccess` only matters on Apache/LiteSpeed (Hostinger). nginx ignores it.

### Limits of the static version

- No SMS is sent. The OTP is generated in the browser and shown on screen.
- Wins are stored in the browser's `localStorage`, so they only show in that browser.
- You don't receive any record of a win other than the WhatsApp message.

## Later: switching to the database

`server/` already has a Node.js + Express + MongoDB API with the same flow: hashed OTPs with expiry, attempt limits and resend cooldown; JWT login; the server picks the reward; one win per user enforced by a unique index; coupon codes; claim tracking.
**It hasn't been run or tested yet.** It still allows only one win per user. To match the static site's spin-after-win, Reset and win-list behaviour, it will need a list endpoint and a reset endpoint.

To switch over:
1. `cd server && npm install`, copy `.env.example` to `.env`, and set `MONGO_URI`, `JWT_SECRET` and `WHATSAPP_NUMBER`.
2. `npm run dev` starts it on port 5000. It seeds the rewards on first start.
3. Replace the function bodies in [client/src/services/spinService.js](client/src/services/spinService.js) with `fetch('/api/...')` calls. The endpoint for each function is listed at the top of that file. Then add a Vite proxy for `/api`.
4. Plug an SMS provider (MSG91, Twilio, Fast2SMS) into `server/src/routes/auth.js` and set `SHOW_OTP_ON_SCREEN=false`.
