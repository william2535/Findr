# FINDR 0.27 browser verification environment

The browser checks use the real FINDR page, local PDF/OCR workers and actual
SmolLM2 model inference. The Quick Questions PDFs in
`tests/fixtures/questions027/` are deliberately fictional software fixtures.
They are not manufacturer procedures. The separate PDF regression additionally
uses the real catalogue Advanced MxPro4 PDF when `FINDR_ADVANCED_PDF` is supplied.

## Tested browser environments

- Playwright 1.57.0 at `/opt/codex/cua_node/lib/node_modules/playwright`.
- System Chromium 154, Linux container; desktop and phone-size viewports.
- Official Playwright WebKit 26.0, build 2227, Linux WPE MiniBrowser. This engine
  lacks `ReadableStream.prototype[Symbol.asyncIterator]`, reproducing the failed
  PDF.js text extraction path. `ReadableStream.getReader()` is available.
- The user's iPhone reports iOS 26.5.2. A physical iPhone and its installed PWA
  were not available for these tests. Linux WebKit and viewport emulation do not
  establish real iPhone keyboard, memory-pressure or PWA compatibility.

## WebKit host setup

This container did not include all WebKit shared libraries or an administrative
package installer. Official Debian trixie packages were downloaded with a
user-owned APT configuration and extracted with `dpkg-deb -x` beneath
`/tmp/findr027-webkit-deps/libroot`. No host package database or sandbox setting
was changed. Packages were `libgtk-4-1`, `libgraphene-1.0-0`, `libwoff1`,
`libharfbuzz-icu0`, `libhyphen0`, `libmanette-0.2-0`, `libgles2`,
`libcairo-script-interpreter2`, `libhidapi-hidraw0` and `liblzo2-2`.

The official launcher resets `LD_LIBRARY_PATH`. The test wrapper
`/tmp/findr027-webkit-run.sh` calls the unmodified official WPE MiniBrowser with
these environment variables:

```sh
FINDR_WEBKIT_DIR=/home/agent/.cache/ms-playwright/webkit-2227/minibrowser-wpe
export WEBKIT_EXEC_PATH="$FINDR_WEBKIT_DIR/bin"
export WEBKIT_INJECTED_BUNDLE_PATH="$FINDR_WEBKIT_DIR/lib"
export WEBKIT_INSPECTOR_RESOURCES_PATH="$FINDR_WEBKIT_DIR/share"
export LD_LIBRARY_PATH="/tmp/findr027-webkit-deps/libroot/usr/lib/x86_64-linux-gnu:$FINDR_WEBKIT_DIR/lib:$FINDR_WEBKIT_DIR/sys/lib"
exec "$FINDR_WEBKIT_DIR/bin/MiniBrowser" "$@"
```

Use a **persistent browser context**. In this Linux Playwright package, an
ephemeral WPE or GTK context fails IndexedDB Blob writes with
`UnknownError: Error preparing Blob/File data to be stored in object store`,
even for five bytes. The same code succeeds for five bytes and the 2.25 MB real
PDF with a persistent profile. Strings and typed arrays work in both. This is
an isolated harness limitation; it is not the confirmed iPhone PDF failure and
does not justify migrating users' working Blob records.

## Repeatable normal-menu check

Serve `public` locally at port 8088. After generating the release's complete
service-worker manifest, use a new persistent profile for the initial setup:

```sh
FINDR_QA_BROWSER=webkit \
FINDR_WEBKIT=/tmp/findr027-webkit-run.sh \
FINDR_QA_OFFLINE=1 \
FINDR_QA_PROFILE=/tmp/findr027-questions-webkit-profile \
node scripts/verify-questions027-browser.mjs
```

The first run downloads the pinned model through FINDR's resource control.
`FINDR_QA_MODEL_FILES` optionally routes those pinned public URLs to independently
verified local copies, reducing repeated 367 MB transfers. That option changes
download transport only: real weights, SHA-256 verification, Cache Storage and
inference still run. Reports explicitly identify it. `FINDR_QA_MODEL=0` instead
tests the labelled manual-extract fallback and must not be reported as model
inference. `FINDR_QA_VIDEO_DIR` enables a Playwright recording.

The installed Playwright build does not await asynchronous `waitForFunction`
predicates correctly. The acceptance script explicitly polls awaited
`page.evaluate` calls, so persisted-state assertions cannot pass merely because
an unresolved Promise is truthy.

Measured results and remaining gaps are recorded separately after execution.
