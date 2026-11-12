# Downloadable Tool box packs

FINDR 0.38.0 adds the **On-site essentials 1.0.0** pack. Open Home’s small Tool box control, then **Download tool box pack**, or open `#toolbox/pack`.

The four original calculators stay bundled. This optional pack adds six calculators (DC current/power, two resistors, CCTV storage, camera bandwidth, PoE allocation and DC load totals) and six original picture guides. Its seven downloaded files total **16,473 bytes**. It needs no language model.

## Content and execution boundary

- `toolbox-packs/onsite-v1/` contains the actual downloadable JSON and original SVG artwork. These files are deliberately outside `public/app`, so the application precache does not secretly install the optional pack.
- `public/app/toolbox-pack-manifest.mjs` pins each byte length and SHA-256, plus immutable GitHub commit `d6cfb85034994f73cbbf6b24a8490a9002ed7c62`.
- `public/app/toolbox-pack-store.mjs` fetches only that repository/commit/path, checks every file, and saves actual bytes in the existing `findr-device` IndexedDB settings store, under `toolbox-pack:asset:<sha256>`.
- `public/app/toolbox-pack-calculators.mjs` implements fixed deterministic arithmetic bundled with the app. Downloaded data is never evaluated as JavaScript.
- `public/app/toolbox-pack.mjs` renders escaped JSON fields and pictures as inert image URLs. Each calculator and guide exposes its sources, assumptions and applicability limits.

The source publishers’ artwork and applications are not redistributed. FINDR created the diagrams and calculator implementation. The pack links to Fluke, DigiKey, Axis, Cisco and Omron documentation used to check the underlying concepts. It does not establish panel-specific connections, compliance, lock fail state, or a manufacturer-approved procedure.

## Persistence and recovery

Opening the pack verifies all saved bytes before showing **Ready offline**. Its JSON must also pass the supported schema check. A failed schema check explicitly clears the complete state.

Downloads show observed byte/file progress. Cancellation keeps only already verified and saved files. Resume checks them and fetches missing or corrupt files. Simultaneous download attempts are rejected. Failed/oversized streams are cancelled and readers released. A known shortage from the storage estimate stops downloads before any request; actual write errors remain recoverable if the estimate is unavailable or imprecise.

Removing this pack clears only its content-hash storage keys. It does not remove manuals, Panel Pals, conversations or fault logs. There is currently one pack, so no cross-pack shared-file removal policy is required; add reference counting before shipping multiple independently removable packs sharing these keys.

Sources linked to publisher websites need a connection, but downloaded guides and calculations run from saved bytes offline. The browser can still evict site storage; readiness is rechecked on opening. No cloud inference is used by these tools.

## Publishing another pack version

1. Review equations, limits, source documentation and all original guide assets.
2. Publish only the inert content to the GitHub backup first and verify public bytes and CORS.
3. Pin the actual immutable content commit and the exact bytes/hashes in the application manifest. Never point to mutable `main`.
4. Update the supported pack schema/calculator allowlist deliberately; do not add remote executable expressions.
5. Run the focused tests and normal browser workflow, including fresh download and cold offline reopening after application precache preparation.
6. Release the app and update the complete GitHub source backup through the established release workflow.

## Verification performed during implementation

`node --test tests/toolbox-pack.test.mjs tests/toolbox-calculators.test.mjs`: **36 passed**, including 17 new pack tests and 19 existing calculator tests. New tests cover real content hashes, inert SVGs, actual byte persistence, offline reads, interruption/resume, failed response/retry, corrupt files, low quota, write/read errors, scoped removal, immutable URLs, arithmetic examples and invalid inputs, over-budget results, concurrent requests, cancellation during initial inspection, and oversized-stream cancellation.

This module-level test result does not establish physical iPhone compatibility. Independent browser and final offline-cache checks are recorded with the release evidence separately.
