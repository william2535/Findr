# Resistor lab — web 0.39.0

Open **Home → Tool box → Resistor lab**, or choose it from the main Tool box screen. The tool is included in the application; it does not require the optional Tool box pack, a model download, an API key or a connection after the app shell is saved.

## Find a resistance

Enter a target and its unit, then the resistor values and physical quantities available, for example:

```text
1k x 2
2.2k x 4
4.7k x 2
```

Choose a maximum of one, two, three or four resistors per result. The local search explores the series/parallel arrangements of subsets of the actual stock. It never reuses one physical resistor more times than its entered quantity. Results show nominal resistance, percentage difference from the target, resistor count and a parenthesised expression. `+` means series; `∥` means parallel. **Open in sandbox** creates that actual topology with editable elements.

For example, a target of **1.1 kΩ** and two available **2.2 kΩ** resistors finds **2.2 kΩ ∥ 2.2 kΩ = 1.1 kΩ**. A single available 2.2 kΩ resistor cannot produce that two-resistor result.

The search is bounded to **12 available physical pieces and up to four pieces per result** for predictable phone performance. It checks all binary series/parallel topologies within those stated bounds, removes duplicate expressions and shows the best 12 results. It does not claim to find every possible combination with more components, a bridge network or arbitrary interconnections. Progress counts stock subsets actually processed; cancellation stops the calculation and retains the inputs.

The target must be greater than zero. Individual available resistors may be 0 Ω. Inputs accept `470`, `470 Ω`, `2.2k`, `2k2`, `4R7` and `1M`; `M` means mega-ohms. Negative values, mixed electrical quantities and excessive stock are rejected visibly.

## Sandbox

The drawing represents a two-terminal series/parallel tree. Tap a resistor or group in the diagram, or use **Selected element**. Add a resistor, add a series/parallel group, change a value or group type, remove an element, or move it into another group. The **Move** controls work on phones and with a keyboard. The expandable structure also supports dragging a row onto a group on desktop. Large diagrams scroll inside their own viewport without making the page wider.

Built-in examples include:

- Two 2.2 kΩ resistors in parallel: 1.1 kΩ.
- 4 Ω in parallel with 1 Ω: 0.8 Ω.
- 1 kΩ in series with two parallel 2.2 kΩ resistors: 2.1 kΩ.

Moving the 1 kΩ resistor into that parallel group changes the last example to approximately 523.8095 Ω. The value updates from the circuit structure, not a scripted answer.

Use **0** for an ideal short/link, and **open** or **OL** for an open branch. An empty group is also an open circuit: it does not silently become a wire. An open series element interrupts the path; an open parallel branch can leave other branches conducting; a zero-ohm parallel branch bypasses the others. Groups cannot be moved into themselves or their descendants. The sandbox allows up to 48 nodes and eight nested levels.

## Persistence and limits

Inputs, selected tab and sandbox are autosaved using FINDR's existing IndexedDB settings store under `resistor-lab:v1`. This does not alter manuals, Panel Pals, visits or fault readings. Writes are ordered; a failed write leaves the previous stored value intact and displays **Retry save**. Unsaved in-memory edits remain available while the page stays open. Invalid saved records are not overwritten with a fresh default.

Calculations are nominal ideal resistance only. They do not assess resistor tolerance, temperature, voltage rating, power dissipation, a powered circuit or compliance. Equivalent resistance alone does not establish a panel's required EOL wiring profile. The formulas are `Rseries = ΣR` and `1/Rparallel = Σ(1/R)`; open and zero branches are handled separately. A public DigiKey series/parallel reference is linked in the tool; opening that external reference requires a connection.

## Verification

The 12 focused tests in `tests/resistor-lab.test.mjs` cover parsing, formulas, shorts/opens, topology edits, cycle rejection, search counts and stock reuse, mixed combinations, cancellation, saved-state validation and circuit limits.

Reproducible browser and injected-storage checks are in `research/resistor-lab-0.39.0/`. Actual normal-menu UI checks ran in Linux Chromium 154.0.8037.57 and WebKit 26.0 at 320/390 px. These are browser viewport checks, not tests on a physical iPhone or Android device. The parent release verification separately checks the final service-worker cache and network-disabled workflow.
