# FINDR 0.27.0 assistant layout checks

Checked 10 November 2026 against the integrated app served locally at
`http://127.0.0.1:8088/app/`, through the normal Quick Questions menu and
its Local resources control.

## Environments and results

- Chromium 154.0.8037.57 on Linux, headless Playwright.
- Playwright WebKit 26.0 on Linux, headless; this is not a physical iPhone.
- Both browsers checked at 390 × 844, 375 × 844, 390 × 500, 768 × 900,
  and 1440 × 900 CSS pixels, with reduced motion enabled.
- No document horizontal overflow or page exceptions. The composer and
  footer fit each viewport. All six navigation entries retained targets
  of at least 44 CSS pixels; the navigation scrolls horizontally on phones.
- At 390 × 500, Quick Questions retained a 164–177 pixel transcript area,
  a 98 pixel composer, and an approximately 70 pixel readiness footer.
  The footer wraps its explicit resource states rather than claiming that
  a saved PDF count establishes readiness.
- The actual resource dialog fits within the 390 pixel viewport. Its PDF/OCR,
  model download and recheck controls retain 44 pixel targets. Model size
  is displayed in decimal MB: 366.6 MB for 366,642,692 bytes.

The screenshots below were captured again after the final resource-dialog
spacing adjustment. They show a fresh browser profile while app resources
are still installing and model weights are absent; they are not evidence
of completed offline setup.

- [Quick Questions / Chromium](quick-questions-chromium-390.png)
- [Local resources / Chromium](local-resources-chromium-390.png)
- [Quick Questions / WebKit](quick-questions-webkit-390.png)
- [Local resources / WebKit](local-resources-webkit-390.png)

## Focused controller checks

`node --test --test-isolation=none tests/terminal-controller.test.mjs tests/diagnostic-chat-controller.test.mjs tests/terminal-flow.test.mjs tests/assistant-resources.test.mjs`

Result at integration handoff: **46 passed, 0 failed**. New coverage checks
independent resource readiness, cancelled/retried downloads, one shared
operation across modes, captured conversation origins, exact QUICK QUESTIONS
navigation, and resource messages that do not misrepresent model downloads
as PDF processing. Syntax and whitespace checks also passed.

Physical iPhone fonts, the native keyboard, PWA safe-area behaviour and
typing animation are not established by these reduced-motion layout checks.
The 390 × 500 check simulates reduced available viewport height; it does not
open an iOS keyboard. PDF processing, actual local inference and offline
workflow verification are recorded separately.

## Animated transcript regression

The demonstration recording exposed queued messages reserving height before
they typed. Following the bottom of that reserved space hid the active line.
Queued terminal rows now collapse until their typing state becomes active;
the full persisted text and the typing engine are unchanged.

`node scripts/verify-terminal027-animation.mjs` passed in both Chromium
154.0.8037.57 and Playwright WebKit 26.0, at 390 × 844 with animation enabled,
through the normal Start, typed upload and equipment confirmation actions.
The script uses fresh persistent browser profiles and a labelled synthetic
text PDF. It verifies zero height for queued rows/options, an onscreen active
typing position after import, tap-to-complete, a tappable 44 pixel active
option, switching to reduced motion, and intact saved transcript/manual data.
The existing nine typewriter unit tests also pass.

Measured checkpoints are saved in
[animation-layout-checks.json](animation-layout-checks.json). This supplements
the reduced-motion screenshots; it still does not establish physical iPhone
keyboard behaviour. Service workers were blocked in this focused regression
to test the current CSS directly; offline updates are covered separately.
