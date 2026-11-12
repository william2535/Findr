# FINDR FESS revision research

Checked 12 November 2026. This is an unofficial practice resource, not a Highfield paper, endorsement, qualification award or prediction of an EPA result. The supplied revision guide is used to identify the user's 196 revision points; its complete PDF and author information are not redistributed. FINDR's multiple-choice wording and explanations are newly written, with corrections where the supplied notes are oversimplified or outdated.

## Official Highfield resources

Canonical official page: https://www.highfieldassessment.com/apprenticeship-standards/construction/fire-emergency-and-security-systems-technician . This page offers separate version 1.0, 1.1 and 1.2 resources, including free mock papers and answer keys. It was located through Highfield's official sitemap; guessed alternative paths sometimes returned a soft 404 despite an HTTP 200 response.

- Current EPA kit: **FESS EPA Kit v5.0 / ST0189 v1.2**, https://assets-eu-01.kc-usercontent.com/c87d3310-963d-0197-1aa9-85c8c23ffbaf/f3f5d1d4-2987-4e72-8151-b32f730765b8/FESS%20-%20EPA%20Kit%20v5.0.pdf . PDF page 53 describes the knowledge-test format; pages 11–20, 54, 62 and 68 describe knowledge, skills and assessment criteria.
- Free sample paper **M-EPA-FESST3002**, dated **20 May 2025**: https://assets-eu-01.kc-usercontent.com/c87d3310-963d-0197-1aa9-85c8c23ffbaf/72b7b1d2-5b85-4ad6-a201-9964c6acd7ad/M-EPA-FESST3002.pdf . The official mock remains at its publisher; FINDR does not reproduce the paper.
- Matching answer key: https://assets-eu-01.kc-usercontent.com/c87d3310-963d-0197-1aa9-85c8c23ffbaf/067d5564-2af2-4eca-a0cb-17c9f14c35ef/M-EPA-FESST3002%20ANS.pdf .
- Official online mocks: https://mocks.highfieldworks.com/epa .
- Version 1.2 fact sheet: https://assets-eu-01.kc-usercontent.com/c87d3310-963d-0197-1aa9-85c8c23ffbaf/6aeb784c-a5db-4c2a-99b3-7d69c4d0927b/L3%20Fire%2C%20Emergency%20and%20Security%20Systems%20Technician%20v1.2%20Fact%20Sheet.pdf .

The fetched v1.1/v1.2 sample and v5.0 kit state **60 questions, 75 minutes, 36 correct for a pass, 48 for distinction**. The uploaded January 2024 guide states **90 minutes, 40 for pass and 50 for distinction**, reflecting older material. Do not apply the newer format to every learner indiscriminately: the provider must confirm the enrolled standard/version and applicable assessment plan.

## Correct standard and version dates

Fire, Emergency and Security Systems Technician is **ST0189**, not ST0310. Current official standard: https://skillsengland.education.gov.uk/apprenticeships/st0189-v1-2 . The published start-date history is v1.0 from 19 August 2016 through 29 February 2024; v1.1 from 1 March 2024 through 7 December 2025; v1.2 from 8 December 2025 onward. The v1.2 change is labelled Updated SSA. A later exam date does not alone change an apprentice's enrolled version.

## Technical verification and cautions

Highfield's kit establishes assessment scope, but it is not a replacement for technical standards, manufacturer instructions or legislation. Even the fetched kit contains apparent mistakes: the page 13 statement that a continuity test assesses battery life is not a sound technical definition. It was not used as an answer authority. Conceptual and numerical explanations were checked against HSE, official legislation, ICO, manufacturer guidance and other identified technical sources.

Important corrections within source points 1–49:

- Communication preferences must be checked with the person. Hearing loss does not establish that someone lip-reads or does not need an interpreter. Email need not be informal.
- **ACOP** means **Approved Code of Practice** and has a special legal status; an internal company code is different.
- The **85 dB(A)** upper noise action value concerns daily/weekly personal exposure. It is not a blanket rule that any instantaneous 85 dB reading requires a VAD.
- Modern CCTV and access-control families are **BS EN 62676** and **BS EN 60839-11** respectively. Select the applicable part and edition; obsolete shorthand is not a complete specification.
- The current Hochiki guide to **BS 5839-1:2025** supports a wall VAD minimum mounting height of **2.1 m** in its relevant example/guidance. A W-2.4-x coverage classification is a different quantity, not a universal replacement for that minimum. Manual call-point guidance gives **1.4 m, +200/−300 mm**, not a symmetrical ±300 mm tolerance.
- Panel supply fuses, standby durations and alarm transmission timings require the actual product/system/category specification. A generic 3 A, 12/60-hour or historical signalling timeout is not universally valid.
- The RCD question distinguishes residual-current imbalance from overcurrent; not every RCD is rated 30 mA.
- LSF wording does not establish zero-halogen construction or fire-resisting circuit integrity.
- Holding force is retained as a supplied-rating calculation: 600 lbf × 4.448 N/lbf is about **2.67 kN**. It is not a guarantee of an installed door's performance.
- RS-485 reach depends on data rate, cable, topology, termination and loading. TI documents examples rather than a universal maximum applicable to any installation.
- The waste record question is explicitly for an **England non-hazardous waste transfer note**, retained for **two years**. This is not a claim that all WEEE or hazardous-waste records share one retention period.

Current public fire guidance used: Hochiki's BS 5839-1:2025 pocket guide, https://assets.hochikiglobal.com/assetbank-hochikieurope/assetfile/16136.pdf . PDF page 3 covers categories, page 10 wall VAD positioning, page 11 manual call points. It is guidance, not the full British Standard. The broader resource review and remaining 147 questions are authored in companion research/slices.

## Prepared data and review

`fess-bank-001-049.json` preserves a mapping from each original revision-point number and PDF page to a revised four-option question. Every option has its own explanation; each question has an overall rationale, source IDs and a revision note where needed. Correct answer positions vary. Source URLs and exact sections/pages are recorded in the data. Downloaded research copies remain temporary reference material; the app ships the question data and links, not entire publisher documents.

Correcting an answer until the set is complete is a learning flow. Its final 100% completion must remain visibly distinct from the first-attempt score; it is not an EPA grade.
