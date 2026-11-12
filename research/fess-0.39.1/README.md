# FINDR full timed papers — web 0.39.1

## Delivered

**Quizzes → 10 full papers** is a third option alongside the existing 31 subject quizzes and 20 short mocks. Each paper has 60 unique questions selected from the same reviewed 196-question bank. The deterministic selections vary across papers, balance the bank’s subject coverage, and collectively include every question. They are not copied Highfield papers or an official assessment blueprint. See `paper-generation.md`.

The requested one-hour timer starts on Start. Its absolute deadline is saved locally and does not pause on navigation, reload or closure. While the page is open, elapsed time also uses `performance.now()` and a saved last-observed time prevents rollback past a recorded observation. The offline app cannot prove elapsed time if a user changes their device clock while it is closed; it is a practice tool, not a proctored examination system.

Answers can be changed, skipped and revisited until submission or expiry. There is no correct/wrong highlighting, explanation or answer tone before finishing. Early submission asks for confirmation with the unanswered count. The end report distinguishes correct, incorrect and unanswered questions, and gives all 60 explanations with the original sources. Completed attempts cannot be edited. New attempts preserve earlier results.

Highfield’s actual current EPA Kit v5.0 / ST0189 v1.2, PDF page53, specifies **60 questions in75minutes**. FINDR clearly labels its **60-minute** allowance as the user-requested practice setting and asks learners to confirm their enrolled assessment version. No official pass/distinction claim is calculated from this practice score.

## Verification actually completed

- Full regression: **1,960 passed, 0 failed, 0 skipped**, approximately51.70seconds. This includes17 new paper/data tests for boundaries, deterministic membership, all-real-paper scoring, late answers, partial results, old saves and storage failure.
- `pnpm exec tsc --noEmit`, `pnpm build`, and public-build validation passed. The existing APK0.37.0 hash and required release exclusions were retained.
- Chromium154.0.8037.57 and WebKit26.0 on Linux each passed8 grouped checks through the real menus. Each completed a full60-question attempt through UI and scored60/60; a partial attempt scored1/60 with59unanswered. Tests covered changing answers, skip/back/jump, live countdown, fixed deadline after reload, submit/cancel, all60 sourced explanations, new attempt history, reduced motion, and320/390/1440px layouts.
- Both browsers verified expiry on a late click, after leaving the paper, and across reload using an explicitly accelerated `Date.now` test offset. These are boundary/restore tests, **not a real one-hour endurance run**.
- The final Chromium offline run verified service-worker **cb02a06e59e0 /0.39.1**, disabled networking, cold-reloaded, started a paper, answered, navigated, reloaded with the same deadline/cursor, submitted and opened saved explanations. Nine grouped checks passed. No model download or AI-provider request was used.
- Eight isolated controller checks used a labelled synthetic60-question bank, injected read/quota failures, an audio stub and a controlled clock. Failed start retries preserve the same paper/deadline. Pending pre-deadline answers lock at expiry and are saved before finalisation. Failed expiry saves retain previous disk state and show Retry without repeated writes. These are not physical storage-exhaustion tests.
- Existing mock/quiz snapshots stayed byte-for-byte unchanged in the browser tests. The question bank’s previous fields and content version are unchanged, retaining older understanding-circle identity.

## Limits and reproduction

No physical iPhone/Android or real-hour background endurance test was available. WebKit UI tests block service workers because this executor cannot provide its required CacheStorage setup; cold offline verification is Chromium only. External source documents still need a connection; questions, saved results and explanations are included locally. Android remains0.37.0/code27 and was not rebuilt.

Serve `public` on localhost4173, then run `node scripts/verify-fess-papers-browser.mjs`. Use `FINDR_PAPER_BROWSER=webkit` for WebKit. For the verified offline build use `FINDR_PAPER_BUILD=cb02a06e59e0`; it writes separate offline evidence. The isolated script is `research/fess-0.39.1/controller-storage-check.mjs`. Browser paths in these QA scripts are executor-specific and can be adjusted elsewhere; product code does not depend on them.
