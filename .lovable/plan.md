

# Expand Generic Manufacturer Variants for Benzos and Opioids

## Current State
- **Opioids**: Good coverage for oxycodone 30mg (10+ manufacturers), decent hydrocodone/APAP coverage, but gaps in other dosages and manufacturers
- **Benzos**: Only ~33 entries. Alprazolam has good 2mg bar coverage but limited lower-dose generics. Diazepam only has Teva. Clonazepam only has Teva + Aurobindo. Lorazepam only has Watson + brand.

## Additions

### Benzodiazepines (~40 new entries)

**Alprazolam** — more manufacturer variants:
- 0.25mg: MYLAN A, 027 R (Actavis), G 3719 (Greenstone)
- 0.5mg: MYLAN A1, 029 R (Actavis), G 3720 (Greenstone), ALG 264
- 1mg: MYLAN A3, 031 R (Actavis), G 3721 (Greenstone), Y 20 (Aurobindo)
- 2mg: G 3722 (Greenstone white bar), MYLAN A4

**Diazepam** — more manufacturers:
- 2mg: MYLAN 271 (white), barr 555 364
- 5mg: MYLAN 345 (green), barr 555 363, WATSON 781
- 10mg: MYLAN 477 (green), barr 555 362, WATSON 790, DAN 5620

**Clonazepam** — more manufacturers:
- 0.5mg: C 14 (Accord), 1/2 KLONOPIN (brand)
- 1mg: C 15 (Accord), 1 KLONOPIN (brand), M C 14 (Mylan)
- 2mg: C 16 (Accord), 2 KLONOPIN (brand), M C 15 (Mylan)

**Lorazepam** — more manufacturers:
- 0.5mg: EP 904 (Rising), 59 (Actavis)
- 1mg: EP 905 (Rising), 57 (Actavis), MYLAN 457
- 2mg: EP 906 (Rising), 59 (Actavis), MYLAN 777

**Midazolam** (new):
- 7.5mg and 15mg tablets

### Opioids (~25 new entries)

**Oxycodone IR** — fill dosage gaps:
- 5mg: RP 5 (Rhodes), 48 12 V (Qualitest), M 05 52 (Mallinckrodt)
- 10mg: RP 10 (Rhodes), 48 11 V (Qualitest)
- 15mg: RP 15 (Rhodes), T 188 (Camber)
- 20mg: RP 20 (Rhodes), T 191 (Camber)

**Hydrocodone/APAP** — more manufacturers:
- 5-325: G 035 (Qualitest), V 3604 (Qualitest white), T 258 (Camber)
- 7.5-325: G 036 (Qualitest), T 259 (Camber), Watson 385 (yellow)
- 10-325: T 260 (Camber), RP 10-325 (Rhodes)

**Tramadol** — more manufacturers:
- 50mg: 319 (Caraco), MYLAN 5050, HH 224

**Morphine** — more manufacturers:
- 15mg: 54 733 already present; add E 15 (Endo), ABG 15 already present
- 30mg: E 30 (Endo), 54 733 already present

**Fentanyl pressed pill warnings** (educational/counterfeit markers):
- Common fake M30 variants with notes about fentanyl contamination

## Changes
Single file edit: `supabase/functions/import-pill-data/index.ts` — append new entries to the `benzos` and `opioids` arrays in `CURATED_DATA`.

