# FINDR downloadable Tool box pack: research and implementation guidance

Verified 12 November 2026. Read-only source inspection at `/workspace/sites/findr-sources`; no existing application files changed by this research task.

## Findings and shortlist

The existing app already includes battery Ah, DC cable voltage drop, 4/5/6-band resistor colour decoding, and conductor R1 + R2. Keep these. The most useful first downloadable expansion is six small, deterministic calculators and six original visual cards, rather than a collection of external websites which will fail offline.

Best comparators actually inspected: **DigiKey conversion calculators** for concise explicit units and result formulas; **Axis Site Designer** for CCTV storage/bandwidth/PoE planning; **Fluke** for clear measurement illustrations and recording context; **Omron** for relay concepts. These are reference sources, not permission to redistribute their software or artwork.

### Six additional calculators

1. **DC Ohm's law and power**: given V and positive R, I=V/R; P=VI=V²/R. Use DC resistive arithmetic, not AC apparent power or a mains testing instruction. Source [S1,S2]. Example 24 V / 120 Ω = 0.2 A and 4.8 W.
2. **Two resistors: series / parallel**: series R=R1+R2; parallel R=R1×R2/(R1+R2). Require positive finite resistances or deliberately implement a documented short-circuit branch. Source [S3]. Example 2.2 kΩ and 4.7 kΩ = 6.9 kΩ series, 1498.5507246 Ω parallel. Does not select an alarm EOL scheme or prove compatibility.
3. **CCTV storage demand**: use actual entered average encoded bitrate; total Mbps=N×Mbps/camera; decimal GB=total Mbps×3600×recording hours/day×days÷8000. Example four cameras at 4 Mbps, 24 h/day, 7 days =1209.6 GB. Distinguish decimal GB/TB from binary GiB/TiB; allowance/RAID/formatting/audio are additional, not automatic. Average scene-dependent bitrate is not a guaranteed maximum. [S4] supports the inputs/limits; equation is dimensional arithmetic (bits÷8), not a proprietary Axis algorithm. No pixel-count→bitrate guess.
4. **Stream bandwidth budget**: sum the streams actually crossing the link; homogeneous shortcut N×Mbps×streams/camera. Headroom = specified usable link budget − sum. Label as payload estimate: protocol overhead, bursts, multicast routing, substreams and concurrent viewers can change it. Not proof that a nominal link/recorder sustains that load. [S4].
5. **PoE allocation budget**: N×maximum switch-side allocation watts/device; compare separately with total switch PoE budget and per-port budget. Require PSE-side values, never silently compare camera PD consumption with switch allocation. Keep device type/negotiation/standard and cable losses out of unsupported automatic conclusions. Negative headroom means arithmetic budget exceeded; positive headroom is not a compatibility guarantee. [S4,S5].
6. **DC load total**: count×individual mA; A=mA/1000; W=V×A. Use maximum/condition-appropriate documented current, and explicitly distinguish startup/heater/IR/inrush if applicable. Avoid a battery runtime predictor implying real-world discharge guarantees. [S1,S2].

### Six original quick picture guides

- **Ohm triangle** alongside V=IR and P=VI; show units. Original vector artwork; arithmetic reference only. [S1,S2]
- **Relay states**: coil de-energised / energised and COM–NC / COM–NO schematic. Restrict to a conventional non-latching changeover relay. 'Normal' means coil de-energised, not necessarily the panel's healthy state. A relay click does not establish lock drive voltage or door release. No manufacturer terminal numbers, bypass circuits, or escape-door wiring prescription. [S6]
- **DC reading locations**: PSU output +/- and connected load +/- as two different readings, with fields for load state, condition and time. Use appropriate DC V range and COM/V sockets; conceptual low-voltage measurement recording aid. Do not imply touching mains or resistance testing a live circuit. [S7]
- **Camera network path**: camera → PoE switch → uplink → recorder, marking shared power and links as investigation points. A diagram explains architecture, not proof a component failed. Do not promise network reachability from power-budget arithmetic. [S4,S5]
- **Battery series concept**: two equal 12 V batteries in series give 24 V at the same Ah, not double Ah. This is a concept card, not authorisation to reconfigure a panel battery bank. Use exact panel/charger instructions and matched supported batteries. [S8, PDF position18 / printed15]
- **Resistor band roles**: 4-band =2 digits/multiplier/tolerance; 5-band =3 digits/multiplier/tolerance; sixth supported band =tempco. Keep existing verified palette and explain orientation/unclear markings. Does not establish wattage or EOL suitability. [S9, existing toolbox-calculators.mjs references]

