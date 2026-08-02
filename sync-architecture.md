# List Sync Architecture

Cross-device sync for the watchlist ("My List") between web and mobile — **anonymous,
no accounts, no email, no personal data.** Identity is a single **permanent 6-char
code** you type in; the list lives on the server; every device keeps a local cache. A
new device joining is **approved by a device you already have**.

Status: **design agreed, not yet built.** This doc is the spec.

> Design note: an earlier draft used QR scanning + an ephemeral pairing "mailbox" +
> minted UUIDs. We deliberately collapsed all of that to *type a permanent code*.
> Why: dropping the camera removes the native rebuild (whole mobile side ships OTA),
> and once **approval** (not secrecy) is the gate, the code needn't be secret — so it
> can be short, typable, permanent, and stored as one plain row. QR is a possible
> *additive* enhancement later (§14), not part of v1.

---

## 1. The problem

The watchlist is device-local on both surfaces and never leaves the device:

| Surface | Storage | Key |
|---|---|---|
| Web | `localStorage` | `pulse_watchlist` |
| Mobile | `AsyncStorage` | `pulse_watchlist_v1` |

Nothing syncs because the list has never left the device — two devices have no way to
know they're the same user. That's an *identity* problem, in a product that has
deliberately never had accounts. (The two keys don't even match; the sync layer
unifies them, §9.)

## 2. Goals & non-goals

**Goals**
- Sync the watchlist across a user's web and mobile devices.
- Fully anonymous — no account, email, or PII.
- Low friction: type a short code, no camera, no app rebuild (ships OTA).
- Make sync state *visible* so a user can tell when a device is unlinked.
- A new device can't silently attach — an existing device approves it.

**Non-goals (v1)**
- Accounts / sign-in (upgrade path, §14).
- QR scanning (additive later, §14).
- Sharing lists between different people.
- Conflict-free multi-device offline editing (§14).

## 3. Core principles

1. **Anonymous.** The server stores `code → list`. It has no idea who the user is.
2. **One permanent code is the identity.** A 6-char, unambiguous, *typed* code. It is
   the bucket key, the pairing handle, *and* the recovery key — the same value
   everywhere. Rotatable if you ever want to burn it.
3. **The server is the source of truth.** The durable list lives in `sync_lists`,
   keyed by the code. Each device's local storage is a *cache*.
4. **Approval is the gate, not secrecy.** Typing a code only says *which* list you
   want; an existing device must approve the join. So the code doesn't need to be
   secret — which is exactly why it can be short and typable.
5. **The human is the transport.** You read the code off one device and type it into
   another. There is no device-to-device channel and no camera — you are the channel
   (the TV-activation pattern).

## 4. Identity — the code

- **Permanent, 6 characters, unambiguous alphabet** (no `O/0`, no `I/1/L`) so it's
  memorable in one glance and hard to fat-finger from memory. Familiar 2FA-style
  length.
- Generated server-side on first sync, stored on each linked device, shown in the
  app's sync settings.
- It is the bucket key (`sync_lists.code`), the thing you type to link a device, and
  your recovery key — writable-down.
- **Rotatable:** generate a new code, the old one dies. Gives the "throw it away"
  option on demand without making the code ephemeral by default (which would cost a
  whole extra table of short-lived codes — deliberately avoided).
- **Not a secret.** Brute-force/guessing is irrelevant here: approval (§8) is the
  gate, and the data (an anonymous list of titles) is worthless to steal. A light
  per-IP rate-limit on join attempts blunts enumeration.
- **Length is a dial (§14).** 6 today. Why not 4? *Collision headroom* — a permanent
  code permanently consumes a slot, and 4 chars (~1M) starts colliding in the low
  thousands of users; 6 (~1B) never needs revisiting. Why not 8? Slightly more to
  type for a protection (enumeration) already covered by rate-limiting. Bump to 8 or
  add auth only if scale/value grows.

## 5. Data model — one table

Access is **always** via Cloudflare Pages Functions holding the service key (same
pattern as `functions/api/push-register.js`). Clients never touch Supabase directly;
RLS stays locked.

