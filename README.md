# Panini WC 2026

A mobile-first web app to track progress on a single shared Panini FIFA World Cup 2026 sticker album. Multiple people edit the same global collection. No login, no users, no auth — one shared state, last-write-wins, trust-based.

**Live:** <https://panini-mania.vercel.app>

## Firebase setup

1. Create a Firebase project at <https://console.firebase.google.com>.
2. Add a **Web app** to the project. Copy the config keys.
3. Enable **Cloud Firestore** (Native mode, any region works).
4. Open **Firestore → Rules** and paste:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /stickers/{code} {
         allow read, write: if true;
       }
     }
   }
   ```

5. Copy `.env.example` to `.env.local` and fill in the 6 Firebase keys:

   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

## Local dev

```
pnpm install
pnpm dev
```

The app runs at <http://localhost:5173>. Firestore subscribes on mount; updates from other clients appear in real time.

## Deploy (Vercel)

1. Connect this repo to Vercel.
2. In **Project Settings → Environment Variables**, paste the 6 `VITE_FIREBASE_*` keys.
3. Build command: `pnpm build`. Output directory: `dist`.
4. Deploy. The app is a single-page Vite build with no server.
