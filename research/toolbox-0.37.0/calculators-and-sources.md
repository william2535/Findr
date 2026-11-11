# Tool box calculators — 11 November 2026

`public/app/toolbox-calculators.mjs` supplies four deterministic, offline calculators. It reuses the existing diagnostic calculator's strict quantity parser for A/mA, V and Ah. It does not request a network connection, model inference or a panel/manual match. Raw inputs, units, formulas, assumptions and source references remain in each result. A calculation never completes a field test or confirms a cause.

## Calculation scope

### Fire alarm battery capacity

`Required Ah = factor × (standby A × standby hours + total alarm A × alarm hours)`.

Standby and alarm periods are sequential. The engineer explicitly chooses whether the alarm figure is total current or additional to standby. Minutes convert to hours. Factor 1 means no allowance. User-supplied selected capacity and charger/panel maximum are compared separately; no model-specific limit or standard design period is assumed. Series batteries retain one battery's Ah.

This generic arithmetic does **not** automatically apply manufacturer load multipliers, discharge curves, temperature/ageing adjustments or charging restrictions. Loads must be referred to the battery and adjusted as the applicable manufacturer calculation requires.

Primary source reviewed: [C-TEC XFP 1 or 2 Loop 32 Zone Engineering Manual, DFU2200510 Rev 2](https://c-tec.com/download?wpdmdl=12095), PDF/printed page 35, “Standby battery calculation guide”. That particular panel's example applies a 1.5 multiplier to loop loads and a 1.25 capacity factor. Those values are not defaults for all panels. Its worked example yields 3.18 Ah standby + 0.385 Ah alarm, then ×1.25 = 4.45625 Ah (printed rounded 4.46 Ah). A regression test reproduces it using explicitly pre-adjusted currents. The document is cited as a manufacturer-specific example, not evidence that the generic calculator replaces its full calculation.

### DC cable voltage drop

`Single R = length m × single-conductor Ω/km at 20°C ÷ 1000 × temperature factor`.

`Pair R = 2 × single R`; `drop V = current A × pair R`; `load V = supply V − drop V`.

Only equal copper outgoing/return conductors, one-way entered length and a load at the far end are modelled. A manufacturer Ω/km override is for one conductor, not a loop or a mV/A/m cable-table value. No AC impedance, distributed fire loop, PoE, joint resistance or cable sizing is implied. When the assumed current would consume all or more than the supply voltage, the arithmetic remains visible with a warning that the constant-current assumption is no longer reliable; a negative result is not a physical reverse-voltage prediction.

### Conductor resistance and R1 + R2

Line and protective conductor resistances are calculated separately using their individual areas or manufacturer Ω/km at 20°C. Each uses the entered one-way length. R1 + R2 is their sum and is not doubled again. This radial calculation is not a measured continuity test, Zs, proof of isolation or an installation compliance result. Ring/parallel paths and supply fault-loop impedance are not included.

The two copper calculators use these reviewed primary sources:

* [Eland Cables — copper versus aluminium conductors](https://www.elandcables.com/the-cable-lab/faqs/faq-what-are-the-benefits-of-using-copper-vs-aluminium-conductors): annealed IACS copper has resistivity 1.724 µΩ cm at 20°C, equivalent to **0.01724 Ω mm²/m**. This ideal-material estimate does not establish a manufactured cable's maximum resistance; the actual datasheet override is preferred.
* [Cirris — Temperature Coefficient of Copper](https://cirris.com/temperature-coefficient-of-copper/): near room temperature, `R = Rref × [1 + 0.00393 × (T − Tref)]`. Calculators use Tref = 20°C. Their −50 to 150°C input bounds prevent nonsensical extrapolation but do not assert precision throughout that range or a safe insulation temperature. The UI/result identifies the near-ambient linear approximation. The source's 1.015 Ω at 20°C becomes 1.0548895 Ω at 30°C in a regression test.

### Resistor colour code

Four bands use two significant digits; five/six bands use three. The next band is a multiplier, followed by tolerance. A sixth band gives temperature coefficient in ppm/°C for this marking scheme. Gold/silver multipliers and fractional tolerances are preserved. Colour choices are filtered by role; no leading-black digit, unsupported tolerance/TCR or mismatched band count is silently accepted. Grey/gray are accepted aliases.

Reviewed primary sources:

* [Vishay — Color Code and Standard Resistance Series](https://www.vishay.com/docs/20143/colorcod.pdf), revision 28-Aug-09, PDF page 1: significant digits, multipliers and tolerance values.
* [TE Connectivity — Resistor Color Codes](https://www.te.com/en/products/passive-active-electronic-components/resistors/intersection/resistor-color-codes.html), including its [five/six-band table](https://www.te.com/content/dam/te-com/images/corporate/marketing/global/infographics/resistor-color-code-bands-5-6-1024.png): confirms sixth-band TCR black250, brown100, red50, orange15, yellow25, green20, blue10, violet5 and grey1 ppm/°C; orange/yellow tolerance 3/4%. The table was visually inspected, not inferred from an OCR omission.

Regression examples include TE's 1500 Ω ±5% four-band example, 270 kΩ ±10% five-band example and 68 MΩ ±5%, 250 ppm/°C six-band example. Nominal markings do not establish measured condition, power rating or a panel's required end-of-line value. Unusual/reliability/zero-ohm markings require their datasheet.

## Verification

Executed successfully on this workspace's Node environment:

```
node --test tests/toolbox-calculators.test.mjs tests/diagnostic-calculators.test.mjs
```

28 tests passed: 19 new Tool box cases plus 9 existing diagnostic-calculator cases. Coverage includes sequential/additional alarm currents, 24/72/custom durations, optional capacity limits, actual manufacturer example, return-path counting, separate conductor areas, temperature corrections, resistor roles/precision, zero readings, blanks, malformed units, invalid values, output overflow and independent raw-input retention. Browser/offline/APK checks are recorded separately by the release workflow; this test result alone does not claim device validation or publication.
