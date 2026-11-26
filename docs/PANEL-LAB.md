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

## Offline and scope

Wait for FINDR's app installation to complete while online. The matrix editor, simulation, grading and existing bundled emulator lessons then run without a model download or an online AI service. Saved PDFs remain separate downloads.

The matrix is a learning tool and design draft, not a native panel programming file, an approved fire strategy or a compliance certificate. Real programming still requires the exact model documentation, an authorised specification and commissioning/restoration checks. No configuration or commands are sent to a panel.

Implementation: `public/app/cause-effect-engine.mjs`, `cause-effect-store.mjs`, `panel-lab-practice.mjs`, `panel-lab.mjs`, and `panel-lab.css`. The engine is deterministic; its simulation clock, rules, tests and source mappings are inspectable. It reuses FINDR's existing IndexedDB settings store without a database migration.
