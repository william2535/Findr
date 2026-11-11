# Panel Pals: multi-task requests and optional offline interpretation

Web release 0.34.0. Android remains 0.14.1. All language inference, retrieval,
PDF processing, saved conversations and diagnostics remain local. There is no
cloud fallback.

## What changed

The former compact-model prompt selected a source label for one question; it did
not provide a conversational task plan. A single missing safety context could
therefore obscure the other parts of a compound request. The compact model is
still available for its existing reference-selection role, but is no longer
presented as having interpreted a multi-task request.

A saved, versioned dialogue record now retains ordered tasks, focused steps,
original requests, corrections and observations. Each task receives its own
scoped retrieval, document-edition checks, manual references and missing-details
assessment. Explicit step-number follow-ups and corrections use existing context
without running a model unnecessarily. A planned action never establishes that
an engineer performed a test or restored a system.

The screenshot request is handled as four requests: disable outputs, disable the
old device, replace it and enable it. Generic outputs require clarification;
generic devices are not silently converted to detectors. Reviewed MxPro5 recipes
cover the documented sounder/input controls. They do not establish the physical
replacement procedure for an unspecified device. See [actual manual evidence](manual-evidence.md).

The same per-task system supports a clearly labelled manual-search fallback.
This deterministic path is not represented as genuine AI inference. Raw local
model output is independently validated against the engineer's request, including
omitted actions, changed targets, negation and invented details. Manual content
remains reference data; model interpretation cannot release unsupported technical
instructions or access another pal's documents.

## Optional larger model

The default remains SmolLM2-360M. Local resources offers an explicit experimental
Qwen3.5-2B Q4_K_M download, followed by a real local loading/generation probe and
activation only after success. Downloads and cancelled attempts retain verified
parts. Failed candidates leave the current selection unchanged. A per-conversation
manual-search choice remains available. Shared files and independent pal/job
scopes are retained.

- Model: **1,280,835,840 bytes**. Bundled main/compatibility runtime: **29,395,450 bytes**.
- Pinned model and runtime hashes, licensing and API details:
  [runtime integration](model-optional-runtime-integration.md).
- Raw semantic benchmark: **3/5 requests understood**. The correction and external
  PSU requests failed. The explicit-context application path handles those cases
  separately; this does not turn the raw failures into model successes.
- Measured CPU generation was approximately **44–87 seconds** for successful
  benchmark requests; the cold offline prototype took **92 seconds** plus model
  loading. Sampled renderer peak was about **2.2 GiB** in the feasibility run.
- This is an optional experiment, not a proven general conversational replacement.
  The hardware probe checks execution and syntax, not understanding or safety.
- No physical iPhone has been tested. A supported browser API does not establish
  that its memory budget can run this model. Manual search remains available.

Full measurements and unsuccessful candidate results are retained in
[model feasibility](wllama-feasibility.md) and the associated raw JSON. A local
mirror supplied real pinned bytes for repeatable executor downloads; its timing
is not an internet download-speed claim. Neither model weights nor downloaded
manufacturer manuals are committed to source.

## Verification

See [browser evidence](browser-README.md) for normal-menu checks, the actual
manufacturer PDFs, processing times, screenshots and the fallback recording.
The initial three UI runs passed 24 checks across Linux Chromium 154 at desktop
and portrait widths, and WPE/WebKit 26 at portrait width. They used the explicitly
labelled manual-search fallback; they are not model-inference evidence.

The real nested-worker prototype passed verified-cache loading, constrained
inference, cold reload with networking disabled and exact-choice inference.
Normal application UI/cold offline model verification and final release checks
are recorded below once completed.

WebKit CacheStorage is defective in this executor independently of FINDR. Its
successful online UI/PDF tests do not prove offline WebKit inference. Simulated
portrait and keyboard layouts do not replace a physical iPhone/PWA test.

### Final source checks

On the frozen application assets (offline build `eff26ef1dcee`):

- `node --test --test-isolation=none tests/*.test.mjs`: **1,687 passed**, no
  failures/skips, 42.3 seconds. A first complete run exposed a new test fixture
  leaking its fake Worker into later indexer tests. The fixture now restores
  every changed global and closes its mock worker; the full rerun passed.
- `node scripts/run-framework.mjs build`: passed.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: passed.
- `node scripts/verify-public-build.mjs`: **1,436 public files** match the source,
  187,092,524 build bytes, all assets under the hosting size limit. Historical
  APKs remain in source and are excluded from this deployment by the established
  release policy. No APK was rebuilt.
- `git diff --check`: passed for the changed source (PDF binary fixtures excluded
  from whitespace checking as in previous releases).

Integration review added regressions for measurement instructions phrased as
“check” or “verify”, external-component follow-up context, and completed-work
claims. The manual-search preference is checked again before inference and fences
in-flight preference saves, so a newly selected reference-only conversation does
not retain a stale AI-enabled snapshot.

### Actual application offline result

The final normal-menu Chromium 154 portrait run passed **12/12 checks**, with no
page errors or failed requests. It used the real pinned 2B model, real saved
MxPro5 PDFs and the app's verified service-worker cache. After networking was
disabled and the page reloaded cold, a fresh compound request used actual local
inference and produced four scoped task answers: **106.40 seconds** end to end
(12.74 seconds loading, 92.69 seconds generation). The online cold run took
107.35 seconds. Saved-context follow-ups/corrections took 0.46/0.56 seconds;
the offline follow-up took 0.97 seconds without rerunning inference.

Actual cancellation, explicit manual-search switching during generation,
preference persistence after reload, retained-question retry without duplicate
messages and switching back to compact while retaining candidate files passed.
The download/probe run and earlier storage failure remain separately recorded.
See [full browser evidence](browser-README.md) and the 235-second
[browser recording](browser-chromium-390-ai-offline.webm).

Following that run, only the optional resource card's timing disclosure changed
to include the measured 106–107-second cold app result. No logic changed. The
final offline build is `b89bc4bf12ef` (1,361 app assets, 125,512,417 bytes).
The 23 resource tests, build and public-byte verification passed again; final
build size is 187,092,597 bytes. Expensive inference was not repeated for this
text-only disclosure change. Physical iPhone, iOS keyboard and offline WebKit
inference remain unverified, as described above.
