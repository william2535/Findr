# Panel Pal portrait acceptance — 0.34.1

Tested 11 November 2026 against the real source preview at
`http://127.0.0.1:8094/app/`. This is appearance and persistence QA: synthetic
saved pals and conversations are seeded, then the normal application controls,
IndexedDB, SVG rendering, export and file-picker import are exercised. No model
responses, inference, manuals or download progress are simulated or claimed.

| Browser / environment | Viewport | Checks |
| --- | --- | ---: |
| Linux Chromium 154.0.8037.57 | 1440 × 1000 | 12 passed |
| Linux Chromium 154.0.8037.57, touch emulation | 390 × 844 | 12 passed |
| Linux WPE/WebKit 26.0, touch emulation | 390 × 844 | 12 passed |
| Linux Chromium 154.0.8037.57, network disabled after setup | 390 × 844 | 13 passed |

All **49 checks passed**, with zero page errors and zero failed requests in all
four reports. The offline run verified web version `0.34.1`, service-worker
build `4bd51f3aa818`, before disabling networking. It reloaded, selected Newton
and orange, saved, reloaded again and verified the new appearance persisted.

## Coverage

- Eight visible choices: OG, Panel pal, Stephen Hawking, Albert Einstein,
  Isaac Newton, Nikola Tesla, Marie Curie and Ada Lovelace.
- Each choice has actual inline SVG artwork, the correct accessible text and a
  responsive preview. Icons and colours keep at least 44 × 44 CSS-pixel controls.
- Six raw pre-update icon IDs are written directly into IndexedDB to exercise
  the read migration: bolt → Tesla, ghost → Hawking, mug → Einstein,
  cone → Newton, owl → Curie and wizard → Lovelace. Their colours and complete
  saved conversation records remain unchanged. A record without appearance
  receives the OG/yellow default.
- Preview does not save until requested; Cancel restores the saved choice.
  Enter/Space selection, colour changes, save, reload and reversible Reset work.
- The saved Hawking/coral portrait appears in the conversation identity and to
  the left of assistant messages; user messages have no pal avatar.
- Saved conversations, diagnostic context, other pals and unsent drafts stay
  intact when changing appearance. Real export and file-picker import preserve
  the chosen portrait and colour.
- No horizontal overflow; controls remain usable with reduced motion.

The `*-portraits.png` images show the actual picker at each viewport, and
`*-message-avatar.png` shows the saved portrait beside a conversation message.
Other screenshots and the complete JSON evidence are in this directory.

## Release checks

The release owner also verified 33 existing storage/fault/source regression
tests, the framework build and the diff check. The built-public gate validated
1,437 files totalling 187,226,852 bytes, with every static asset within the
hosting size limit. No full LLM rerun was needed or claimed for this
appearance-only change.

## Reproduction and limits

Run `node scripts/verify-panel-pal-portraits0341-browser.mjs` with
`FINDR_CUSTOM_QA_URL` pointing to the source preview. Set
`FINDR_CUSTOM_MOBILE=0` for desktop; `FINDR_CUSTOM_BROWSER=webkit` and
`FINDR_WEBKIT` for the installed WebKit runner. The offline check uses
`FINDR_CUSTOM_OFFLINE=1 FINDR_CUSTOM_BUILD=4bd51f3aa818`.

No physical iPhone was available. WebKit was tested online only because this
executor's WPE CacheStorage does not reliably retain entries; its results do
not claim offline readiness. The Chromium offline result covers these static
portraits and saved appearance controls, not new model-inference behavior.
The existing historical customisation scripts/evidence were left unchanged.
