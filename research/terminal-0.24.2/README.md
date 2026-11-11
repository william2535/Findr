# Full-screen terminal — web 0.24.2

The Fault Finder entry is a black viewport with no app navigation, footer, window frame or introductory copy. After a 650ms pause, the requested 20-character phrase appears in 20 discrete steps over 3seconds. A green cursor blinks; Start appears at 3.7seconds and uses the existing new-visit action. Skip intro and Escape reveal the existing tools immediately. Reduced motion disables both typing and cursor animations and shows Start immediately. The technical workflow and saved-data stores are unchanged.

Validation: 1,069 regression tests passed; TypeScript and production build passed. Final public-build verification matched 1,319 files with the established archived-APK/native-index exclusions. Offline revision 8f077ba6ca24 contains 1,273 assets / 72,268,693 bytes. Browser acceptance at 390×844 and 1440×844 checks full-viewport bounds, hidden app chrome, progressive text width, complete phrase, delayed Start, navigation, Skip/Escape, reduced motion and offline entry after service-worker activation. Results and screenshots are adjacent. Chromium viewport emulation is not physical Safari verification.

Web 0.24.2 only; Android APK remains 0.14.1. Publication is verified separately through Sites and live served-file checks.
