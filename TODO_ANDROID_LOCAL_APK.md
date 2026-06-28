# TODO: Get Local Android APK (Expo/EAS) for `apps/mobile`

## Goal
Produce a **local Android APK** from the mobile app.

> Note: This repo’s verification script (`apps/mobile/verify-api.js`) currently fails at **login**. You can still build the APK, but if you want the app to load data successfully right after install, fix auth first.

---

## Step 1 — Configure mobile env
1. Open:
   - `apps/mobile/.env.local`
2. Ensure these exist and are correct:
   - `EXPO_PUBLIC_API_URL=<backend base url>/api`
   - `TEST_EMAIL=<valid backend user email>`
   - `TEST_PASSWORD=<valid backend user password>`

---

## Step 2 — (Recommended) Fix backend auth verification
1. Run:
   ```bash
   cd apps/mobile
   node verify-api.js
   ```
2. Expected: login succeeds and endpoint tests run.

If it still fails, check:
- backend is running at `EXPO_PUBLIC_API_URL`
- test user exists in backend
- backend returns `{ accessToken, refreshToken }` from `/auth/login`

---

## Step 3 — Build the APK (local/internal)
From `apps/mobile`:
```bash
cd apps/mobile
pnpm eas build -p android --profile preview
```

This uses `apps/mobile/eas.json` where:
- `preview.android.buildType = "apk"`
- `preview.distribution = "internal"`

After the build completes:
- download the generated APK from the EAS build output.

---

## Step 4 — Install the APK
- Install on your Android emulator/device using Android tooling (or drag/drop the APK onto the emulator).

---

## Step 5 — Test the app
1. Open the app
2. Login (or auto-session if tokens persist)
3. Verify screens load data (Dashboard/Farms/Crops/etc.)

---

## Done criteria
- APK installs successfully on Android
- App launches without crashes
- (If you ran Step 2) login + API data loading works

