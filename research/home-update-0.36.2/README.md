# FINDR 0.36.2 — Home update and iPhone setup

Home now has an **Update app** button, visible Safari **Add to Home Screen** instructions and a small **by Will Flood** credit beside the existing header wordmark.

The button reads the fresh `/app-release.json` outside the app worker's cache scope, then uses the existing byte-verified service-worker update protocol. The release-page launcher shares the same implementation through its preserved `lib/app-update.mjs` import. Progress comes from real update events. When a new release is verified, **Reload to finish** uses the existing editor/emulator flush path; an active manual download must finish or be stopped before reload. Offline, invalid, stale and failed release checks cannot report a successful update. Android directs users to the APK release page.

The generation script maintains the release JSON alongside the shell/version metadata. No saved-file, conversation, model or manual store is cleared. No animation or brand font changes were made.

## Checks

- Full Node regression suite: **1,835 passed**, zero failed/skipped, 35.44 seconds. This includes the shared updater's existing activation/cache tests, eight new Home release-discovery cases and the previous real-manufacturer-PDF audit.
- `pnpm exec tsc --noEmit`, `pnpm build`, `node scripts/verify-public-build.mjs`, `git diff --check`: passed.
- Chromium **154.0.8037.57**, Linux, **390 × 844** and **1440 × 1000**: five checks passed. Actual metadata/SW verification reported current **0.36.2**, build **6a9d237d8c63**; recorded current-release check took **267 ms** after initial SW installation. Network-disabled cold reload and Update app produced the offline message; saved PDF bytes, log and conversation remained unchanged, and reconnection recovered.
- WPE WebKit **26.0**, Linux, **390 × 844**: two layout/error checks passed. Home content, header credit and Apple instructions were visually inspected.
- Browser update verification used the actual generated manifest and service worker, without mocked progress. It verified the current-release path; newer-release activation/error branches are covered by automated protocol tests, not a claimed production upgrade trial.

No physical iPhone or Apple system installation sheet was available. WebKit offline installation is not claimed because this container lacks working CacheStorage support. Android remains 0.14.1/code 26; no new APK was built.

Repeatable browser harness: `scripts/verify-home0362-browser.mjs`. Browser JSON and screenshots are stored here. The GitHub backup records the final deployment/source provenance after publication.
