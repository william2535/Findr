# FINDR web 0.24.1

Checked 10 November 2026 against baseline commit 6d5b5848b0b8df238573d7e75c47f00404a1199c.

The emulator library retains all 15 families, their existing routes and XFP16/32 choices. The layout preference uses a separate local settings key. Wiring thumbnails use only reviewed panelIds/deviceIds and existing local images, with multiple-model labels and explicit missing-photo text. No catalogue links, PDF IDs, trainer engines, diagnostic answers or database schemas are changed.

The personality changes are confined to the browsing/intro copy and presentation. No claim of diagnostic superiority or measured speed versus Google is made. Manufacturer sources and exact model/edition checks remain visible. The independent FINDR identity is retained.

Validation: full regression suite 1,069 passed; type check and production build passed. After the final CSS/card-placement adjustment, 36 relevant wiring and offline-manifest checks passed. Chromium checks at 390×844 and1440×844 cover grid/list persistence, all15 cards, XFP16 opening, exact linked thumbnails, wiring-picture opening, family fronts, immediate Start, complete animated text, reduced motion, offline reload and saved-session retention. See browser.json and screenshots. These are viewport tests, not physical iPhone/Safari certification.

Final offline revision: 829912cd0996, 1,273 assets / 72,267,551 bytes. Existing saved PDFs retain their store and identities. No new APK is produced. Build success is separate from publication; Sites deployment and live served-file checks are required before reporting publication.
