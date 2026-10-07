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

The site needs Node.js 20+ hosting, because the server runs the API and serves the built site from one process. Steps:

1. Run `npm run build` in `client/`.
2. Run `npm start` in `server/`, with `NODE_ENV=production`, a strong `JWT_SECRET` and the real Firebase keys.
3. Put HTTPS in front of it, for example nginx proxying to port 5000.
4. In MongoDB Atlas, allow the server's IP under Network Access.
