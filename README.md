# Sadguru Selection – Scan & Win

Customers scan the QR code at the stall, log in with their mobile number and an OTP, and spin the wheel **once per mobile number**. Then they get their voucher on WhatsApp.

Everything customers see is managed in the admin panel at **`/admin`**:

| Section | What you can change |
| --- | --- |
| Dashboard | Users, winners, vouchers sent on WhatsApp and redeemed, and wins per reward |
| Users & Winners | Every user with their reward, voucher code and status. Search, filter, mark as redeemed, allow a re-spin, export to CSV |
| Rewards & Wheel | Wheel segments: name, wheel text, icon, colours, chance (weight), live preview. Includes "Load Navratri defaults" |
| Texts & T&C | Headlines, win screen texts, and the Terms & Conditions shown at the bottom of every page |
| Backgrounds & Logo | Separate desktop and mobile background images, the logo, and the background darkness |
| WhatsApp & Campaign | Open or close spinning; send the voucher to the customer's own WhatsApp or to the store's number; the message template; the voucher code prefix |

## Run locally

```bash
# 1. API (MongoDB Atlas). Copy server/.env.example to server/.env and fill it in.
cd server
npm install
npm start            # http://localhost:5000

# 2. Website. Copy client/.env.example to client/.env and add the Firebase web config.
cd client
npm install
npm run build        # the server then serves the site at http://localhost:5000 and the admin panel at /admin
# or, while developing: npm run dev   (http://localhost:5173, proxies /api to :5000)
```

The admin login is `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `server/.env`.

## OTP

- `OTP_MODE=firebase`: a real SMS through Firebase Phone Auth. To set it up:
  1. In the Firebase console, enable **Authentication → Sign-in method → Phone**.
  2. Add your domain under **Authentication → Settings → Authorized domains**. `localhost` is already there.
  3. Real SMS needs the **Blaze** plan. For testing without it, add test numbers and codes under **Phone → Phone numbers for testing**.
  4. Set `FIREBASE_PROJECT_ID` in `server/.env` and the `VITE_FIREBASE_*` keys in `client/.env`, then rebuild the client.
- `OTP_MODE=screen`: the OTP is shown on screen and no SMS is sent. Use this for testing only, because anyone could use any number's spin.

## Deploy

The project is live in two parts:

| Part | Address | Hosting | How it updates |
|---|---|---|---|
| **Website** (contest page + admin panel) | https://sadguruselection.com/spin-and-win-contest/ | Static files in `public_html/spin-and-win-contest` of the sadguruselection.com website on Hostinger | Build locally, upload the zip |
| **API** (logins, spins, admin data) | https://spin-api.fuertedevelopers.com | Hostinger **Node.js app**, connected to this GitHub repo (`main`) | Push to GitHub, then click **Redeploy** |

Admin panel: https://sadguruselection.com/spin-and-win-contest/admin

### Updating the API (anything in `server/`)
1. Commit and push to `main`.
2. In hPanel, open the **spin-api.fuertedevelopers.com** Node.js app, go to **Deployments** and click **Redeploy**. It installs, builds and restarts by itself (about 1–2 minutes).
3. Check that https://spin-api.fuertedevelopers.com/api/health shows `{"ok":true}`.

### Updating the website (anything in `client/`)
1. Build it:
   ```bash
   cd client
   npm run build:sadguru      # uses client/.env.sadguru: API address, real SMS, /spin-and-win-contest/ paths
   ```
2. Zip the **contents** of `client/dist`, including the hidden `.htaccess`. On Windows, use `tar -a -cf site.zip -C client/dist .htaccess index.html favicon.ico favicon-192.png apple-touch-icon.png assets`. Don't use PowerShell's `Compress-Archive`: its backslash paths break on Hostinger.
3. In File Manager (the sadguruselection.com website), open `public_html/spin-and-win-contest` and **delete everything inside**.
4. Upload the zip, **Extract** it, then delete the zip. If the extractor won't replace `index.html`, delete it first and upload it on its own.
5. Open the site in an incognito tab to check.
6. Run `npm run build` again afterwards for local use. Both builds write to `client/dist`.

### Settings that live outside the code
- **API environment variables** (hPanel → Node.js app → Environment variables): `MONGO_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `OTP_MODE=firebase`, `FIREBASE_PROJECT_ID`, `NODE_ENV=production`, and:
  - `CLIENT_ORIGIN=https://sadguruselection.com,https://www.sadguruselection.com`
  - `PUBLIC_URL=https://spin-api.fuertedevelopers.com`

  Click **Redeploy** after changing any of them.
- **Firebase** (project `fuerte-faidepro`): Authentication → Settings → Authorized domains must include `sadguruselection.com` and `www.sadguruselection.com`.
- **MongoDB Atlas**: Network Access must allow the Hostinger server.
- **Content** (texts, T&C, rewards, backgrounds, logo, WhatsApp, campaign on/off) is edited in the admin panel and needs no deploy.
