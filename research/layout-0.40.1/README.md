# Home controls and four-column emulator grid —0.40.1

The Toolbox disclosure is left-aligned beside the icon-only view controls in one row. Its expanded content still spans the full available width. Compact emulator cards use four columns at every supported viewport; phone cards shorten the Open label, omit duplicated captions/scope text and stack variant choices with at least44px touch targets. List view and live panel controls are unchanged.

Verified in Chromium154.0.8037.57 and Linux WebKit26.0 at320,390,430,768 and1440px: both Home views, aligned controls, Toolbox expand/collapse and download-pack link, no horizontal overflow, four cards on the first row of each emulator family, at least44px buttons, list view and opening a real emulator route. No page exceptions. Screenshots and structured results are included. Physical iPhone hardware was not available.

The226 existing Home/update/pack and emulator regression tests passed. TypeScript, JavaScript syntax checks and the production build with its integrated public-asset gate passed. These are focused layout checks; no new inference, PDF or diagnostic claims are made.

An initial Chromium harness comparison used the view control position from before scrolling into the disclosure. Comparing both positions after the click resolved that test-coordinate issue; no production change was needed for it.

Publication uses the established source-build path because the native archive uploader timed out twice in the immediately preceding release; local artifacts are retained and the source commit identifies the build. GitHub backup and Pages publication are verified separately in repository provenance.
