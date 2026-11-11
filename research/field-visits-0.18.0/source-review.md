# Source scope and draft model profiles — 0.18.0

Reviewed 2 November 2026 against the user-supplied **FINDR | Field fault finding and the engineer’s test log**, v1.0. The supplied file contains 58 route cards and 53 research references. Its SHA-256 is `58a04763c1480154fd73af13fb354071685982a49d124c691e91d8e215e5fa1a`.

The brief is a product specification and research pack. Its proposed question order, eligibility rules, event fields, examples and inference labels are FINDR design. A citation to a manufacturer document does not make the entire route a manufacturer-approved procedure. The sample readings and resistance bands in the brief are not enabled runtime limits.

## Fresh primary-source checks

These checks were performed for this change. The remaining research register is retained with supplied-source provenance; it was not all independently downloaded and revalidated.

| Reference | Retrieval and text checked | Result and boundary |
| --- | --- | --- |
| S01 | [Electricity at Work Regulations 1989, regulation 14](https://www.legislation.gov.uk/uksi/1989/635/regulation/14), official HTML, HTTP 200 | The published text requires all three conditions for work on or near a live conductor where danger may arise: making dead unreasonable in the circumstances, live work reasonable in the circumstances, and suitable precautions. This does not grant competence, access, isolation or impairment permission. HTML SHA-256: `1ecdfda0a7bca2c126082d356d431f4e47b903427c6b1ab261429967ba814325`. |
| S02 | [HSE HSG85](https://www.hse.gov.uk/pubns/priced/hsg85.pdf), official PDF, HTTP 200, paragraphs 47–55 | The text distinguishes identification, disconnection from every source, secure isolation and proving dead. Paragraph 53 addresses all supply conductors; paragraph 54 discusses a suitable instrument and does not recommend multimeters or non-contact devices for proving dead on LV systems; paragraph 55 requires testing the instrument before and after use. PDF SHA-256: `dbdc937e41eb4bd516947f90e10f2ff41a98063d43a82faeeeef2ac72da3a3d0`. |
| S03 | [HSE GS38 official publication page](https://www.hse.gov.uk/pubns/books/gs38.htm), HTTP 200 | The page identifies **GS38 (Fourth edition), 2015**. This was a publication-page check, not a fresh reading of the entire GS38 PDF. Page SHA-256: `3d1ed01ec219ebd3d146ecd6ae6db81f44b5e1c4482f28fb405b128b7c6f5e7e`. |

The S01 whole-instrument PDF also returned HTTP 200 (`f63f3f60bef106e8321a0de91934d34e33bbb82f7303d2cd715a3670bef29818`), but local text extraction reported damaged cross-reference/page entries. Regulation 14 was therefore checked from the official HTML above. Successful retrieval alone is not claimed as a full legal-text review. Jurisdiction, premises and applicable editions remain site-specific.

## Candidate profiles shipped as metadata only

`public/app/field-profiles.mjs` contains **13 candidates**, all `status: draft`, `enabled: false`, with no acceptance bands, executable menu sequences or measurement commands. `verifiedByRole` and `verifiedDate` remain null. Caller-supplied fields such as `verifiedProfile`, `exactProfileVerified` or `enabled` cannot enable a candidate.

An `exact` match means the entered identity and required scope fields match that draft record. It does not mean that applicability has received competent review or that an action is available. Manufacturer-only, family-only and unconfirmed imported labels remain family evidence. Conflicting model, document, revision, protocol or configuration values remain visible as conflicts.

| Candidate ID | Scope deliberately kept separate | Existing catalogue evidence |
| --- | --- | --- |
| `ctec-cfp-standard-detector-zone` | Standard detector zone and its capacitor end component | `c-tec-fc443e51b6e1`, DFU7004010. Existing `knowledge.json` source identifies Rev 4 and its limits. |
| `ctec-cfp-standard-sounder-output` | Conventional sounder output and its resistor end component | Same document, a different subsystem. It cannot supply a detector-zone expectation. |
| `ctec-cfp-alarmsense-zone` | AlarmSense two-wire behaviour | `c-tec-9ee63ad9f660`, DFU7002020. Catalogue revision is not recorded. Standard expectations are excluded. |
| `advanced-mxpro5-loop-meter` | Installed panel, loop card, protocol, firmware and the panel’s own displayed fields | `advanced-a18ea5cccf04`, 680-165 edition 05. This is a document-family link, not a claim that edition 05 matches the brief’s mirror or installed hardware. |
| `gent-vigilon-loop-map` | Vigilon variant and card with commissioning document 4188-856 | No exact 4188-856 catalogue record was found. A similarly named operating or installation manual is not substituted. The source URL is retained. |
| `apollo-test-set-soteria-earth-search` | Test set PP2625 issue 4, compatible Soteria devices/isolators and authorised circuit state | No exact PP2625 catalogue record was found. XP95 branding and an arbitrary isolator cannot enable this candidate. |
| `galaxy-dimension-option09` | Installed Dimension/RIO, actual programmed profile and zone override | `honeywell-18a74589d3d1` has the same distributor source URL and a stored file hash. Manual revision still requires review; example readings never identify the profile. |
| `texecom-premier-elite-deol` | DEOL drawing, panel/input hardware and firmware | `texecom-daa42161daf9`; its URL identifies INS176-15. Ideal network totals are not runtime acceptance bands. |
| `texecom-premier-elite-teol` | TEOL and supported fault/mask state arrangement | Kept separate from DEOL, even when the same document family is relevant. |
| `paxton-net2-independent-lock` | Dry contact, actual positive/return switching, independent supply and documented lock mode | `paxton-23df51aba121`, APN-1086. A healthy COM is not assumed to be positive; a dry contact is not a supply. |
| `paxton-net2-rs485-cat5` | Specified CAT5 method on an identified Net2 RS485 bus | `paxton-85eb02998e0f`, APN-1061. Numeric cable bands are withheld. |
| `paxton-net2-rs485-belden` | Specified Belden method, separately identified | Same document ID, separate cable scope. It cannot supply OSDP, Net2Air, Ethernet or intruder-bus expectations. |
| `cctv-model-power-and-poe` | Exact camera/accessories/mode plus actual PSE model/port allocation | Research placeholder. A general Axis power white paper cannot establish a camera-specific maximum or port limit. No exact model match is possible from this placeholder. |

Document IDs in the module are existing FINDR IDs, tested against the current catalogue. They reuse the existing manual download/open path. Catalogue presence or a source URL does not mean that the PDF is already saved on a particular device. Document-family or unknown-edition links are labelled as such.

## Review still required before T2 operation

All numeric interpretation and exact operational actions in the candidates above remain draft. A future reviewed profile needs the applicable model/variant, region, subsystem, input or loop hardware, protocol, firmware/revision, configuration, operating state, exact manual locator and competent reviewer/date. The source-controlled profile must be revised deliberately; entering a checkbox in a visit cannot perform that review. Updating a profile must not rewrite a saved event’s earlier rule/source snapshot.

Safety-critical routes — particularly P02 (mains/proving-dead records), F12/F15 (critical interfaces/hazardous areas), A05/A07 (escape and emergency release), and F13/I11 (remote signalling) — ship only as generic evidence and eligibility routes. They are not certified field procedures. Site emergency and impairment arrangements take precedence. No IS test injection, release actuation, bypass, default code, factory reset or unreviewed numerical threshold is enabled by this registry.

## Focused validation

`node --test tests/field-profiles.test.mjs`: **8 passed**. The tests cover disabled/frozen profiles, spoofed verification flags, family/imported evidence, distinct end components, conflicting manuals, protocol restrictions, separate wiring/cable scopes, camera-limit withholding and real catalogue record IDs. Release-wide regression, UI, build and publication results belong to the release owner’s validation record; this source note does not pre-claim them.
