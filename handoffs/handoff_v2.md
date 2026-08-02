# Handoff Summary: Push Diff Fix, List Sync Design & WC2026 Feed Retirement

## Executive Summary
Three workstreams this session:
1. **Push "New in Top 25" diff bug** — root-caused, fixed, deployed (wrangler), and
   verified end-to-end (a real notification landed on device). **Live but still
   uncommitted in git** — see §4.
2. **Cross-device list sync** — full architecture **designed and documented**
   ([sync-architecture.md](file:///c:/Users/lewih/Dev/ephixpulse-mobile/sync-architecture.md)).
   **Not built yet** — design only.
3. **`wc2026.ics` calendar feed** — retired via a 410 Gone Pages Function; committed,
   pushed, and **verified live on production**.

---

## 1. Push "New in Top 25" diff bug (ephixpulse-web)

### Root cause
In [push/push-cron-worker.js](file:///c:/Users/lewih/Dev/ephixpulse-web/push/push-cron-worker.js),
`run()` advanced the KV baseline (`prev_top25`) **before** the diff was consumed:

```js
const prev = prevRaw ? JSON.parse(prevRaw) : null;
await PUSH_KV.put('prev_top25', JSON.stringify(currentIds));  // consumed the diff first
const fresh = rows.filter(r => !prev.includes(...));           // then used it
```

Whichever invocation ran first after a snapshot changed (usually the hourly cron)
ate the new entries; every later call — including the manual `?run=1` from the phone —
saw an empty diff and reported "no new entries since last run." Compounded by
`.catch(() => {})` swallowing Expo send failures and a silent `sent to 0 token(s)`
when there were no tokens.

### Changes implemented
- Baseline now advances **only after Expo confirms the send** (HTTP 2xx). Transport
  errors / non-2xx return `failed: … baseline held for retry`; zero tokens returns
  `held: … no registered push tokens`. The diff is never lost on failure.
- Expo per-token tickets are parsed and surfaced (`DeviceNotRegistered`, etc.) instead
  of being swallowed.
- New debug endpoints: **`?peek=1&key=…`** (read-only diff, mutates nothing — safe to
  refresh) and **`?test=1&key=…`** (pushes to every token immediately, independent of
  the diff; returns token count + raw Expo response).
- Stale header comment corrected (config is `../wrangler.jsonc` as `ephixpulse-cron`,
  not a `wrangler.toml` named `ephix-push`).

### Deploy status
Deployed to the **`ephixpulse-cron`** Worker via `npx wrangler deploy` and verified
(peek showed the diff correctly; a real notification arrived on device). **NOTE:** the
worker deploys via wrangler, *not* via the Pages git connection.

> ⚠️ **Uncommitted.** `push/push-cron-worker.js` is live via wrangler but its changes
> are **not committed to git** (working tree only). Commit when convenient.

---

## 2. Cross-device list sync — architecture (ephixpulse-mobile + web)

Full design agreed and written to
[sync-architecture.md](file:///c:/Users/lewih/Dev/ephixpulse-mobile/sync-architecture.md).
**Status: design only, nothing built.**

### Final model (after collapsing several earlier drafts)
- **Anonymous, no accounts.** Identity is a **permanent 6-char code** (unambiguous
  alphabet), stored as one row in a single `sync_lists` table. It's the bucket key,
  the pairing handle, and the recovery key. Rotatable.
- **Type-only, no QR/camera** → the whole mobile side ships **OTA** (no native
  rebuild). QR is a purely additive future enhancement (would cost one native build).
- **Approval-gated:** a new device joining is approved by an existing device holding
  the code (any holder with push; first to answer wins; the very first device
  bootstraps with no approval). This is what lets the code be short/typable and
  non-secret — **approval, not secrecy, is the gate**.
- **Server is source of truth; local storage is a cache.** Server-stamped timestamps
  + optimistic concurrency; a failed/404 pull must never wipe a good local list;
  union-on-link so nobody loses entries.
- **How a fresh device links:** the human is the transport — read the 6-char code off
  an existing device, type it into the new one, approve on the existing device, pull.
- Build order is in **§15** of the doc; step 1 (server table + create/pull/push) ships
  zero user-facing change and is testable with a DB row + two browser tabs.

### Also uncovered
- Storage-key mismatch to unify during build: web `pulse_watchlist` vs mobile
  `pulse_watchlist_v1`.

---

## 3. WC2026.ics calendar feed retirement (ephixpulse-web)

### Root cause
The `.ics` feed was deleted, but the site's catch-all ("any 404 → root") served the
**homepage HTML with HTTP 200** at `/wc2026.ics`, and the `_headers` rule mislabeled
it `text/calendar`. To subscribed calendar apps, `200 OK` = "feed's fine, keep
polling" — so thousands of clients (Google/Apple, no browser UA, invisible to JS-beacon
Web Analytics) kept fetching the homepage-as-a-calendar indefinitely. Deleting events
did nothing because the catch-all 200s everything.

### Changes implemented
- New **[functions/wc2026.ics.js](file:///c:/Users/lewih/Dev/ephixpulse-web/functions/wc2026.ics.js)**
  returns **410 Gone** (text/plain) for that exact path — takes precedence over the
  catch-all. 410 is the one status that tells a calendar client the feed is
  permanently gone so compliant clients unsubscribe.
- Removed the stale `/wc2026.ics` block from
  [_headers](file:///c:/Users/lewih/Dev/ephixpulse-web/_headers) (was forcing
  `text/calendar`, which caused the "downloads an ics" behavior).

### Deploy status — DONE
Committed as **`67b7081`** (only these two files), pushed to `main` → Cloudflare Pages
git deploy. **Verified live:** `HTTP/1.1 410 Gone`, `Content-Type: text/plain`, body
`"410 Gone — the FIFA World Cup 2026 calendar feed has been retired."`

### Expectation
Google/most clients wind down over days–weeks; Apple's subscriptions linger but are
just cheap edge-cached 410s (harmless). Up to ~1h tail where an edge may serve the old
cached 200.

---

## 4. Open items / next steps
1. **Commit `push/push-cron-worker.js`** — live via wrangler, uncommitted in git (§1).
2. **Build the list sync feature** — design is done (§2); start at
   `sync-architecture.md` §15 step 1 (server layer).
3. **Lockfile hygiene (unresolved):** the web repo is intentionally on **pnpm**
   (`.npmrc` `node-linker=hoisted`, pnpm-style `node_modules`). Confirm no stray
   `package-lock.json` remains that could make EAS resolve a different tree.
4. **`wc2026.html` follow-up (optional):** its "Subscribe in Google/Apple" buttons
   still point at the now-410 feed. The one-time **Download** button still works
   (client-side blob). Pull the subscribe buttons if desired.

---

## 5. Key takeaways
- **Order of operations on diffs:** never advance a baseline before the diff is
  consumed *and* the side effect (send) is confirmed. Hold the baseline on failure so
  the next run retries instead of losing data.
- **A GET with side effects is a trap:** `?run=1` consumed a diff on every refresh.
  `?peek=1` (read-only) is the safe way to inspect state.
- **You can't delete your way out of a catch-all that returns 200.** To retire a
  polled feed (calendar/RSS/webcal), serve **410 Gone** — 200 and 404 both keep
  clients polling.
- **Approval, not secrecy, can be the access gate** — it's what lets an anonymous
  sync code be short, typable, and permanent without being a liability.
