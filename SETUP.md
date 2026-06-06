# Ephix Pulse — Mobile (Expo + React Native)

A native iOS/Android build of ephix.net/pulse. Same Cloudflare `/api/*` backend,
the same Pulse scoring logic ported over, native UI with Expo Router.

Built on **Expo SDK 56**. Run it in **Expo Go** (SDK 56) on your phone, or in a
simulator/emulator. No paid developer accounts needed until you submit to the stores.

---

## 0. What you need (one-time)

1. **Node.js LTS** (v20 or v22). Check: `node -v`.
2. The **Expo Go** app on your phone — install from the App Store / Play Store.
3. A free **Expo account** — sign up at https://expo.dev (needed later for builds;
   not needed just to run in Expo Go).
4. Your phone and computer on the **same Wi-Fi** network.

> This project is pinned to SDK 56. If `npx expo install --check` flags anything,
> run `npx expo install --fix` to realign every package to SDK 56.

---

## 1. Install

Unzip this folder somewhere, open a terminal in it, then:

```bash
npm install
```

If npm prints peer-dependency warnings, that's normal. To be 100% sure every
package matches SDK 54 (recommended once):

```bash
npx expo install --check
```

If it lists anything to fix, run:

```bash
npx expo install --fix
```

---

## 2. Configure the backend URL

A `.env` file is already included pointing at your live API:

```
EXPO_PUBLIC_API_BASE=https://ephix.net
```

Leave it as-is to use production. (Native apps have no CORS restriction, so the
app calls `https://ephix.net/api/*` directly — the same Functions your website uses.)

---

## 3. Run it on your phone (Expo Go)

```bash
npx expo start
```

A QR code appears in the terminal.

- **iPhone:** open the **Camera** app, point at the QR code, tap the banner.
- **Android:** open **Expo Go**, tap "Scan QR code".

The app loads on your phone. The animated EPHIX PULSE splash plays while the
first data fetch runs, then the Top 100 grid appears. Edit a file, save, and it
hot-reloads instantly.

Press `r` in the terminal to reload, `j` to open the debugger.

> First launch fetches from TMDB/Trakt/YouTube/Wikipedia and can take a few
> seconds. Pull down on the grid to refresh.

---

## 4. (Optional) Run in a simulator/emulator

Not required, but if you want one:

- **iOS Simulator** (Mac only): install Xcode, then press `i` in the Expo terminal.
- **Android Emulator:** install Android Studio + a virtual device, then press `a`.

---

## 5. When you're ready to ship — EAS Build (the cloud)

You don't need this to develop. You need it to (a) use native modules Expo Go
lacks, or (b) submit to the App Store / Play Store. Builds run in Expo's cloud,
so you don't need Xcode/Android Studio locally.

```bash
npm install -g eas-cli
eas login                # your free Expo account
eas build:configure      # creates eas.json
```

**A test build you can install on your own device (no store needed):**

```bash
eas build --profile preview --platform android   # gives an installable .apk
eas build --profile preview --platform ios        # needs an Apple account for device provisioning
```

**Store submission** — this is where the paid accounts come in:

- **Apple Developer Program** — $99/year (required to ship to the App Store).
- **Google Play Developer** — $25 one-time (required to ship to Play).

Once you have them:

```bash
eas build --profile production --platform all
eas submit --platform ios
eas submit --platform android
```

> Free EAS tier includes a limited number of cloud builds per month — plenty for
> getting started.

---

## 6. Upgrading SDK later (54 → 56+)

When Expo Go moves on or you want the newest SDK:

```bash
npx expo install expo@^56
npx expo install --fix
```

By then you'll likely be using dev builds anyway, so the Expo Go version stops
mattering.

---

## What's in this build

- **Bottom tab bar:** Pulse · Movers · Anticipated · My List.
- **Pulse (home):** Top 100 grid, search, Film/TV + genre filters, pull-to-refresh,
  and a **NEW** badge on titles that just entered the top 25 (tracked on-device).
- **Movers:** server-computed climbers from `/api/movers`, with a 24h / 7d toggle.
- **Anticipated:** unreleased titles split out of the Top 100.
- **Detail:** trailer, where-to-watch (your region), an up/down movement badge,
  a 7-day **Pulse Spark** chart, and **TMDB / IMDb / Google / Share** links.

## Optional: Pulse Spark history

The per-title 7-day sparkline reads `pulse_snapshots` from Supabase via the public
anon key (read-only — it never writes, so it can't affect the website's data). To
enable it, put these in `.env` (same values your website uses):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Leave them blank and the sparkline simply doesn't render — everything else works.

## If the animated splash looks static

It now stays up for a minimum of ~2.6s so a full glow cycle is always visible.
If you still see no motion after changing native deps, clear the Metro cache:

```
npx expo start -c
```

(Reanimated needs its Babel plugin compiled in; a stale cache is the usual culprit.)

## Project layout

```
app/
  _layout.tsx              providers, fonts, splash handoff, root stack
  (tabs)/
    _layout.tsx            bottom tab bar
    index.tsx              Pulse — Top 100 grid, search, filters, refresh, NEW badge
    movers.tsx             Movers — /api/movers climbers, 24h/7d
    anticipated.tsx        Anticipated — upcoming titles
    list.tsx               My List
  title/[type]/[id].tsx    detail modal: trailer, watch, links, movement, spark
components/                BootSplash, TitleCard, PulseBadge, StateViews
lib/
  api.ts                   Cloudflare Functions client
  pulse.ts                 ⭐ your scoring pipeline, ported (TMDB/Trakt/YT/Wiki → Pulse score)
  storage.ts               AsyncStorage cache + watchlist
  tmdb.ts                  image URL + display helpers
hooks/                     useTrending (+ prefetch), useTitleDetail, useWatchlist
theme/                     colors + font names
assets/                    icon, adaptive icon, splash wordmark, glow halo, favicon
```

## Notes / gotchas already handled

- **Reanimated 4** needs `react-native-worklets` (separate package) and its Babel
  plugin is `react-native-worklets/plugin` — already set in `babel.config.js`.
- **No Supabase in v1.** The website writes a ranking snapshot on every page load;
  the app stays read-only so it can't pollute that history. (Movers is a phase-2
  feature and will read — never write — those snapshots.)
- **No login.** "My List" is stored on-device with AsyncStorage.
- **Trailer** uses `react-native-youtube-iframe` (a WebView under the hood) and
  only mounts when you tap "Watch trailer", then unmounts on close.
