# 🌸 PhoolDhara — Razorpay Deploy Guide
## Sirf 3 Steps!

---

## STEP 1: Backend — Render.com Pe Deploy Karo (FREE)

### A) GitHub pe daalo:
1. `github.com` pe free account banao
2. New repository banao: **"phooldhara-backend"**
3. Yeh 3 files upload karo:
   - `server.js`
   - `package.json`
   - `.env`

### B) Render.com pe deploy karo:
1. `render.com` → free account banao
2. **"New Web Service"** → GitHub repo connect karo
3. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. Deploy hone ke baad milega:
   ```
   https://phooldhara-backend.onrender.com
   ```
   ← **YEH SAVE KAR LO!**

---

## STEP 2: HTML File Mein URL Update Karo

`PhoolDhara_final.html` mein yeh line dhundho:
```javascript
const BACKEND_URL = 'https://YOUR_RENDER_URL.onrender.com';
```

Replace karo:
```javascript
const BACKEND_URL = 'https://phooldhara-backend.onrender.com';
```

---

## STEP 3: Website Host Karo — Netlify (FREE)

1. `netlify.com` → free account
2. **"Deploy manually"** → `PhoolDhara_final.html` drag & drop
3. Done! Aapki website live ho jayegi 🎉

---

## Credentials Already Set Hain ✅
- Razorpay Key ID: `rzp_live_SoWiuNg8H8o5s8` ✅
- Razorpay Key Secret: Set in `.env` ✅

---

## Test Karo:
1. Website kholo
2. Product select karo → Fragrance choose karo
3. **"Pay with Razorpay"** click karo
4. Name, Phone dalo → **"Pay Securely"**
5. Razorpay checkout khulega — UPI, Card, NetBanking sab milega! ✅
