# FINDR web 0.39.0: quizzes, mocks and Resistor Lab

## Shipped behaviour

- Final navigation entry **Quizzes**: 31 subject quizzes across ten subject groups, with 4–8 questions each and an approximate five-minute estimate. Subject filter, explicit I understand marks, progressive circle, completion tick and separate final understanding confirmation.
- **20 mocks** remains available: nineteen ten-question sets and a final six-question set. Both choices cover all 196 supplied revision points. Higher ding for correct, lower cue for wrong, highlighted correction, explicit Next, full review with all options explained, sources and revision notes.
- First-attempt score, correction completion and self-assessed understanding are separate. Saved runs retain their question/source edition. Older saves lacking understanding fields remain valid. Starting another attempt does not erase a previously confirmed same-edition circle.
- Included **Home → Tool box → Resistor lab**: stock-aware bounded target search, movable series/parallel sandbox, live equivalent resistance, open/short handling and local saving. See the separate tool documentation and research.

## Checks actually completed

- Full Node regression: **1,943 passed, 0 failed, 0 skipped**, approximately 44.37 seconds. Includes 40 focused FESS/bank/resistor tests.
- `pnpm exec tsc --noEmit`, `pnpm build` and `node scripts/verify-public-build.mjs`: successful. Public asset/release exclusions validated; existing signed APK hash preserved.
- Normal mock flow: Chromium 154.0.8037.57 (11 checks) and WebKit 26.0 (8 checks), Linux. Actual bank, normal Home/Tool box entry, generated AudioContext oscillators, wrong/correct distinction, 9/10 first score versus 100% correction completion, all explanations, mute, resume and missed-question retry.
- Understanding flow: ten checks in each browser through the actual final navigation entry, including correction, explicit marks, tick versus confirmation, reload, retained twenty mocks, CCTV filtering, previous green achievement, reduced motion and 320/390/1440 px layouts.
- Isolated FESS controller: eight checks with an explicitly synthetic two-question bank and injected storage failures. Resistor UI: ten checks in each browser plus three injected storage checks. These failure fixtures are not claims of physically filling a phone's storage.

## Offline evidence

Chromium installed and verified the actual final service-worker build **1aa01ca47d9c** (web 0.39.0), then Playwright disabled networking. The browser cold-reloaded, ran and saved a new mock, resumed its next question, reviewed saved explanations, completed a subject quiz and confirmed understanding, then reloaded that green state. The resistor finder performed a real stock search offline; the sandbox calculated 4 Ω parallel with 1 Ω as 0.8 Ω and restored that circuit after reload.

Synthetic existing manual bytes, a Panel Pal conversation and a saved visit were unchanged after the full flow. No model download or AI-provider request was observed. External revision links need a connection; their PDFs were not silently downloaded into the offline pack.

## Limits

No physical iPhone or Android was available. Phone layouts are browser emulation. WebKit's runtime in this environment does not support the needed CacheStorage setup, so its checks deliberately block service workers and establish UI behaviour only. Cold offline verification is Chromium only. Audio checks observe original scheduling and synthesis calls; they do not establish physical speaker audibility, device volume or silent-switch behaviour. WebKit may report the default AudioParam value before future automation begins, so the harness records the actual scheduled parameter value without replacing synthesis.

The questions are FINDR practice based on the supplied guide and checked public references, not an official live question bank or exam-grade prediction. Confirm the enrolled EPA version with the provider. Full paywalled standards were not reproduced. See `content-review.md`, `highfield-research.md` and `current-guides.md`.

The signed Android APK remains **0.37.0 / code27**. This release updates the web/PWA; no APK rebuild or physical-device verification is claimed.

## Reproduction

Serve `public` on localhost4173. Run the Node tests and release build in the usual repository workflow. The normal-browser script takes `FINDR_FESS_BUILD=1aa01ca47d9c`; use `FINDR_FESS_BROWSER=webkit` for the online WebKit run. The section script is `scripts/verify-fess-understanding-browser.mjs`. The browser harnesses use this executor’s Playwright/browser locations; adapt those paths elsewhere. Product code has no dependency on those test-only locations.
