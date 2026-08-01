# Handoff Summary: Mobile Push Notification Resolution

## Executive Summary
The push notification failure on the mobile app (`ephixpulse-mobile`) has been **fully diagnosed, fixed, and verified**. Test notifications are now successfully delivering to production Play Store / installed devices.

---

## 1. Root Causes Identified

### A. Misleading UI Error Masking (`lib/push.ts`)
- **The Issue**: Any failure during `Notifications.getExpoPushTokenAsync()` was caught and mapped directly to `'unsupported'`.
- **The Symptom**: The app displayed *"Push needs the installed app — it doesn't run in Expo Go"*, even on real production builds (`env=bare`), sending developers down the wrong rabbit hole.

### B. GCP API Key Restrictions (`FCM Registration failed!`)
- **The Issue**: The Android API key (`AIzaSyDFSD...`) in Google Cloud Console had strict **Android Application Restrictions** checking SHA-1 package fingerprints.
- **The Impact**: During native FCM token fetching via `getDevicePushTokenAsync()`, Google's API gateway rejected the request with `fcm:FAIL E_REGISTRATION_FAILED Fetching the token failed: FCM Registration failed!`.

---

## 2. Changes Implemented

### Codebase Updates (Mobile Project)
1. **[lib/push.ts](file:///c:/Users/lewih/Dev/ephixpulse-mobile/lib/push.ts)**:
   - Added `'error'` state to the `PushStatus` type definition.
   - Separated raw FCM token generation (`getDevicePushTokenAsync`) from Expo push token exchange (`getExpoPushTokenAsync`).
   - Added detailed diagnostic output (`diag3`) capturing exact error codes and project IDs.

2. **[components/NotifyModal.tsx](file:///c:/Users/lewih/Dev/ephixpulse-mobile/components/NotifyModal.tsx)**:
   - Added a dedicated UI state for `'error'` status featuring the exact diagnostic output and a "Try again" button, replacing the misleading Expo Go message.

3. **EAS OTA Deployment**:
   - Deployed the code fix live to production via EAS Update (free JS-only deployment, zero build credit cost):
     ```bash
     $env:CI="1"; eas update --branch production --environment production --platform android --message "diag3: isolate FCM vs Expo token failure"
     ```

### Infrastructure & Cloud Configuration
- **Application Restrictions** (Top section): Set to **None** (because Android SHA-1 package checks reject background Firebase Installation token requests).
- **API Restrictions** (Bottom section): Set to **Restrict key** and check ONLY the client APIs:
  - **Firebase Installations API**
  - **FCM Registration API** / **Firebase Cloud Messaging API**
- *Why this works*: Client Firebase API keys are public by design. Using **API Restrictions** prevents the key from being used against any other Google Cloud service (Firestore, Storage, SQL, Logging, etc.), securing the key without breaking push notification registration!

---

## 3. Empirical Verification Results
- **Device Diagnostic**: App loaded updated JS bundle `env=bare · isDevice=true · js=diag3`.
- **Token Registration**: App successfully obtained token and registered with `/api/push-register` ("Notifications are on").
- **End-to-End Delivery**: Triggered push notification test; push alert was received on the physical Android device.

---

## 4. Key Takeaways for Future Maintenance
- Do **not** map general token errors to Expo Go checks.
- Do **not** apply Android SHA-1 Application Restrictions on Firebase client keys if using Expo FCM token generation, as background installation services will be rejected by GCP.
- OTA updates (`eas update`) should always be used for JS diagnostic improvements before attempting costly native rebuilds.
