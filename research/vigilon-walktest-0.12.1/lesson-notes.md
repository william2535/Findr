# Vigilon walk-test lessons — 0.12.1

Reviewed 30 October 2026. This change adds two complete, learner-operated exercises to [gent-lessons.json](../../public/app/data/gent-lessons.json). It replaces the previous reference-only treatment of the Zone Test route with an explicitly sourced single-zone drill. The selected profile remains the classic full-size EN Vigilon 4/6-loop family with the July 2015 document baseline.

## Added lessons

| Lesson | Starting scenario | Logical steps | Physical key presses | Explicit training/review actions |
|---|---|---:|---:|---:|
| `gent-walk-test` — Run and finish a Vigilon walk test | Normal | 36 | 30 | 6 |
| `gent-end-walk-test` — End a Vigilon walk test | Zone 2 already in Test; input normal | 17 | 15 | 2 |

The library now has **20 lessons and 236 steps**, with its four existing track IDs, 28 help articles and 16 glossary terms retained. Both additions sit in `records`, whose display title is now “Tests, records and final checks”. The original 18 lesson objects are unchanged. Their compact JSON SHA-256 is `7556a0d957ca8698ad0c7929eb3b481471c0b5dfb98fab3d0850b055e9dc1f65`; a regression assertion checks that preservation independently of the engine.

The full lesson checks the starting condition, authenticates for engineering access, switches Zone Test On, closes the menu, activates fictional sensor L1D3, advances the five-second cycle, observes that Test remains selected, restores L1D3, repeats the complete engineering route to switch Test Off, then checks the final normal state. The shorter lesson teaches the full Off route from the existing `zone-test` scenario.

Both lessons and the relevant help articles carry aliases for **walk test**, **walk-test**, **walktest**, **zone test**, **Vigilon** and the common **Vigilion** spelling. The `zone-test-behaviour` and `finish-zone-test` articles link to both exercises and use the manufacturer term **GENT Zone Test** alongside the familiar walk-test wording.

## Documented route

The literal route is:

| Stage | Physical controls | Result |
|---|---|---|
| Open the branch | Menu On/Off → F4 Test/Eng → F4 UserCode | Access-code field |
| Engineering practice access | 3 → 9 → 1 → 7 → keyboard Enter | Engineering Test/Eng menu |
| Reach the test command | F4 `<etc>` → F2 Test → F4 Test | Off / On choices |
| Select the direction | F2 On, or F1 Off | Zone entry field |
| Identify and commit | 2 → F2 Enter | Zone 2 Test On or Off committed |
| Return to status | Menu On/Off | Menu closes; the committed test state remains |

There are **two Test selections**. There is **no extra F1 Zone press** after On/Off. The physical keyboard Enter submits the PIN; F2 Enter commits the Zone form. These distinctions are taught explicitly instead of treating every Enter label as the same button.

The primary route evidence is [4188-856 issue 7, July 2015, printed page 105](https://docs.facpmanuals.com/manuals/Honeywell_Gent/vigilon_and_vigilon_compact-installation-2015.pdf#page=105). Its full engineering menu map supplies the structure and F-key positions. [Page 81](https://docs.facpmanuals.com/manuals/Honeywell_Gent/vigilon_and_vigilon_compact-installation-2015.pdf#page=81) gives the abbreviated prose, default test behaviour and finishing requirements; it is not used alone to invent a key sequence.

The separate manufacturer-origin [Vigilon Plus Basic Commissioning Training slide, PDF page 103](https://docs.facpmanuals.com/manuals/Honeywell_Gent/vigilon_plus_basic_commissioning_training-2017.pdf#page=103) corroborates **Test → Test → On/Off → type zone number/range → Enter**. Its canonical source ID is `gent-vigilon-plus-basic-training-archive`; SHA-256 is `1f1eb22abf19c69e38019524c70ea90424b45285d76218d1e63ae45b8f800dd3`. The presentation is Plus-specific corroboration, not a replacement model profile. The archive filename labels it 2017, but a manufacturer issue date was not verified; its PDF metadata reports creation in 2021 and modification in 2026. The detailed source review is in [README.md](README.md).

The fictional engineering PIN **3917** is separate from the existing customer practice PIN **2468**. Neither is a manufacturer default or live-site credential. PIN steps carry `requiredAccess: 3`, including the Enter step, so recovery advice uses the engineering branch. Commit steps carry the intended Zone entry as recovery metadata. Hints supply the next physical key; the learner performs every press and every commit.

## Timing and restoration policy

Commissioning page 81 describes the default test response: approximately five seconds of alarm sound, then automatic silence and reset. Test mode remains selected, the Test indication remains on and other zones continue normal operation. The lessons do not enable the optional NoReset/NoSilence modes or claim to reproduce every installation’s external outputs.

The full lesson has `manualTestTime: true`. Its explicit training action is `{ "type": "advance-time", "milliseconds": 5000 }`, labelled “Advance 5 seconds”. This pauses automatic zone-test timing during the guided exercise so both states can be inspected. Free practice uses elapsed simulation time; display-test timing is unchanged. The time-advance and detector-input controls are clearly separate from the physical panel keys.

The cycle-completion step checks the actual cycle, fire and sounder states. It does not rely on reusing an old event confirmation. The subsequent observation shows that Test remains on, then an explicit trainer action returns L1D3 to normal before the Off route. This restoration step is a FINDR teaching policy representing removal of the initiating condition, not an invented additional GENT menu command. Normal-state context is also referenced to [4188-1025, July 2015, page 12](https://www.midlandfiresecurity.co.uk/wp-content/uploads/2019/05/gent-honeywell-vigilon-Vig-4-6-loops-Oper_2km-4188-1025.pdf#page=12).

Final conditions require Zone 2 out of test, **zero selected test zones**, L1D3 normal, no active test cycle, no fire, no fault, no disablement, silent sounders, a normal panel state and the status display visible. Closing a menu, silencing the alarms or completing an automatic reset cannot satisfy those conditions by itself. The final review remains an explicit learner action in the controller.

## Validation

The focused command `node --test --test-isolation=none tests/gent-lessons.test.mjs` passed **38 tests**, with zero failures, cancellations or skips. The checks cover:

- Every outcome of all 20 lessons using only the published literal key/action sequence, without automatic happy-path navigation.
- All original lesson objects preserved and all lesson/help/limitation citations resolving to pinned source pages.
- The separate engineering credential, common search aliases and explicit five-second action.
- A wrong engineering PIN repaired through read-only hint advice followed by learner presses.
- Abandoned Zone fields rebuilt before both On and Off commits, including reauthentication, while protection state remains unchanged during navigation.
- Incomplete restoration remaining incomplete after automatic reset, after input restoration alone and before the Off commit.

Controller discovery, final-step acknowledgement, browser layout, free-practice automatic timing, full-suite regression and release packaging are owned by the parent release workflow. These lesson checks do not claim physical-panel validation, complete firmware parity or physical phone/offline validation. Single-zone fixture operation is covered; ranges, external plant, network effects and real cause-and-effect remain outside the lesson’s claim.
