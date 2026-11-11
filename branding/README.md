# FINDR brand master

The fire-panel face was created for FINDR using the built-in image generation tool on 29 October 2026 at the user’s request. It is an intentional yellow-and-black visual pun on Grindr, with a fire alarm panel cabinet, LCD eyes, flame, buttons and speaker vents. The product wordmark is live text spelling findr; application metadata remains FINDR.

Source: `findr-panel-master.png`. Generated app icons are resized derivatives, with a separately padded maskable version. The share card is composed from the original mark and deterministic text by `scripts/prepare-app.py`.

Generation prompt: Create a bold, minimalist yellow-and-black app icon for FINDR, a UK fire and security engineer’s fault-finding app. Echo Grindr’s mask energy reimagined as a fire alarm control panel: centered black cabinet silhouette, LCD window eyes, a yellow flame emblem, control buttons and a speaker slot. Saturated golden-yellow background; simple vector-like shapes; no words, surrounding mockup or watermark.

## App-wide direction — confirmed 30 October 2026

Keep the intentional Grindr-inspired FINDR joke throughout the product: the existing fire-panel face, a bold lowercase findr wordmark, saturated **#ffcc00 yellow**, charcoal **#111111**, neutral dark cards and strong yellow actions/selection states. Home, identification, downloads, menu maps, emulator selection, lesson coaches and help should feel like the same app. The release page and installed-app shell use the same colours.

The home/release line is **“Find your type. Know your panel.”** with a light **“Fire panels. Intruder keypads. No small talk.”** introduction. Keep practical navigation and technical instructions plain and exact. The joke belongs in the branding and general introduction.

The shared app colour layer is `public/app/findr-theme.css`, loaded after the feature styles. Manufacturer keypad faces, LCDs, physical key colours and red/amber/green safety indications retain their recognition colours. Do not apply brand-wide descendant colour rules inside those faces. The four-item navigation remains Fault finder, Emulators, Menu maps and Downloads.
