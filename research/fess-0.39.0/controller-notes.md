# Quick-mock controller checks

The new controller uses the existing `findr-device` IndexedDB settings store through `db.mjs`, under the separate `fess-mocks:v1` key. It does not alter manuals, Panel Pals, diagnostic sessions or calculator data.

Each saved run snapshots its question text, options, explanations, revision notes and sources. A later question-bank revision therefore does not rewrite an old review. Correcting a wrong answer increases completion only; the first submitted answer remains in the history and first-attempt score. A repeated click cannot add another attempt or replay a reward. The correct answer must be selected before Next becomes available.

The bank determines the number and size of mocks. The overview initially shows six cards and offers Show more; there is no limit on saved practice runs. All completed questions have an expandable explanation covering every option and the supporting sources. External references need a connection; question content and explanations use the app's offline resources.

A failed save keeps the previous persisted snapshot. The controller shows the pending answer with a visible not-saved warning, blocks further changes, and offers Retry save. Retrying a newly created run opens that run; retrying a sound preference does not navigate. No raw database reset or destructive recovery is used.

Generated Web Audio tones are requested only from answer, completion or explicit sound-test interactions. Rendering, restoring a run and opening review remain silent. Correct answers use a higher two-tone ding; wrong answers use a lower two-tone cue. Mute, leaving, or hiding the page cancel queued or active audio. Visible text and answer markings work when sound is unavailable.

## Checks actually run

- `node --test tests/fess-mocks.test.mjs`: **24 passed**.
- `node research/fess-0.39.0/controller-storage-check.mjs`: **8 passed**, Chromium 154 on Linux, 390px emulated viewport.

The controller check deliberately injects a **synthetic two-question bank**, write failures and a recording audio stub. It establishes UI recovery and scoring behaviour, not the real 196-question content, ordinary navigation integration, audible output, iPhone compatibility, or offline service-worker readiness. Those acceptance checks are performed separately by the release owner.
