# Tyco MINERVA MX / MX2 source coverage

This emulator's reference is the actual manufacturer **MX Addressable Fire Controllers — Operating Instructions**, Tyco Safety Products **17A-05-O, Issue 5, 11/04**. Page 5 expressly says **Firmware Version 5.0** and includes MINERVA MX1000, MX4000, MX4000M, MX2-100 and MX2-200. The archive filename mentions MX1000, but the document itself establishes the wider scope. It does not establish every later MX firmware revision.

- Existing catalogue record: `facp-ec7a65d3-2379-41c6-987d-b091da8b3e53`.
- [Archived manufacturer PDF](https://docs.facpmanuals.com/manuals/Tyco/mx1000_series-operating-instructions-2004-rev5.pdf).
- 35 PDF pages; printed page numbers agree with PDF positions.
- SHA-256: `36a61c77885611d2e3ecaa5f3cdaead4294d96266780d32f61947368bfec928f`.
- Retrieved and checked on 10 November 2026 using PDF text extraction and rendered figures; these are not a synthetic manufacturer's manual.

## Menu coverage

The source-backed data contains **74 nodes: 16 menus and 58 screens**, seven guided lessons, and source references for the front controls. It includes all nine main-menu entries and the documented subpaths:

- Accept Events; View Status by complete point, input, output and zone, including loop, RBus and Local I/O selectors.
- Isolate/De-Isolate by point, point direction, six zone categories and four group softkeys.
- Set Time/Date and Summer/Winter.
- Event Log view, print and nine-category filter.
- View/Print Data: isolated points, untested/failed points, point values, faults, loop counters, Details and left/right Scan.
- Service: Walk Test and its scope/termination conditions; the documented numbered Maintenance entries; Diagnostics as an explicitly unsupported deeper-menu boundary.
- Configuration: five Change Text categories, save confirmation and conditional Restart; the normal buzzer/LED/display test.

Every node has a plain-language hint and supporting page/section. Lessons cover event history, finding an address/location, isolating/restoring one point, walk test, battery/charger readings, loop side scans and committing a text change. The engine's implemented behavior is verified separately; a data node alone does not prove simulation coverage.

## Explicit limits and source discrepancies

1. **Service → 3 Diagnostics** is drawn on page 25, but its submenus and procedures are absent. It is represented as a reference boundary. A full engineering/service manual for the actual firmware is required before expanding it.
2. **Software Initialisation Count** is described on page 29 with F5 Reset, but its numbered menu selector is not stated. No guessed “5” key is introduced. It remains reference-only.
3. The page 28 Maintenance illustration shows a Total/Print readout instead of a numbered menu. Only selector numbers explicitly stated in the prose are used: 1, 3, 4, 6, 7 and 9.
4. Page 23's View/Print menu omits Loop Point Counters; page 24 explicitly identifies option 5, and page 17 restricts it to Customer Manager 2.
5. Table 1 says the View/Print parent starts at Customer Operator 4, while its View Faults row includes Operator 3. The parent retains the stricter documented Operator 4 entry; the emulator does not invent a lower-level shortcut.
6. The MX2 diagram includes FUNCTION, while the page 9 prose says the DCM800 excludes the SPARE function. No invented action is assigned to that control.
7. The actual page 15 TEST heading is 2.6.4, although the contents lists 2.6.3. References use the actual page heading. Some text-edit paragraphs call the Change Text submenu “Configuration”; the illustrated hierarchy resolves the parent path.
8. This operating manual documents text editing, not adding/deleting devices, full project configuration or all engineering diagnostics. Its title and coverage must not be expanded to imply those procedures.
9. Loop addresses and left/right detection tables do not establish physical cable order or a break location. No address-order topology is invented.
10. Manuals' example voltages, counts and labels are not acceptance limits. Simulator data, credentials and times are explicitly fictional; real access codes are site-configured.

## Panel imagery

`panel-image-provenance.json` records exact source crop rectangles, clockwise rotation, dimensions and asset hashes. The MX figure is rotated upright; the MX2 figure is already upright. Both are manufacturer figure excerpts, not generated photographs. The MX figure retains its source annotation “T2000 ONLY”; that marking must not be interpreted as a universal MX feature.

Rebuild source data and exact images with PyMuPDF and Pillow installed:

```sh
FINDR_MINERVA_PDF=/path/to/the/verified/operating-instructions.pdf python scripts/build-minerva-data.py
```

The script refuses a different PDF hash, so a later manual cannot silently replace historical references. No copyrighted full PDF is bundled by this change; the existing manual archive download remains the source.
