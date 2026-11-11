# FINDR 0.25.0 implementation and verification record

Baseline: 0.24.2, b0b2fc07ef531f67508086587ad2b952ed11a600. Existing database `findr-device` v1, manuals/files/settings; retain all stores and old sessions. Existing 58 diagnostic routes, 180 questions, safety gates, append-only field events and restoration logic are reused.

Implementation areas:
- Main Fault Finder: compulsory readable local manual; conversation, identity confirmation, free fault description and condition, questions, readings/corrections, component manuals, outcomes and report/resume.
- Manual processing: pinned same-origin PDF.js and English Tesseract OCR, local analysis cache with content hashes/pages, progress/cancellation/capability and offline readiness.
- Evidence engine: deterministic versioned rules, structured observations, prerequisites, uncertainty, separate cause and restoration; no language model required or loaded.
- Calculators and source checks: explicit context/units, arithmetic separate from model limits; only reviewed exact manufacturer sources enabled.
- Design: app-wide terminal styling, brief skippable animation, accessible navigation, phone layout and transcript scroll retention.
- Verification: existing regressions/build; focused rules/parser/storage; labelled synthetic unseen text/scanned PDFs offline; normal UI on desktop and phone viewport, reports, resumes, interruptions and failure paths.

Release checks: 1,128 regression tests passed (28.3 s), TypeScript passed, production build passed, and 1,341 copied public files verified. Offline shell: 1,294 assets / 82,595,813 bytes / revision 684e4535e8fd. Browser evidence and timings are retained in research/diagnostic-chat-0.25.0/qa-verification.md. Desktop Chromium phone emulation does not establish physical iPhone/Safari compatibility. A successful build is not publication or a signed APK.