```sql
create table sync_lists (
  code          text primary key,            -- permanent 6-char, unambiguous alphabet
  items         jsonb not null default '[]', -- the watchlist blob
  members       jsonb not null default '[]', -- push tokens of linked devices (approval routing)
  pending_joins jsonb not null default '[]', -- {id, at} awaiting approval; expire on read
  updated_at    timestamptz not null default now(),  -- server-stamped
  created_at    timestamptz not null default now()
);

alter table sync_lists enable row level security;  -- no anon policies; access via Pages Functions
```

One table. No second table of throwaway/pairing codes — that complexity only existed
for ephemeral codes, which we don't use. `members` and `pending_joins` are jsonb
columns, not tables, to keep it to a single row per bucket.

The list rides as a `jsonb` blob because it matches how the client already holds it
(an array of `WatchEntry`).

## 6. Server API (Pages Functions, under `ephixpulse-web/functions/api/sync/`)

| Endpoint | Body | Returns | Purpose |
|---|---|---|---|
| `POST /create` | `{ deviceToken? }` | `{ code }` | Generate a unique 6-char code, insert the row. Caller pushes its current list next. First device is auto-member. |
| `POST /pull` | `{ code }` | `{ items, updated_at }` or `404` | Fetch the server list. |
| `POST /push` | `{ code, items, baseUpdatedAt }` | `{ ok, updated_at }` | LWW upsert. Server **stamps** `updated_at`; rejects if server's is newer than `baseUpdatedAt` (forces pull+merge — §9). |
| `POST /join` | `{ code, deviceToken? }` | `{ status: 'approved' \| 'pending' }` | Request to link this device. Bootstrap (no members) → auto-approved. Otherwise records a pending join and pushes an approval prompt to existing members. |
| `POST /approve` | `{ code, joinId, decision }` | `{ ok }` | Called from an existing member (via the approval push action) to approve/deny a pending join. On approve, the device becomes a member and may pull. |

