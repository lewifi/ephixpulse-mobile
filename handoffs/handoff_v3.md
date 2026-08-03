# Watchlist Sync & Ordering Fixes Handoff (v3)

This is the final handoff document tracking where we are at.

---

## 1. Project Status Summary

Both the web and mobile codebases have been updated to support a unified sync model with diagnostic consoles.

* **Web Client**: Updated in `index.html`.
* **Mobile Client**: Updated in `useWatchlist.ts` and `sync.ts`.
* **Backend APIs**: Unchanged.

---

## 2. Completed Fixes

1. **Union Merge Clobbering (Web)**: Fixed web join/link and conflict flows to perform a Set-based union merge (keeping local items and appending remote items) instead of clearing the local list.
2. **Standardized Ordering**: Aligned both clients on **newest-first (index 0 is newest)** canonical layout:
   * Changed Web to prepend new keys (`watchlist = new Set([k, ...watchlist])`).
   * Removed display-time `.reverse()` in Web `renderGrid()`.
   * Added a one-time migration on web boot to reverse the localStorage list order.
3. **Double-Press Bookmark Race Condition (Mobile)**:
   * **Centralized Startup Pull**: Added a module-level `hasPulledOnStartup` check in `useWatchlist.ts` so the API is only queried once on app launch. Standard hooks use `AsyncStorage` instantly (**0 API requests on grid/detail mounts**).
   * **In-Flight Change Protection**: Inside mobile `pullSyncItems()`, we verify that the local watchlist has not changed during the API call. If it did (user bookmarked a title while fetching), we merge the updates and push instead of overwriting.

---

## 3. Remaining Issues to Investigate

### Issue: Mobile is not pulling in remote sync changes at all
* **Symptom**: Even on the **My List tab page**, changes made on the web client are not syncing over to the mobile client automatically.
* **Potential Areas to Check**:
  1. **Sync State / Code check**: Verify if `syncState.code` is properly loaded on mount in `list.tsx`. If it is null/empty, the polling interval exits early.
  2. **Pull Interval Condition**: Verify why `res.updatedAt !== current.updatedAt` might fail to trigger `refresh()`, or if the async `pullSyncItems()` call is throwing unhandled network/parse errors.
  3. **Local Change Protection Side-effects**: Check if `localBeforeStr !== localAfterStr` is triggering false-positives inside `pullSyncItems()`, causing it to continuously bypass the overwrite block and try to push instead.
  4. **Diagnostic Logs**: Run both dev servers and look at the logged output in Metro console (`MOBILE PULLED items`) to see if the requests are resolving and returning the correct server array.

---

## 4. How to Resume & Verify

1. **Start Dev Servers**:
   - Mobile: `npx expo start`
   - Web: Run your local wrangler/dev server.
2. **Check Logs**:
   - Web: Browser Developer Tools (`F12` -> Console). Look for `WEB PUSHING` and `WEB PULLED`.
   - Mobile: Look at the Metro bundler terminal. Look for `MOBILE PUSHING` and `MOBILE PULLED` arrays to trace the index order.
