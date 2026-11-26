# Panel Lab

Open **Panel Lab** from the navigation or the Home card. It works locally and does not connect to a physical panel.

## Build and test a matrix

1. Create a matrix and name its inputs and output groups.
2. Tap the matrix cells to connect causes to effects. Select an output to edit its ANY/ALL condition, delay and latch.
3. Open **Simulate**. Activate inputs and advance the simulation clock to inspect each output's response. Time only advances when you request it.
4. Clear causes, try reset, and isolate or restore simulated outputs. Each result explains the rule that produced it; the event log records the sequence.

An empty group never activates. A delay restarts when its condition clears and later becomes true again. A latched output needs its causes cleared and a reset. Simulated isolation blocks the output but keeps its timer and latch; restoration can activate it immediately. These are the lab's explicit generic rules, not a claim that every manufacturer's panel behaves this way.

Projects and simulation history are stored on the device. Export matrix JSON as a separate backup or use the print view to print/save a draft PDF. Import creates another project and keeps existing matrices. A storage failure is shown on screen; keep the screen open, export your work and retry. Deleting a project does not delete manuals, Panel Pals or fault logs.

## Practise

Seven matrix challenges grade the behaviour you build, with hints and individual test results. Ten panel lessons open the existing CFP, Sigma CP, XFP and TWINFLEXpro² coached emulators. The emulator, rather than opening its link, determines lesson progress.

Manufacturer lessons show the existing reviewed manual editions and PDF page references. A saved manual opens through FINDR's normal reader. If it is not saved, obtain it through the normal manual library before expecting the PDF to work offline. See [practice source coverage](../research/panel-lab-0.41.0/practice-sources.md).

## Protec 6500 loop diagnostics

### Record a site investigation

The **Site investigation** option is a local notebook for actual engineer-entered evidence. It is separate from **Practise** and never generates test readings. Identify the panel, card and loop before reviewing rows; different loops can reuse the same addresses.

Add one or several photos of the loop list, or enter the rows manually. English OCR uses the existing downloaded software on the device. Review every Address and Map value against its original photo before confirming it. OCR confidence is not confirmation. Missing headings or unreadable rows stay available for manual transcription. Check overlapping pages and resolve conflicting addresses explicitly. Confirm inventory completeness separately; a handful of photos does not establish the full loop inventory.

Map values create approximate groups. Define physical sections only from independent site evidence, such as a verified drawing or observed connection points. Record the devices actually polled, those excluded and those unavailable/unknown for each observation. Keep both counter snapshots, any reset, the actual test interval, operating conditions and the source of any optional poll count. Do not derive observed polls from scan time or screen-refresh timing.

Record each introduced impairment and its restoration separately from any functional retest. A handover may retain outstanding work. Corrections must keep the previous evidence and flag affected interpretations for review. Save, reopen and export the job without mixing it with another investigation or with practice results. The export explains whether original photo files travel with it; protect private information before sharing.

FINDR does not provide an unverified live splitting/disconnection procedure. It records what the engineer reports doing under the applicable authorisation, monitoring and safety arrangements. “No additional missed replies in this window” is an observation, not proof that a device, section or whole system is healthy. See the [field evidence scope](../research/loop-field-0.43.0/field-evidence-scope.md).

### Practise with synthetic data

Choose **Practise** within **Loop diagnostics**, or open `#panel-lab/loops`. Pick a mapped, intermittent or incomplete-map exercise. Review its scope and Map groups, then check the independently supplied fictional survey. Consecutive addresses and tied Map values never establish cable order.

Record a whole-loop baseline, then compare virtual section configurations using equal one-hour simulated windows. Each observation is calculated immediately; the app does not pretend to wait an hour or collect actual measurements. Reset synthetic counters when changing configuration. Earlier readings remain in the chronological log. Per-device attempts and missed replies are fictional teaching data; the cited 6500 manual describes a total missed-reply counter.

Hints explain the next useful check. Repeated observations and opposite-section coverage can narrow the synthetic fault to a section. A reduced count, a reset or an unpolled device cannot prove a repair. Incomplete maps and intermittent symptoms can finish as unresolved handovers with their limitations retained.

Record the finding, restore the original virtual configuration, reset counters and take a final whole-loop observation before completing the lesson. Export the evidence log to retain a separate run. Starting another exercise explicitly replaces only the saved loop exercise; it leaves matrices, manuals, Panel Pals and other jobs intact. IndexedDB save errors offer retry and export. An unreadable saved exercise is preserved until explicitly replaced.

Menu references cite Protec **RDM0002/2_4, 11 December 2017**, particularly p10 (Allocate addresses / Map) and pp20–21 (Loop Info / counters). The PDF is a separate library download. A source with different saved bytes opens at page1 with an edition warning instead of assuming the reviewed page. The external X600 mapping-limit reference requires internet access. See the [source audit](../research/protec6500-loop-lab/SOURCE-AUDIT.md); current firmware screens and real physical splitting procedures have not been verified.

Implementation: `public/app/protec-loop-engine.mjs` is a deterministic action-replay engine; `protec-loop-lab.mjs` is its UI. The separate `panel-lab-protec-loop-v1` setting preserves matrix history. No AI model, account or panel connection is needed.

## Offline and scope

Wait for FINDR's app installation to complete while online. The matrix editor, simulation, grading and existing bundled emulator lessons then run without a model download or an online AI service. Saved PDFs remain separate downloads.

The matrix is a learning tool and design draft, not a native panel programming file, an approved fire strategy or a compliance certificate. Real programming still requires the exact model documentation, an authorised specification and commissioning/restoration checks. No configuration or commands are sent to a panel.

Implementation: `public/app/cause-effect-engine.mjs`, `cause-effect-store.mjs`, `panel-lab-practice.mjs`, `panel-lab.mjs`, and `panel-lab.css`. The engine is deterministic; its simulation clock, rules, tests and source mappings are inspectable. It reuses FINDR's existing IndexedDB settings store without a database migration.