Timestamps are **server-authoritative** (§9, finding #4) — never trust a client clock
for LWW.

## 7. How a device links, and how data moves

Two different things travel on two different paths:

- **The code (identity)** moves device-to-device **through you** — read it off an
  existing device's settings, type it into the new one. No wireless channel, no
  camera.
- **The list (data)** moves **server → device** through `pull`. It never rides with
  the code.

**Fresh laptop wants to sync with the phone:**
1. On the phone: sync settings show `4F9K2Q`.
2. On the laptop: "Enter your sync code" → you type `4F9K2Q`.
3. Laptop calls `join { code }` → server pushes an approval prompt to the phone.
4. You tap **Approve** on the phone → laptop is a member → laptop `pull`s the list.

The laptop needs nothing *from* the phone automatically — it needs you to carry six
characters. That manual carry is the deliberate price of dropping QR/mailbox; six
characters is a cheap fare.

## 8. Approval gate

A new device joining an *existing* bucket must be approved by a device already holding
that code.

- **Approver = any member with a push channel.** We never crown a "primary" — every
  device holding the code is an equal holder, so the approval prompt goes to *all*
  members that can receive one, and the **first to answer wins**. Possession of the
  code *is* the authority to vouch.
- **Bootstrap:** the *first* device has no one to ask and an empty list worth nothing
  — so first link auto-completes. Approval gates every *additional* device.
- **What it defends:** the office drive-by — someone reads/guesses your code and tries
  to join. The join stalls until a device you're holding approves; an unexpected
  prompt gets denied. (For this data it's low-stakes, but the gate is cheap and it's
  the universally-correct pattern — WhatsApp/Signal linked devices.)
- **Reuses the push system** we just fixed. The one link needed: associate the code
  with member push tokens (`members` column) so the server knows whom to ask.
- **Today's approver set is mobile** (Expo push). A web device could join the approver
  set once it has web-push; the principle generalizes.
- **Rate-limit** join attempts per IP so enumeration can't spam members with prompts.

> Simpler alternative if the push handshake feels heavy: a **pairing window** — an
> existing device toggles "allow a new device for 2 min," and joins are accepted only
> during that window. One timestamp column, no push dependency, no `pending_joins`.
> Same drive-by protection, proactive instead of reactive. Worth considering for v1.

## 9. Reconciliation

- **Union-on-link:** when a device first joins a code it usually has its own local
  list, so the first reconcile is a *union* by `(type, id)` — nobody loses entries.
- **After that, server-stamped LWW with an optimistic check** (#4): `push` carries the
  `updated_at` the client last saw; if the server has moved on, the push is rejected
  and the client pulls + merges instead of blind-clobbering.
- **A failed or `404` pull must never wipe a good local list** (#5). Unknown code →
  surface "re-link," keep local intact.
- **Known asymmetry** (#6): ongoing reconcile is blob-replace, so a title *added*
  offline on one device can be lost on next pull, while *deletes* propagate. Fine for
  a single-person, low-frequency list; per-item tombstones is the upgrade if it bites.

## 10. Sync status (out-of-sync awareness)

A device can't auto-detect that it was *previously* linked after a wipe (no state =
no memory), but it can always show its *current* state — which is what the user needs:

- **Synced · Xm ago** — linked; pull-on-focus keeps it fresh, tap to refresh.
- **Local only** — not linked; this list is only on this device.

A wiped browser showing "Local only" tells the user "reconnect," not "my list
vanished." And a device with no code has no push target, so it **can't clobber the
server**.

## 11. UX

**Permanent** sync affordance on the list screen — never gated on empty. The empty
state does double duty: spare canvas to **introduce sync as a feature** (a new user
discovers it with nothing to lose) as well as "bring my list back."

Copy is direction-neutral and reassuring: *"Sync this list across your devices —
anonymously. No account, no email."*

| State | Shows |
|---|---|
| Empty + unsynced | Feature intro + "Enter a sync code" + "Start syncing" (creates a code) |
| Has items + unsynced | Compact "Local only" + "Sync this list" |
| Synced | "Synced · Xm ago", your code (to add another device), manage/rotate |

The modal has two plain actions, no camera: **"Enter code"** (type a code from another
device) and **"Show my code"** (display this device's code to type elsewhere).

## 12. Recovery scenarios

| Scenario | What happens |
|---|---|
| New device (you have an existing one) | Read the code off the existing device, type it in, approve on the existing device, pull. |
| Wiped browser (phone still has it) | Same — read the code from the phone's settings, type into the browser, approve on the phone. |
| Everyday staleness | Pull-on-focus + "Synced · Xm ago" + tap-to-refresh. |
| **Total loss** (all devices gone) | Orphaned **unless you saved the code** — because it's permanent and writable-down, a jotted code recovers even from zero surviving devices. Optional email escrow (§14) is the fuller fix. |

## 13. Security & privacy

- **Anonymous end to end** — `sync_lists` is keyed by a random code, not a person.
- **Approval is the gate, not the code.** A leaked/guessed code is *inert* without an
  existing device approving the join — so the code being short and typable costs
  nothing here.
- **Rate-limit** join attempts (enumeration → prompt spam).
- **RLS locked; service key server-side only** (matching `push-register.js`).
- **Deploy reach:** these endpoints live in `ephixpulse-web`; pushing that repo
  auto-deploys to production *and* ships the mobile backend to installed apps — web
  and mobile rollouts are not independent. Deploy deliberately.

## 14. Known limits & future work (dials scale with data value)

- **Total-loss orphaning** — mitigated by the writable permanent code; fully closed
  only by optional **email escrow** (opt-in magic-link recovery; the soft bridge to
  accounts).
- **Offline blob-clobber** (§9) — upgrade path is per-item tombstones (CRDT-lite).
- **Length / auth dial** — 6 → 8 → accounts as scale or data-sensitivity grows. For
  sensitive data the whole posture flips: secret high-entropy code, no typable durable
  code, bound (not bearer) pairing, mandatory approval. The *mechanism* here ports;
  the hardening dials turn up.
- **QR scanning** — a purely *additive* enhancement: same code, the QR just encodes
  it. Costs one native rebuild (the camera module) — the single native cost we're
  deferring by shipping type-only first.

## 15. Build order

1. **Server layer** — `sync_lists` table + `create` / `pull` / `push`. Testable in
   isolation (a row + two browser tabs); ships **zero** user-facing change. Deploy is
   a deliberate, separate step (§13).
2. **Sync status + storage-key unification** on both clients. Pure JS / OTA.
3. **Enter-code / show-code UI + `join`.** Pure JS / OTA.
4. **Approval gate** (`join`/`approve` + push, or the pairing-window variant) and wire
   `push`-on-change / `pull`-on-focus / union-on-link into `useWatchlist` and the web
   equivalent. Pure JS / OTA.
5. *(Later)* code rotation; email escrow; QR scanning; 8-char / accounts.
