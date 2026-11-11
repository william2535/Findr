# TWINFLEXpro² trainer source audit — FINDR 0.24.0

This trainer binds only to `fike-twinflexpro2`. It uses an eight-zone fictional fixture and the current **TWINFLEXpro² V3.00+** documentation. It does not combine original Twinflex, legacy TWINFLEXpro, repeater, networking or detector protocol behaviour into one engine.

## Checked documents

| Document | Catalogue record | PDF pages | SHA-256 |
| --- | --- | --- | --- |
| Engineering and Commissioning Manual, Doc26-0959 Rev18, October2020, V3.00+ | `fike-6cfbefcbbb78` | 80 | `19a3a00c9300574c53573cbdda4eb98fa240e6a7c633bbd5003fec9b439ef5cd` |
| User Guide, Doc26-1028 Rev5, V3.00+ | `facp-9e607562-03e2-429b-bcc3-b8f7dab17b75` | 32 | `f9142c9807f388c9e4ce65507d8ceb906a4ff609a3c9e98f6181ee981373aaf3` |

Exact source URLs and hashes are in `public/app/data/twinflex.json`. The current installer was downloaded from Fike's `my.fike.com` document system and its cover was visually checked. Its extracted text retains “Issue14 Draft”; that text does not appear on the rendered cover, which says Rev18. The user-guide cover says Rev5; an older extracted footer is retained in the audit rather than treated as a second current edition. Legacy installer `fike-fc894e8e5796` is Issue7, November2011, V1.00+, 70pages: **not** the implemented baseline.

The face uses original source extracts and the existing product photograph, with separate keypad flap and right-hand cover. Physical geometry and artwork audit is recorded separately by the face implementation.

## Transcribed scope

`build-twinflex-data.py` deterministically emits **119 stable menu/status/setting/reference nodes**: 72 have verified navigation/practice routes and 47 are explicit references. All twelve engineer root branches from installer pp33–35 are indexed. Individual settings and references link to pp36–55; delay and confirmation behaviour cites pp56–59. Nine authored service call-outs contain 64 steps and 178 physical-key/training-assist actions. They are clearly FINDR lessons, not manufacturer menu entries.

- Access (installer pp19,23–24,33; user pp11–12): four-digit code accepted on its fourth digit. Normal→User2A/Supervisor2B/Engineer3A; Enable Controls key is distinct from code access. Removing the cover alone does not grant3B. Exposed Write Enable permits3B and changing a protected field is guarded in the engine. Refitting the cover preserves the switch position. Leaving Engineer restores its temporary buzzer. Write Enable outside Engineer gives a System Fault reminder on LEDs/display and drops the simulated fault relay; it does not shut down the zones.
- Configuration (p33): stored versus applied values are separate. ENTER stores a permitted change; Reset System applies it. ESC discards unconfirmed edits. Zone status, mode/type, confirmation, output delays, zone-of-origin override, timer settings, output mode, practice access codes and Engineer re-sound follow this distinction. Code edits validate existing/new/confirm fields. Weekly reminder HHMM and date/time editors validate numeric input. Calendar scheduling is explicitly outside the fixture.
- Supervisor actions (pp28–31) apply operational disablements/test modes immediately. Supervisor menu3 option3 is **Delays**; Engineer menu3 option3 is **Re-Sound Alarm** (pp33,39). The engine enforces the access-specific distinction for numeric as well as cursor navigation. Temporary Engineer buzzer control requires3B and is not saved as durable configuration.
- Zone input disablement (p39) affects all inputs in the selected zone. It does not cut supply or prevent those device sounders responding to another zone. Zone Status OFF (p41) separately switches off the zone supply after reset. There is no addressed-device enrolment or individual device-disable menu.
- Silent/Audible/System zone tests (p37) support01–08 and00 for all zones. A labelled time assist represents the approximate five-second reset. System Test follows the source's stated local sound; the duplicated paragraph does not justify an inferred all-zone output pattern.
- Alarm controls remain four separate red buttons. Silence Alarms and Silence Buzzer are distinct. Reset cannot remove an uncleared input; disablements and tests survive a reset. Events are kept in a fictional bounded500-entry history.
- Output delays (pp43–44,56): smoke may be delayed; MCP bypasses delay; heat bypasses only with CP/SM/HT. CP/DET heat follows smoke. The zone-of-origin INSTANT override applies only to that initiating zone. A nonzero delay setting lights the Delay indicator even if no output is selected as delayed. Dwelling confirmation uses a separate timer, source-described SYSTEM/ZONAL choices and warnings.

## Explicit reference boundaries

Text-name editing is indexed but exact alphanumeric multi-tap behaviour is not fabricated. Electrical output/input tests, external input wiring effects and RDU hardware supervision are references. Fixed PB baud/message rates are read-only. RDU/Peripheral Buss examples repeat choice numbers in the engineer source; this release does not invent missing numeric sequences. The user-guide PB figure differs and remains available for comparison. Panel networking and printer features are marked unavailable as their source says. Imported manuals describe many devices; the trainer never infers that one is physically fitted.

The local fixture does not certify real firmware, output current, cable topology, device compatibility or a fire-system commissioning result. Display examples, post-reset view continuity and explicit training-time actions are labelled illustrative. Fitted external output effects and real calendar expiries are not simulated. FINDR's source/manual actions use the existing saved-PDF and download flow; no new PDF store is introduced.

## Reproducibility and verification

Run `python research/fire-service-0.24.0/build-twinflex-data.py` and `node --test tests/twinflex-*.test.mjs`. The tests replay every authored lesson, every exposed route both as a whole sequence and one freshly computed physical hint at a time, write protection/reset/cancel, disablement versus supply isolation, delayed outputs, confirmation, alarm restoration, storage failure/retry, saved in-progress practice and independent namespaces. Source tests pin document identities, scope, menu completeness and deterministic generation. Browser QA independently replays all nine call-outs using actual rendered controls at390px and1440px and verifies offline preservation; final reports are recorded by the release owner.

Persistence uses only the new `settings` key `twinflex-trainer-v1`; existing panel packs, PDFs, other trainers and Fault Finder sessions are not migrated or rewritten. Failed initial storage reads block mutation, and failed saves retain the last committed record. This audit records implementation/source verification, **not** a claim that a website or signed APK has been published.
