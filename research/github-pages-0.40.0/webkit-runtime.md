# WebKit runtime check — GitHub Pages 0.40.0

Environment: Debian13 Linux, Playwright WebKit2227 / browser26.0, 390×844 mobile emulation with additional320px and1440px layout checks. This is not a physical iPhone or installed iOS PWA.

## Runtime preparation

The existing browser bundle was present at `/home/agent/.cache/ms-playwright/webkit-2227`, but three shared libraries were missing. No sudo/package installer was available. Official Debian packages were downloaded over HTTPS and extracted with `dpkg-deb -x` into the user-owned `/workspace/findr-webkit040-runtime/root`. No system packages or application code were changed.

- `libwoff1_1.0.2-2+b2_amd64.deb` (44288bytes)
  - Source: https://deb.debian.org/debian/pool/main/w/woff2/libwoff1_1.0.2-2+b2_amd64.deb
  - SHA256: `628a2a993556027adaa4e93a675fee341e3d47d306db7f3811ff56ea84a42022`
- `libharfbuzz-icu0_10.2.0-1+deb13u1_amd64.deb` (15452bytes)
  - Source: https://deb.debian.org/debian/pool/main/h/harfbuzz/libharfbuzz-icu0_10.2.0-1+deb13u1_amd64.deb
  - SHA256: `0b45d951629e98673c0da73b2bcd0886a467d833bb3b7499892a168f247165d2`
- `libgles2_1.7.0-1+b2_amd64.deb` (17256bytes)
  - Source: https://deb.debian.org/debian/pool/main/libg/libglvnd/libgles2_1.7.0-1+b2_amd64.deb
  - SHA256: `e12c18aa77939d122ee1dea520ba0440b97dc19200b7396e03dff03a3ece74c1`

The wrapper `/workspace/findr-webkit040-runtime/run-webkit.sh` sets the bundled WPE execution/resource paths and adds the extracted library directory to `LD_LIBRARY_PATH`. `libGLESv2.so.2` was loaded dynamically, so the first `ldd` check did not reveal it; a bounded Playwright browser-debug launch identified that missing library. Initial hung browser processes started for this check were stopped before retry.

## Actual command and result

```sh
PAGES_BROWSER=webkit FINDR_WEBKIT=/workspace/findr-webkit040-runtime/run-webkit.sh node scripts/verify-pages040-browser.mjs
```

Log: `/workspace/findr040-pages-webkit.txt`. Structured evidence: `webkit.json`; screenshot: `webkit-failure.png`. The final run exited1; it was not terminated by its90-second guard.

Passed before failure:

- Root redirect into `/Findr/app/`, original banner, Home/grid controls at320/390/1440px.
- Manual packs, emulators, menu maps, Resistor Lab and ten full papers; paper state survives reload.
- Creating a Panel Pal, saving a typed reply and restoring it after reload.
- No incorrect local root `/app/`, `/api/` or `/app-release.json` requests were observed.

The next PDF processing/save exchange failed with `page.evaluate: Error: Device storage is unavailable.` The page-error list also contains `Context is stopped`. The harness calls both actual manual analysis and saving the synthetic PDF; this run does not establish the exact lower-level cause. No application fix or claim of successful WebKit PDF storage is made.

WebKit service workers are explicitly blocked by this test. Therefore this evidence establishes neither WebKit offline readiness nor a successful offline PDF workflow. Chromium has its own separate successful offline evidence. No authenticated AI-provider or local-model inference was tested here.