## Sources verified through direct HTTP fetch

[S1] Fluke, What is Ohm's Law? HTTP200. Explicit I=V/R, R=V/I, V=IR.
https://www.fluke.com/en-gb/learn/blog/electrical/what-is-ohms-law

[S2] DigiKey, Ohm's Law Calculator. HTTP200. Explicit P=VI; calculate V/I/R/P from known values.
https://www.digikey.co.uk/en/resources/conversion-calculators/conversion-calculator-ohms

[S3] DigiKey, Parallel and Series Resistor Calculator. HTTP200. Series/parallel resistor calculator; formulas displayed as artwork. Generic mathematical relationships independently checked with examples above.
https://www.digikey.co.uk/en/resources/conversion-calculators/conversion-calculator-parallel-and-series-resistor

[S4] Axis, AXIS Site Designer user manual, HTTP200. Sections 'Bandwidth, recording and storage', 'Bandwidth estimates', 'Recording and storage', 'Recording considerations'. Records that estimates depend on camera/scene/settings, storage depends on RAID, and decimal TB differs from TiB. 'Power' explicitly concerns PoE device requirements. No evidence here for an exact storage guarantee.
https://help.axis.com/en-us/axis-site-designer
Product/comparator landing page, HTTP200:
https://www.axis.com/support/tools/axis-site-designer

[S5] Cisco, What is Power over Ethernet? HTTP200 (old path redirected to this canonical path). Distinguishes standards and minimum device-side power after cable loss. Do not bake all generic standards into a simplistic safety pass.
https://www.cisco.com/site/us/en/learn/topics/networking/what-is-power-over-ethernet.html

[S6] Omron, Fundamentals of Relays / What is an Electrical Relay?, HTTP200. Coil/contacts, physical separation, mechanical operation. Relay glossary HTTP200: Contact form defines FormA make, FormB break, FormC transfer; latching is a distinct operating mode. Diagram author must visually check both contact states; don't copy manufacturer figures.
https://components.omron.com/us-en/products/basic-knowledge/relays/basics
https://components.omron.com/us-en/products/basic-knowledge/relays/glossary

[S7] Fluke, How to Measure DC Voltage with a Digital Multimeter, HTTP200. COM and VΩ sockets, DC voltage mode, negative/positive reference points and polarity.
https://www.fluke.com/en-gb/learn/blog/digital-multimeters/how-to-measure-dc-voltage-with-a-digital-multimeter

[S8] Victron Energy, Wiring Unlimited, HTTP200; actual PDF locally text-extracted. PDF position18 / printed page15 explicitly says series increases voltage, parallel increases capacity. Do not redistribute the 29 MB PDF as part of this pack; link its source and author original concept illustration.
https://www.victronenergy.com/upload/documents/Wiring-Unlimited-EN.pdf

[S9] Existing FINDR verified sources retained: Vishay Color Code and Standard Resistance Series, PDF page1; TE Resistor Color Codes for sixth band. This task did not newly reverify the prior app's full colour-table test suite.
https://www.vishay.com/docs/20143/colorcod.pdf
https://www.te.com/en/products/passive-active-electronic-components/resistors/intersection/resistor-color-codes.html

## GitHub and licensing

The user asks for downloads from their repository. Publish **FINDR-authored pack data and SVG diagrams** in william2535/Findr under the project licence, with source URLs and version manifest. No need to download and execute arbitrary third-party JavaScript. Formula facts can be implemented independently; diagrams should be newly drawn. No redistribution licence was established for vendor page artwork/calculators, so do not copy them.

A future optional IPv4 calculator can consider whitequark/ipaddr.js: real README and LICENSE fetched from raw.githubusercontent.com, MIT licence verified. It is a parsing library, not a reason to ship a large frontend or imitate a calculator. Not needed for this six-tool pack. RFC4632 HTTP200 provides CIDR background. No third-party code was copied in this task.

## Download behaviour / scope

Use a small versioned, hash-checked manifest and actual byte downloads from an immutable GitHub commit; show real bytes/progress. Prefer data + original static SVG assets consumed by bundled reviewed code rather than remote executable code. Partial/cancelled/quota-failed packs must remain incomplete; verify every selected asset before 'Saved offline'. Retry can reuse verified files. Shared existing calculators remain available if optional pack installation fails. Open cached picture cards locally, without a network call. Put sources/assumptions inside each card. This research does not claim implementation, offline validation, or a physical-device test.
