# Synthetic panel schedule fixtures

These files are invented, anonymised test schedules, not manufacturer-native exports. They contain fictional UK site locations and illustrate generic comma-separated CSV and tab-delimited TSV only. Real catalogue part `S4-720-ST-VO` is used to exercise existing catalogue linkage; its presence in a fixture does not claim a real installed device.

- `synthetic-addressable.csv`: two panels, two loops repeating address 37, node and sub-address duplicates, exact part number and generic optical detector, quoted commas/newlines/quotes, blank cells, leading zeros and an explicit export date.
- `synthetic-addressable.tsv`: equivalent mapped field vocabulary with tab separators.
- `synthetic-malformed.csv`: deliberately unfinished quote for rejected reimport testing.
