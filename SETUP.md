# Rent Book — setup reference

This is a written reference for the steps Claude walks you through in chat.
Nothing here needs to be memorized — follow along one phase at a time.

## What this is
- `index.html` — the page where renters get entered, and where reminders get turned on.
  Hosted free on GitHub Pages.
- `manifest.json`, `sw.js`, `icon-*.png` — what makes the page installable as an app
  on the Home Screen, and able to receive push notifications.
- `scripts/check-rent.js` + `.github/workflows/check-rent.yml` — a free, automatic
  daily check that sends a push notification when someone's rent is due.
- Data (renters + the device's push subscription) lives in a free Firebase (Firestore) database.

Everything here is free — no paid accounts, phone numbers, or per-message costs.

## Phase 1 — Firebase (the database)
1. Go to console.firebase.google.com → sign in with any Google account → **Add project**.
2. Give it any name → you can skip Google Analytics if it asks → **Create project**.
3. In the left sidebar, go to **Build → Firestore Database → Create database**.
   Choose any region, and start in **production mode**.
4. Once created, go to the **Rules** tab and replace the contents with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /renters/{docId} {
         allow read, write: if true;
       }
       match /pushSubscriptions/{docId} {
         allow read, write: if true;
       }
     }
   }
   ```
   Click **Publish**.
5. Go to **Project settings** (gear icon, top left) → scroll to **Your apps** → click the
   **`</>`** (web) icon → give it any nickname → **Register app**. It'll show you a
   `firebaseConfig` object — copy those values into `index.html`, replacing
   `YOUR_FIREBASE_API_KEY`, `YOUR_PROJECT_ID`, `YOUR_SENDER_ID`, and `YOUR_APP_ID`.

## Phase 2 — the notification keys (already generated for you)
No account needed for this part — these are just a matching pair of keys Claude generated:

- Public key: already sitting in `index.html` as `VAPID_PUBLIC_KEY` — leave it as is.
- Private key (keep this one secret, it goes in GitHub, never in `index.html`):
  `F0K-Y_KXdQ0qmmZs67sIq3h-0FLaT3_Dhk12SCkBaqY`

## Phase 3 — a service account key (lets the daily check talk to Firebase)
1. Still in **Project settings**, go to the **Service accounts** tab.
2. Click **Generate new private key** → confirm. A `.json` file downloads.
3. Open that file in any text editor — you'll paste its whole contents into a GitHub secret
   in the next phase.

## Phase 4 — push it to GitHub and add secrets
1. Create a new **private** repo on GitHub, upload all these files (keeping the folder structure,
   including the hidden `.github` folder).
2. Go to the repo's **Settings → Secrets and variables → Actions → New repository secret**
   and add each of these:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` → paste the **entire contents** of the JSON file from Phase 3
   - `VAPID_PUBLIC_KEY` → `BEkk3beWH3ruRaIdJwNID_ZFz92mSc2-Yun93sCXyUwBRHfPKAu40_DiYnl7v7Mx1tKmYKFUwiDqbaPVm2opXUk`
   - `VAPID_PRIVATE_KEY` → `F0K-Y_KXdQ0qmmZs67sIq3h-0FLaT3_Dhk12SCkBaqY`
   - `VAPID_SUBJECT` → `mailto:` followed by any email address you check (e.g. `mailto:you@example.com`)
   - `TIMEZONE` (e.g. `America/New_York`, `America/Chicago`, `Asia/Riyadh`) — optional, defaults to US Eastern
3. Go to **Settings → Pages**, set source to the `main` branch, save. GitHub gives you a URL —
   that's the page your dad uses.

## Phase 5 — turn it on, on his iPhone
1. Open the GitHub Pages URL in **Safari** on his iPhone.
2. Tap the **Share** button → **Add to Home Screen**.
3. Open the app from the **Home Screen icon** (not from Safari) — this step is required on iPhone.
4. Tap **Turn on reminders**, then allow notifications when asked.
5. Add a test renter with **today's** day-of-month as the due day.
6. On GitHub, go to the **Actions** tab → "Check rent due dates" → **Run workflow** to trigger it by hand.
7. Confirm the notification arrives, then remove the test renter.
