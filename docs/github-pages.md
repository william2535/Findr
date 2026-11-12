# FINDR on GitHub Pages

The Pages build serves the existing browser app at `https://william2535.github.io/Findr/app/`. The project homepage redirects there. It retains the manual catalogue, Panel Pals, local AI/PDF/OCR runtime, emulators and hints, menu maps, Toolbox, quizzes, saved logs and offline service worker.

GitHub Pages serves static files. Publisher-manual downloads and explicitly selected online AI use the existing FINDR server at `https://findr-fault-finder.floodyyy21.chatgpt.site`; Pages cannot run those server routes. The current browser and packager accept only this verified API origin, and the server must allow the exact `https://william2535.github.io` origin. An online AI key is still entered by its owner in the app; no key belongs in the Pages files, workflow or repository.

## Reproducible package

Python3's standard library is sufficient:

```sh
python3 scripts/build-github-pages.py
```

The generated `out/github-pages/` contains the complete public browser app, supporting assets and a root redirect. It deliberately excludes APKs, the native-only download map, private source inputs, user PDFs and downloaded model weights. Manuals and optional model packs continue to download through FINDR's existing mechanisms.

The packager replaces `app/deployment-config.mjs` only in its output; the original source keeps its same-origin Sites configuration. It adjusts the PWA identity, canonical/share metadata and update-discovery URL for `/Findr/`, then hashes the final bytes into the existing service-worker manifest. Update discovery remains outside the worker's `/Findr/app/` scope. Its output marker records the source revision, app version and offline build. Source files and the Sites build are not rewritten.

The script refuses symlink/private assets, unsafe destination URLs and overwriting an unowned output directory. Rebuilding from identical inputs produces identical bytes. After changing public source assets, use the project's normal preparation/release checks before publishing either deployment.

## GitHub deployment

`.github/workflows/deploy-pages.yml` runs on pushes to `main` and manual dispatch. It uses pinned official Actions, packages the app, uploads the generated directory and deploys to Pages. Repository Settings → Pages must use **GitHub Actions**. The build has read access to source/Pages metadata; the deploy job has `pages: write` and `id-token: write`. No cloud/provider credential is required to publish these static files.

Publication is only complete after the Pages deployment succeeds and the public URL has been checked. A successful local package does not establish a deployed site. If workflow administration is unavailable to the connected account, a separately verified branch-based Pages deployment can use this same generated artifact without replacing the source branch.

## Saved data and offline use

The GitHub hostname has separate browser storage from the original FINDR site. Existing PDFs, Panel Pals and logs do not automatically move between those origins. Use the app's supported export/import tools for transferable records; prepare the required manuals/resources on the new site before relying on offline use. Do not treat an online AI connection as an offline resource.

Both the app and its update button must stay within the Pages path. The GitHub Pages app should never register an `/app/` worker at the account root or install an update from the original Sites origin. Android release artifacts remain independently versioned.
