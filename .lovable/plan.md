

## Expanding Coverage of Commonly Counterfeited Pills

### Most Commonly Faked Pills (by DEA/CDC seizure data)

The pills most frequently counterfeited with fentanyl or other substances fall into these categories:

**1. Oxycodone 30mg ("M30s" / "Percs")** — #1 most counterfeited pill in the US
- Current coverage: M 30, A 215, ALG 265, K 9, 114 ✅
- **Missing variants:**
  - `V 4812` (Qualitest) — very commonly faked
  - `U24` (Aurolife) — increasingly counterfeited
  - `T 189` (Camber) — common target
  - `RP 30` (Rhodes) — frequently faked
  - `E 8` (Endo/Par) — common fake
  - `54 199` (Roxane) — older variant still faked
  - `WES 303` (Wes Pharma)

**2. Alprazolam 2mg ("Xanax bars")** — #2 most counterfeited
- Current coverage: GG 249, XANAX 2, S 90 3, R 039 ✅
- **Missing variants:**
  - `B 707` (Breckenridge) — "blue bar", heavily faked
  - `Y 21` (Aurobindo) — white bar variant
  - `2090 V` (Qualitest) — white bar
  - `ONAX 2` — foreign brand commonly faked

**3. Adderall 30mg** — increasingly counterfeited
- Current coverage: AD 30, b 974 3 0 ✅
- **Missing variants:**
  - `E 404` (Eon/Sandoz) — orange, commonly faked
  - `NP 12` (Nostrum) — pink 20mg, faked
  - `dp 30` (Teva) — round orange
  - `M. Amphet Salts 30mg` capsule variants

**4. Hydrocodone/APAP ("Norcos")** — frequently faked
- Current coverage: M365, M366, M367, IP 109-112, Watson 853 ✅
- **Missing variants:**
  - `U03` (Aurolife) — white, commonly counterfeited
  - `G 036` (Qualitest) — yellow 10-325
  - `V 3601` (Qualitest) — yellow 10-325

**5. Percocet (Oxycodone/APAP)** — distinct from plain oxycodone, heavily faked
- **Currently MISSING entirely!**
  - `512` (Mallinckrodt) — Percocet 5/325, white round — **extremely common fake**
  - `PERCOCET` (Endo) — brand 5/325
  - `TEC` (various) — Canadian variant
  - `IP 203` (Amneal) — 5/325
  - `IP 204` (Amneal) — 10/325

**6. Fentanyl pressed pills** — counterfeit pills sold AS other drugs
- **Currently MISSING** — should add known fentanyl pill appearances
  - Rainbow fentanyl variants (various colors, often with no legit imprint or copied imprints)

**7. Other high-counterfeit targets:**
- `Dilaudid 8mg` (Hydromorphone) — `M8`, `P 8` — **missing**
- `Soma 350mg` (Carisoprodol) — `DAN 5513`, `SOMA 350` — **missing from muscle_relaxants**
- `Gabapentin 300mg/800mg` — not a controlled substance but increasingly faked
- `Promethazine/Codeine` — liquid but pill forms exist

### Implementation Plan

1. **Add ~60 new entries** to the curated dataset focusing on:
   - All missing oxycodone 30mg manufacturer variants (7 entries)
   - Missing Xanax bar variants (4 entries)
   - Percocet/oxycodone-APAP combinations (8+ entries) — new sub-section
   - Missing Adderall variants (4 entries)
   - Missing hydrocodone variants (3 entries)
   - Hydromorphone/Dilaudid entries (4 entries)
   - Carisoprodol/Soma entries (3 entries)
   - Additional Alprazolam lower-dose faked variants (3 entries)
   - Mark all counterfeit-target pills with `⚠️ HIGH COUNTERFEIT RISK` in notes

2. **Tag entries** — add "HIGH COUNTERFEIT RISK" to notes on all commonly faked pills (both existing and new) so the matching system can surface warnings

3. **Files modified:**
   - `supabase/functions/import-pill-data/index.ts` — expand `CURATED_DATA.opioids`, `benzos`, `stimulants`, add entries to `muscle_relaxants`

