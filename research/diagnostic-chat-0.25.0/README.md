# FINDR 0.25.0 — offline diagnostic terminal

This release makes the normal Fault Finder entry a manual-first, on-device diagnostic conversation. It preserves the existing `findr-device` database, PDF identities, panel/device packs, emulators, imported schedules and saved visits. The web version is 0.25.0; the signed Android APK remains 0.14.1.

## What ships

- A consistent terminal appearance across app navigation and tools, with the brief skippable Fault Finder introduction, reduced-motion support, selectable conversation, independent history scrolling and a Newest shortcut. Top navigation remains accessible; the composer, Give up and Fault found controls fit the tested phone layouts.
- Compulsory readable manual selection from saved PDFs, the existing archive download path, or local upload. PDF.js extracts text; pinned Tesseract/English resources perform scanned-page OCR locally. Processing has real progress and cancellation, page references, capability/readiness checks and a versioned content-hash cache. New files can be processed offline after the app resources are installed.
- System and equipment suggestions followed by engineer confirmation/correction. Families and multiple-model manuals require an installed model/variant or explicitly unknown-model observations. Additional component manuals keep the current question and their equipment association. Unreadable pages never supply diagnostic citations; OCR warnings remain in the transcript.
- A deterministic conversational layer over the existing 58 routes / 180 rules for Fire, Access Control, CCTV, Intruder and shared power/cabling. Free text, quick replies, multiple readings, targeted clarification, explicit prerequisites, corrections, emergency precedence and separate restoration records remain inspectable. No local or remote language model is used.
- Five calculators: comparable supply/device voltage, voltage/current/resistance/power, resistor networks, PoE budget and battery runtime estimates. Saved calculations retain raw inputs and version, and are explicitly derived evidence rather than performed measurements.
- Give up/paused and Fault found outcomes, including confirmed cause awaiting parts. Cause confirmation, completed retests and restoration are independent. Short handover, full transcript/findings and structured JSON are reviewed before export. Historical source hashes, revisions and cited excerpts remain with the visit.

## Scope and evidence boundaries

Six actual manufacturer documents were checked; see [source review](calculators-and-source-review.md) and [pinned retrieval evidence](manufacturer-source-checks.json). They supply exact-hash document facts with separate installed-scope checks. The existing thirteen draft operational profiles remain disabled. Matching PDF text does not create an equipment-specific procedure or a universal numerical pass/fail limit. An uploaded manual is untrusted reference material, not executable control logic.

The conversational parser has explicit supported patterns, not unrestricted language understanding. Unclear entries are retained and require targeted clarification; quick replies and structured readings are always available. Model identification remains a suggestion until confirmed. English OCR can misread numbers and does not interpret diagram connectivity; the original PDF page stays accessible. Physical cable order requires traced/drawn evidence, never consecutive addresses.

Full extracted text stays in a separate immutable local analysis cache. Active visits lazily load the exact required analysis and autosave compact manual descriptors plus actual cited excerpts. Cancelled processing, repeated inputs, failed saves and stale asynchronous imports cannot silently replace a usable visit or attach to a different job. A failed editor flush prevents navigation to another editor until the save is resolved; the visible report can still be copied/exported.

## Try it

Open **Fault finder → Start**, upload a manual or choose a saved PDF, confirm the system and installed model, then describe the fault. For an intruder visit, try “The rear-store detector reports an intermittent resistance fault; the expander room is locked.” Record “12 volts” to see the point/reference/condition follow-ups, or use **+ Reading**. Add the detector or PSU manual, select **Give up**, and review the return-visit handover. The labelled synthetic fixtures in `tests/fixtures/diagnostic025` are for automated demonstrations only.

## Validation and remaining compatibility work

The automated browser evidence and measured timings are recorded in [verification](qa-verification.md). Test/build details are recorded in the release worklog. Airplane-mode claims here mean Chromium network-disabled tests, including browser process closure/restart; they do not establish physical iPhone/Safari compatibility. Phone portrait and reduced keyboard-height layouts were exercised in Chromium. Physical iPhone, older Android and very large real-world scanned manuals still need field validation.

A published web release is recorded separately from a successful local build. No new APK is signed or published by this change.
