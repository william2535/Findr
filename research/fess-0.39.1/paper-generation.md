# FESS full practice papers — 0.39.1

## Format and source check

Checked on 12 November 2026 against the actual downloaded **Highfield FESS EPA Kit v5.0 / ST0189 v1.2**, **PDF page 53**, headed “Assessing the multiple-choice test”. The document states **60 multiple-choice questions in 75 minutes**, with 36/60 pass and 48/60 distinction. FINDR's new papers contain **60 questions with a 60-minute practice timer**, as requested by the user. The shorter practice timer is not presented as the official allowance.

Official kit:
https://assets-eu-01.kc-usercontent.com/c87d3310-963d-0197-1aa9-85c8c23ffbaf/f3f5d1d4-2987-4e72-8151-b32f730765b8/FESS%20-%20EPA%20Kit%20v5.0.pdf#page=53

Official version-specific resources:
https://www.highfieldassessment.com/apprenticeship-standards/construction/fire-emergency-and-security-systems-technician

An apprentice should confirm their enrolled standard and applicable assessment plan with their provider. A new exam date does not automatically move someone to the newest plan. These are unofficial, mixed-subject FINDR practice papers, not copied Highfield papers, an assertion of Highfield's assessment weighting, or a prediction of an EPA grade. No publisher questions or answer keys were copied into this generator.

## Inputs preserved

The generator reuses the reviewed **196-question** bank and the subject membership of the **31 short quizzes**. It adds only `papers` and `paperFormat` to `public/app/data/fess-mocks.json`.

The existing questions, options, answer explanations, source records, 20 mixed mocks, 31 subject quizzes, resource links, and bank version **2026-11-12.1** remain unchanged. Keeping the content version unchanged preserves the identity used by existing progress/understanding records. Existing run state is not read or rewritten by this script.

## Deterministic generation

Implementation: `scripts/generate-fess-papers.mjs`. Uses only Node built-ins and committed data. There is no network request, API charge, language-model invocation, hidden randomness or simulated generation.

1. Validate that the subject quizzes assign each bank question to exactly one subject section.
2. Allocate each paper's 60 places proportionally to section question counts. Use the largest-remainder method: floor each exact allocation, then assign remaining places by descending fractional remainder with a stable section-name tie break.
3. For each paper and section, select the least-used questions first. Break equal-use ties with a seeded pseudorandom value. This limits reuse imbalance within each section to one appearance while varying membership between papers.
4. Shuffle each selected paper's order with a separate seeded stream, so questions are not presented in subject blocks.
5. Validate the complete output before writing. Replacement uses a temporary file and rename, and rejects a source-file change detected during generation.

Seed label: `findr-fess-papers-0.39.1-v1`. String seeds are hashed with FNV-1a and fed to a Mulberry32-style integer generator. Section membership and IDs are sorted with a fixed code-point comparator, so object insertion order and local language settings cannot change the result. Question wording and answer option order are not altered.

| Section | Bank questions | Questions per full paper |
| --- | ---: | ---: |
| Professional skills | 32 | 10 |
| Health, safety & environment | 29 | 9 |
| IT & data | 16 | 5 |
| Electrical principles | 19 | 6 |
| Cabling & installation | 18 | 5 |
| Fire systems | 34 | 10 |
| Intruder systems | 20 | 6 |
| Access control | 9 | 3 |
| CCTV | 7 | 2 |
| Design & handover | 12 | 4 |
| **Total** | **196** | **60** |

The allocation reflects FINDR's current source-bank coverage. It has not been validated as an official EPA blueprint or psychometrically equivalent difficulty across papers. Some reviewed points deliberately cover similar concepts; unique question IDs do not imply every underlying concept is unique. This is a finite practice bank: repetition between papers is unavoidable and is made explicit.

## Measured checks

Executed against source revision `12f286085221fba690cefa6a84c96316d9b6dcd8` with the added files:

- `node scripts/generate-fess-papers.mjs --write` — generated 10 papers.
- `node scripts/generate-fess-papers.mjs --check` — committed output exactly matches deterministic regeneration.
- All ten papers have **60 valid, unique question IDs** and `durationSeconds: 3600`.
- No two papers have identical question sets.
- All **196/196** bank questions appear across the **600 placements**.
- Usage counts: **7 questions appear twice**, **170 appear three times**, **19 appear four times**. No question is omitted.
- Across all **45 paper pairs**, shared question counts range from **0 to 24**, mean **14.0222**. Different question sets should not be confused with independent unseen question banks.
- Every paper meets every section quota above. Within each section, the highest and lowest question reuse counts differ by at most one.
- SHA-256 comparisons of canonical JSON values confirmed **every pre-existing top-level bank field unchanged**; only `papers` and `paperFormat` were added.

Full per-question usage and all 45 pairwise overlaps are emitted by `--summary` or `--check`, allowing the results above to be reproduced without external tools.

## Commands

```sh
# Read-only verification of the committed generated data (default mode)
node scripts/generate-fess-papers.mjs --check

# Read-only proposed-output statistics, including usage and overlap details
node scripts/generate-fess-papers.mjs --summary

# Deliberately regenerate papers after reviewing any bank/section change
node scripts/generate-fess-papers.mjs --write
```

`--bank /absolute/path/to/fess-mocks.json` selects a separate bank for isolated validation. A future change in membership, counts or the seed may change paper contents; review the output rather than silently regenerating historical run snapshots. This document records data-generation verification only. Timer, answer review, browser persistence, offline use and publication checks belong to the accompanying application release verification.
