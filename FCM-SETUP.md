# Push (FCM) + OTA updates — setup for the installed app

Two independent things, both needing a **build** (neither works in Expo Go):

- **FCM** = lets the `preview` APK *receive* remote push (the "New in Top 25" alerts).
- **OTA (expo-updates)** = lets you push JS/asset changes to an already-installed APK
  without a full rebuild.

---

## A. Android push (FCM) — free, no Play account needed

1. **Firebase project**
   - console.firebase.google.com -> Add project (any name).
   - Add an **Android app**. Package name must be exactly: `net.ephix.pulse`.
   - Download **`google-services.json`** and drop it in the project root
     (next to `app.json`).

2. **Tell the app about it** — add this line to `app.json` under `expo.android`
   (only after the file exists, or the build fails):
   ```json
   "android": {
     "package": "net.ephix.pulse",
     "googleServicesFile": "./google-services.json",
     ...
   }
   ```

3. **Give EAS the FCM v1 key** (so Expo can send through your Firebase):
   - Firebase console -> Project settings -> **Service accounts** -> Generate new
     private key -> downloads a JSON.
   - Run `eas credentials` -> Android -> *Google Service Account* / *FCM V1* ->
     upload that JSON. (EAS may also prompt for this during the build.)

4. **Build + install**
   ```
   eas build -p android --profile preview
   ```
   Install the APK, open the app, tap the bell -> Enable. The token registers with
   `/api/push-register`. Fire a test from your cron worker URL with `?run=1`.

> iOS push additionally needs the **paid Apple Developer account** for the APNs key
> (EAS sets it up once your Apple account is linked). Android above is enough to test.

---

## B. OTA updates (expo-updates) — already wired, one step left

`expo-updates` is installed and `app.json` has `runtimeVersion` + an `updates` block
with a **placeholder URL**. To finish, set the real project URL:

```
eas update:configure
```
That replaces `REPLACE_WITH_PROJECT_ID` in `app.json` with your EAS project id (you
can also paste it by hand — it's the same id in `expo.extra.eas.projectId`).

Then build once more so the APK carries the updater, and publish updates with:
```
eas update --branch preview
```

**Timing / behaviour**
- Publishing lands on EAS in seconds.
- The app checks **on launch**, downloads in the **background**, and applies the new
  bundle on the **next** launch (so users see it on their 2nd open after you publish).
- OTA only ships **JS/asset** changes. Anything native — new modules (e.g.
  `expo-intent-launcher`, `expo-updates` itself), permissions, SDK bumps, the splash —
  needs a **full rebuild**, not an update.

**Channels** (already in `eas.json`): `development`, `preview`, `production`. The branch
you publish to should match the build's channel (e.g. `--branch preview`).
