# Synthetic field-visit fixtures

All values, sites, identities and timestamps are synthetic and labelled accordingly. They exercise record handling, safe routing and preservation; they are not equipment specifications, licensed standards clauses, approved methods or evidence that a manufacturer profile is verified.

`synthetic-visits.json` supplies legacy, radial, access and raw-result examples used by the field acceptance suite. Additional records assembled in tests use explicit synthetic identifiers and provenance. Manufacturer-specific profile candidates remain disabled until their exact applicability and review are complete.

The acceptance suite names the supplied brief's T01–T36 scenarios. Numeric
manufacturer-profile scenarios test that raw evidence is retained and unreviewed
comparators/actions remain disabled. In particular, the Galaxy and Texecom cases
do not claim a verified live input configuration or enable a resistance band.

`scripts/qa-field-visit.cjs` exercises the new workflow in Chromium at 390 px and
1440 px, including a reduced-height viewport. This is viewport emulation, not a
physical iPhone/Safari or signed Android APK test. Its PDF fixture is the existing
Gent PDF used by `qa-panel-import.cjs`, provided through `FINDR_QA_PDF`; opening
that PDF proves local persistence/readability, not a new manufacturer procedure.
