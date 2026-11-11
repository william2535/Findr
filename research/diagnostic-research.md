# FINDR first-build research

Checked 29 October 2026. This is implementation input, not a validated engineering decision support system.

This file records the original build. The current 0.12.0 expansion and three-choice question flow are documented in [faults-0.12.0/README.md](faults-0.12.0/README.md). New questions offer Yes, No and I don’t know; older tentative saved answers retain their original meaning.

## What Akinator documents

Elokence's own product page describes a knowledge database and an algorithm that chooses questions: https://elokence.com/content/akinator-the-genie (web reference `turn26view2`). Its official FAQ says Limule is an original proprietary algorithm, so no public evidence here establishes that Akinator uses Bayesian inference or a particular decision-tree method: https://fr.frontdev.akinator.com/content/6/Tout-ce-que-vous-avez-toujours-voulu-savoir-sur-Akinator (search reference `turn1search0`). The official mobile listing describes the question-and-guess interaction, https://apps.apple.com/gb/app/akinator/id933135994 (`turn1search4`). The product page contains historical counts/platforms; do not reuse them as current statistics.

A primary observational research paper describes the five response states and continued questions after an incorrect guess: https://www.mdpi.com/2504-2289/7/1/26 (`turn0search0`). Our proposed information-gain method is FINDR's own implementation, not a claim about Akinator's secret algorithm.

## Proposed offline flow

1. Identify equipment visually, then confirm model text/variant. Appearance alone is not definitive.
2. Capture the actual message and choose a symptom family.
3. Start each candidate with equal weight. For each unanswered question calculate expected entropy reduction under current weights and ask the most separating question. This is original implementation design.
4. Yes multiplies a candidate by its editorial likelihood; No by the complement. Probably/Probably not use half-strength evidence. Don't know leaves weights unchanged.
5. Allow undo, answer editing and viewing alternatives. Recompute all scores after edits.
6. Show ranked hypotheses and observations, never calibrated percentages. An all-unknown session must produce an unresolved outcome. Always provide an out-of-scope route, because the candidate list is incomplete and faults can coexist.
7. Link to the selected panel's actual manual and to the explanation's source. They may be different: a general triage example does not establish applicability to every model.

## Knowledge file

`knowledge.json` contains seven symptom groups, 21 candidate hypotheses and 31 observation questions. Numeric values are editorial design weights, not manufacturer data, failure rates, or calibrated diagnostic probabilities. No measurements, disconnections, default access codes, impairment instructions or protection bypass steps are supplied. All prompts can be answered from the normal display, visible surroundings or existing records. The precise source sections used were read through the web retrieval service. No source PDF binaries are included in this research folder.

## Primary technical sources

- Gent Vigilon VIG-MAN-OPS Issue 1 January 1999, printed pp14–17: messages and distinction between faults/disablement. Manufacturer-hosted original PDF; old model scope explicit. Repository record `gent-f03fe5ba8e30`. URL in JSON. Web ref `turn2view2`.
- C-TEC CFP Standard DFU7004010 Rev 4, 1 November 2021, printed pp18–22: supply and system fault categories. Repository record `c-tec-fc443e51b6e1`. Official URL https://c-tec.com/download?wpdmdl=13537 . Refs `turn7view1`, `turn26view1`.
- C-TEC CFP Repeater DFU7003001 Rev 2, printed p13: remote power and network communication fault distinction. Official URL https://c-tec.com/download?wpdmdl=12144 . Ref `turn7view3`. The repo has a similarly named installer-hosted copy but exact bytes/issue equivalence has not been verified, so no automatic record mapping is asserted.
- Kentec Syncro Man-1055 Issue 26 May 2016, printed pp9–11,19,30: configuration mismatch, loop integrity/isolation and supply/earth indications. Repository record `kentec-724b56a14295`. https://kentec.co.uk/wp-content/uploads/2018/08/man-1055.pdf . Refs `turn12view0`, `turn15view0`, `turn13view2`.
- Kentec Syncro Network Man-1058 Issue 06 December 2016, printed pp4,11–12: node loss, network path and addressing/configuration faults. Repository record `kentec-d90c17977bf2`. https://kentec.co.uk/wp-content/uploads/2018/08/man-1058.pdf . Refs `turn15view1`, `turn26view0`.
- Advanced MxPro5 manufacturer product manual (74 pages, software 5000-050-04 onwards), printed pp28–29: loop and monitored output principles. Distributor-hosted primary manual https://www.acornfiresecurity.com/index.php?filename=MxPro5+Product+Manual.pdf&route=extension/module/document/download . Ref `turn7view0`. Do not assume byte or issue equivalence to the repo's older 680-165-05 until compared.
- Hochiki Europe's own ESP communication fault guidance, reviewed 21 October 2026: connection, loop, configuration and water ingress possibilities. https://web.hochikieurope.com/en-gb/knowledge-base/random-communication-faults-on-hochiki-esp-addressable-loops . Refs `turn16search0`, `turn17view0`. Applies to ESP; it is not universal protocol documentation.

Page numbers are printed page numbers. For these inspected PDFs the printed page is also the one-based PDF page. The sources contain procedures beyond this app's read-only scope; those procedures have deliberately not been copied into the questionnaire.

## Validation limits

Schema and mapping checks are structural only. This guide has not been assessed against manufacturer fault trees, real fault cases, firmware variants or operational safety validation. In first-build UI it should be labelled 'guided triage / likely causes'. The reference catalogue can cover more models than the diagnostic knowledge. Do not describe every downloaded manual as converted into a verified diagnostic pack. Expansion should add reviewed model-specific facts and test cases with clear unknown outcomes.
