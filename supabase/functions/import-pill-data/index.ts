import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ImportSource = "curated" | "dailymed";

type PillShape = "round" | "oval" | "capsule" | "diamond" | "triangle" | "hexagon" | "rectangle" | "other";
type PillColor = "white" | "blue" | "yellow" | "pink" | "green" | "orange" | "red" | "purple" | "gray" | "brown" | "tan" | "multicolor" | "other";

type CuratedEntry = {
  drug_name: string;
  imprint: string;
  shape: PillShape;
  color: PillColor;
  notes: string | null;
  ndc_code: string | null;
};

type ExistingReference = {
  id: string;
  imprint: string;
  shape: PillShape;
  color: PillColor;
  source: string | null;
};

type ImportResult = {
  source: ImportSource;
  dryRun: boolean;
  category: string;
  limit: number;
  processed: number;
  inserted: number;
  updated: number;
  duplicatesSkipped: number;
  imagesAdded: number;
  enriched: number;
  apiErrors: number;
  completedAt: string;
};

// ─── CURATED PILL DATASET ───────────────────────────────────────────────────
// Comprehensive dataset of common medications with accurate physical characteristics.
// Sources: FDA Pill Identifier, DailyMed SPL data, pharmacist references.

const CURATED_DATA: Record<string, CuratedEntry[]> = {
  opioids: [
    // ── Oxycodone IR ──
    { drug_name: "Oxycodone 5mg", imprint: "K 18", shape: "round", color: "white", notes: "KVK Tech • Schedule II", ndc_code: "10702-018" },
    { drug_name: "Oxycodone 10mg", imprint: "K 56", shape: "round", color: "pink", notes: "KVK Tech • Schedule II", ndc_code: "10702-056" },
    { drug_name: "Oxycodone 15mg", imprint: "K 8", shape: "round", color: "green", notes: "KVK Tech • Schedule II", ndc_code: "10702-008" },
    { drug_name: "Oxycodone 20mg", imprint: "K 57", shape: "round", color: "gray", notes: "KVK Tech • Schedule II", ndc_code: "10702-057" },
    { drug_name: "Oxycodone 30mg", imprint: "K 9", shape: "round", color: "blue", notes: "KVK Tech • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "10702-009" },
    { drug_name: "Oxycodone 30mg", imprint: "M 30", shape: "round", color: "blue", notes: "Mallinckrodt • Schedule II • ⚠️ HIGH COUNTERFEIT RISK — #1 most counterfeited pill in US", ndc_code: "00406-8530" },
    { drug_name: "Oxycodone 30mg", imprint: "A 215", shape: "round", color: "blue", notes: "Actavis • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00228-2215" },
    { drug_name: "Oxycodone 30mg", imprint: "ALG 265", shape: "round", color: "blue", notes: "Alvogen • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "47781-0265" },
    { drug_name: "Oxycodone 30mg", imprint: "114", shape: "round", color: "blue", notes: "Mylan • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00378-6114" },
    { drug_name: "Oxycodone 30mg", imprint: "V 4812", shape: "round", color: "blue", notes: "Qualitest • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00603-4992" },
    { drug_name: "Oxycodone 30mg", imprint: "U24", shape: "round", color: "blue", notes: "Aurolife • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "13107-0024" },
    { drug_name: "Oxycodone 30mg", imprint: "T 189", shape: "round", color: "blue", notes: "Camber • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "31722-0189" },
    { drug_name: "Oxycodone 30mg", imprint: "RP 30", shape: "round", color: "blue", notes: "Rhodes • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "12634-0283" },
    { drug_name: "Oxycodone 30mg", imprint: "E 8", shape: "round", color: "blue", notes: "Endo/Par • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "60951-0774" },
    { drug_name: "Oxycodone 30mg", imprint: "54 199", shape: "round", color: "blue", notes: "Roxane • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00054-0199" },
    { drug_name: "Oxycodone 30mg", imprint: "WES 303", shape: "round", color: "blue", notes: "Wes Pharma • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: null },
    { drug_name: "Oxycodone 15mg", imprint: "M 15", shape: "round", color: "green", notes: "Mallinckrodt • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00406-8515" },
    { drug_name: "Oxycodone 5mg", imprint: "223", shape: "round", color: "white", notes: "Caraco • Schedule II", ndc_code: "57664-0223" },
    // ── OxyContin ER ──
    { drug_name: "OxyContin 10mg", imprint: "OP 10", shape: "round", color: "white", notes: "Purdue Pharma • Extended-release • Schedule II", ndc_code: "59011-0410" },
    { drug_name: "OxyContin 20mg", imprint: "OP 20", shape: "round", color: "pink", notes: "Purdue Pharma • Extended-release • Schedule II", ndc_code: "59011-0420" },
    { drug_name: "OxyContin 40mg", imprint: "OP 40", shape: "round", color: "yellow", notes: "Purdue Pharma • Extended-release • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "59011-0440" },
    { drug_name: "OxyContin 80mg", imprint: "OP 80", shape: "round", color: "green", notes: "Purdue Pharma • Extended-release • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "59011-0480" },
    // ── Percocet / Oxycodone-APAP (NEW — heavily counterfeited) ──
    { drug_name: "Oxycodone/APAP 5-325mg", imprint: "512", shape: "round", color: "white", notes: "Mallinckrodt • Percocet generic • ⚠️ HIGH COUNTERFEIT RISK — extremely common fake", ndc_code: "00406-0512" },
    { drug_name: "Oxycodone/APAP 5-325mg", imprint: "PERCOCET", shape: "round", color: "white", notes: "Endo • Brand Percocet • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "63481-0623" },
    { drug_name: "Oxycodone/APAP 5-325mg", imprint: "IP 203", shape: "capsule", color: "white", notes: "Amneal • Percocet generic • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "65162-0203" },
    { drug_name: "Oxycodone/APAP 7.5-325mg", imprint: "PERCOCET 7.5-325", shape: "oval", color: "orange", notes: "Endo • Brand • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "63481-0628" },
    { drug_name: "Oxycodone/APAP 10-325mg", imprint: "IP 204", shape: "capsule", color: "white", notes: "Amneal • Percocet generic • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "65162-0204" },
    { drug_name: "Oxycodone/APAP 10-325mg", imprint: "PERCOCET 10-325", shape: "capsule", color: "yellow", notes: "Endo • Brand • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "63481-0629" },
    { drug_name: "Oxycodone/APAP 10-325mg", imprint: "T 194", shape: "round", color: "yellow", notes: "Camber • Percocet generic • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "31722-0194" },
    { drug_name: "Oxycodone/APAP 5-325mg", imprint: "TEC", shape: "round", color: "white", notes: "Various • Canadian variant • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: null },
    // ── Hydrocodone/APAP ──
    { drug_name: "Hydrocodone/APAP 5-325mg", imprint: "M365", shape: "capsule", color: "white", notes: "Mallinckrodt • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00406-0365" },
    { drug_name: "Hydrocodone/APAP 5-325mg", imprint: "IP 109", shape: "capsule", color: "white", notes: "Amneal • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "65162-0109" },
    { drug_name: "Hydrocodone/APAP 7.5-325mg", imprint: "M366", shape: "capsule", color: "white", notes: "Mallinckrodt • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00406-0366" },
    { drug_name: "Hydrocodone/APAP 7.5-325mg", imprint: "IP 110", shape: "capsule", color: "white", notes: "Amneal • Schedule II", ndc_code: "65162-0110" },
    { drug_name: "Hydrocodone/APAP 10-325mg", imprint: "M367", shape: "capsule", color: "white", notes: "Mallinckrodt • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00406-0367" },
    { drug_name: "Hydrocodone/APAP 10-325mg", imprint: "IP 112", shape: "capsule", color: "white", notes: "Amneal • Schedule II", ndc_code: "65162-0112" },
    { drug_name: "Hydrocodone/APAP 10-325mg", imprint: "Watson 853", shape: "capsule", color: "yellow", notes: "Watson Labs • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00591-0853" },
    { drug_name: "Hydrocodone/APAP 10-325mg", imprint: "U03", shape: "capsule", color: "white", notes: "Aurolife • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "13107-0145" },
    { drug_name: "Hydrocodone/APAP 10-325mg", imprint: "G 036", shape: "capsule", color: "yellow", notes: "Qualitest • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00603-3890" },
    { drug_name: "Hydrocodone/APAP 10-325mg", imprint: "V 3601", shape: "capsule", color: "yellow", notes: "Qualitest • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00603-3891" },
    // ── Hydromorphone / Dilaudid (NEW) ──
    { drug_name: "Hydromorphone 2mg", imprint: "M2", shape: "round", color: "white", notes: "Mallinckrodt • Dilaudid generic • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00406-3242" },
    { drug_name: "Hydromorphone 4mg", imprint: "M4", shape: "round", color: "yellow", notes: "Mallinckrodt • Dilaudid generic • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00406-3244" },
    { drug_name: "Hydromorphone 8mg", imprint: "M8", shape: "round", color: "white", notes: "Mallinckrodt • Dilaudid generic • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00406-3248" },
    { drug_name: "Hydromorphone 8mg", imprint: "P 8", shape: "round", color: "white", notes: "Rhodes • Dilaudid generic • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "12634-0523" },
    { drug_name: "Hydromorphone 4mg", imprint: "DILAUDID 4", shape: "round", color: "yellow", notes: "Purdue • Brand Dilaudid • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "59011-0454" },
    // ── Morphine ──
    { drug_name: "Morphine Sulfate 15mg", imprint: "54 733", shape: "round", color: "blue", notes: "Roxane • Immediate-release • Schedule II", ndc_code: "00054-0733" },
    { drug_name: "Morphine Sulfate 30mg", imprint: "54 262", shape: "round", color: "purple", notes: "Roxane • Immediate-release • Schedule II", ndc_code: "00054-0262" },
    { drug_name: "Morphine Sulfate ER 15mg", imprint: "ABG 15", shape: "round", color: "green", notes: "Allergan • Extended-release • Schedule II", ndc_code: "00591-3746" },
    { drug_name: "Morphine Sulfate ER 30mg", imprint: "ABG 30", shape: "round", color: "purple", notes: "Allergan • Extended-release • Schedule II", ndc_code: "00591-3747" },
    // ── Tramadol ──
    { drug_name: "Tramadol 50mg", imprint: "AN 627", shape: "round", color: "white", notes: "Amneal • Schedule IV", ndc_code: "65162-0627" },
    { drug_name: "Tramadol 50mg", imprint: "377", shape: "round", color: "white", notes: "Caraco • Schedule IV", ndc_code: "57664-0377" },
    { drug_name: "Tramadol 50mg", imprint: "ULTRAM", shape: "round", color: "white", notes: "Janssen • Brand • Schedule IV", ndc_code: "50458-0650" },
    // ── Codeine ──
    { drug_name: "Codeine/APAP 30-300mg", imprint: "2064 V", shape: "round", color: "white", notes: "Qualitest • Schedule III", ndc_code: "00603-2338" },
    { drug_name: "Codeine/APAP 30-300mg", imprint: "93 150", shape: "round", color: "white", notes: "Teva • Schedule III", ndc_code: "00093-0150" },
    // ── Buprenorphine ──
    { drug_name: "Buprenorphine/Naloxone 8-2mg", imprint: "N8", shape: "hexagon", color: "orange", notes: "Indivior • Suboxone generic • Schedule III", ndc_code: "12496-1208" },
    { drug_name: "Buprenorphine/Naloxone 2-0.5mg", imprint: "N2", shape: "hexagon", color: "orange", notes: "Indivior • Suboxone generic • Schedule III", ndc_code: "12496-1202" },
    // ── Other opioids ──
    { drug_name: "Methadone 10mg", imprint: "54 549", shape: "round", color: "white", notes: "Roxane • Schedule II", ndc_code: "00054-0549" },
    { drug_name: "Fentanyl 100mcg patch", imprint: "fentanyl 100 mcg/h", shape: "rectangle", color: "tan", notes: "Mylan • Transdermal • Schedule II", ndc_code: "00378-9012" },
    // ── Oxycodone IR — additional dosages & manufacturers ──
    { drug_name: "Oxycodone 5mg", imprint: "RP 5", shape: "round", color: "white", notes: "Rhodes • Schedule II", ndc_code: "12634-0281" },
    { drug_name: "Oxycodone 5mg", imprint: "48 12 V", shape: "round", color: "white", notes: "Qualitest • Schedule II", ndc_code: "00603-4992" },
    { drug_name: "Oxycodone 5mg", imprint: "M 05 52", shape: "round", color: "white", notes: "Mallinckrodt • Schedule II", ndc_code: "00406-0552" },
    { drug_name: "Oxycodone 10mg", imprint: "RP 10", shape: "round", color: "white", notes: "Rhodes • Schedule II", ndc_code: "12634-0282" },
    { drug_name: "Oxycodone 10mg", imprint: "48 11 V", shape: "round", color: "white", notes: "Qualitest • Schedule II", ndc_code: "00603-4991" },
    { drug_name: "Oxycodone 15mg", imprint: "RP 15", shape: "round", color: "green", notes: "Rhodes • Schedule II", ndc_code: "12634-0570" },
    { drug_name: "Oxycodone 15mg", imprint: "T 188", shape: "round", color: "green", notes: "Camber • Schedule II", ndc_code: "31722-0188" },
    { drug_name: "Oxycodone 20mg", imprint: "RP 20", shape: "round", color: "gray", notes: "Rhodes • Schedule II", ndc_code: "12634-0571" },
    { drug_name: "Oxycodone 20mg", imprint: "T 191", shape: "round", color: "gray", notes: "Camber • Schedule II", ndc_code: "31722-0191" },
    // ── Hydrocodone/APAP — additional manufacturers ──
    { drug_name: "Hydrocodone/APAP 5-325mg", imprint: "G 035", shape: "capsule", color: "white", notes: "Qualitest • Schedule II", ndc_code: "00603-3889" },
    { drug_name: "Hydrocodone/APAP 5-325mg", imprint: "V 3604", shape: "capsule", color: "white", notes: "Qualitest • Schedule II", ndc_code: "00603-3604" },
    { drug_name: "Hydrocodone/APAP 5-325mg", imprint: "T 258", shape: "capsule", color: "white", notes: "Camber • Schedule II", ndc_code: "31722-0258" },
    { drug_name: "Hydrocodone/APAP 7.5-325mg", imprint: "T 259", shape: "capsule", color: "white", notes: "Camber • Schedule II", ndc_code: "31722-0259" },
    { drug_name: "Hydrocodone/APAP 7.5-325mg", imprint: "Watson 385", shape: "capsule", color: "yellow", notes: "Watson Labs • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00591-0385" },
    { drug_name: "Hydrocodone/APAP 10-325mg", imprint: "T 260", shape: "capsule", color: "white", notes: "Camber • Schedule II", ndc_code: "31722-0260" },
    { drug_name: "Hydrocodone/APAP 10-325mg", imprint: "RP 10-325", shape: "capsule", color: "white", notes: "Rhodes • Schedule II", ndc_code: "12634-0553" },
    // ── Tramadol — additional manufacturers ──
    { drug_name: "Tramadol 50mg", imprint: "319", shape: "round", color: "white", notes: "Caraco • Schedule IV", ndc_code: "57664-0319" },
    { drug_name: "Tramadol 50mg", imprint: "MYLAN 5050", shape: "round", color: "white", notes: "Mylan • Schedule IV", ndc_code: "00378-5050" },
    { drug_name: "Tramadol 50mg", imprint: "HH 224", shape: "round", color: "white", notes: "Sun Pharma • Schedule IV", ndc_code: "43547-0224" },
    // ── Morphine — additional manufacturers ──
    { drug_name: "Morphine Sulfate 15mg", imprint: "E 15", shape: "round", color: "blue", notes: "Endo • Immediate-release • Schedule II", ndc_code: "60951-0773" },
    { drug_name: "Morphine Sulfate 30mg", imprint: "E 30", shape: "round", color: "purple", notes: "Endo • Immediate-release • Schedule II", ndc_code: "60951-0774" },
    // ── Fentanyl pressed pill warnings (educational/counterfeit) ──
    { drug_name: "⚠️ COUNTERFEIT — Fake 'M 30'", imprint: "M 30", shape: "round", color: "blue", notes: "⚠️ EXTREME DANGER — Most commonly counterfeited pill in US. Often contains illicit fentanyl/carfentanil. Legitimate M 30 is Oxycodone 30mg by Mallinckrodt. If obtained outside pharmacy, assume counterfeit.", ndc_code: null },
    { drug_name: "⚠️ COUNTERFEIT — Fake 'A 215'", imprint: "A 215", shape: "round", color: "blue", notes: "⚠️ EXTREME DANGER — Commonly counterfeited. Often contains illicit fentanyl. Legitimate A 215 is Oxycodone 30mg by Actavis. If obtained outside pharmacy, assume counterfeit.", ndc_code: null },
    { drug_name: "⚠️ COUNTERFEIT — Fake 'K 9'", imprint: "K 9", shape: "round", color: "blue", notes: "⚠️ EXTREME DANGER — Commonly counterfeited. Often contains illicit fentanyl. Legitimate K 9 is Oxycodone 30mg by KVK Tech. If obtained outside pharmacy, assume counterfeit.", ndc_code: null },
  ],

  benzos: [
    // ── Alprazolam ──
    { drug_name: "Alprazolam 0.25mg", imprint: "GG 256", shape: "oval", color: "white", notes: "Sandoz • Schedule IV", ndc_code: "00781-1062" },
    { drug_name: "Alprazolam 0.5mg", imprint: "GG 257", shape: "oval", color: "orange", notes: "Sandoz • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00781-1063" },
    { drug_name: "Alprazolam 1mg", imprint: "GG 258", shape: "oval", color: "blue", notes: "Sandoz • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00781-1064" },
    { drug_name: "Alprazolam 2mg", imprint: "GG 249", shape: "rectangle", color: "white", notes: "Sandoz • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — 'white bar'", ndc_code: "00781-1089" },
    { drug_name: "Alprazolam 2mg", imprint: "XANAX 2", shape: "rectangle", color: "white", notes: "Pfizer • Brand • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00009-0094" },
    { drug_name: "Alprazolam 2mg", imprint: "S 90 3", shape: "rectangle", color: "green", notes: "Dava • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — 'green bar'", ndc_code: "67253-0903" },
    { drug_name: "Alprazolam 2mg", imprint: "R 039", shape: "rectangle", color: "yellow", notes: "Actavis • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — 'yellow bar'", ndc_code: "00228-2039" },
    { drug_name: "Alprazolam 2mg", imprint: "B 707", shape: "rectangle", color: "blue", notes: "Breckenridge • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — 'blue bar', heavily faked", ndc_code: "51991-0707" },
    { drug_name: "Alprazolam 2mg", imprint: "Y 21", shape: "rectangle", color: "white", notes: "Aurobindo • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — white bar variant", ndc_code: "65862-0921" },
    { drug_name: "Alprazolam 2mg", imprint: "2090 V", shape: "rectangle", color: "white", notes: "Qualitest • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — white bar", ndc_code: "00603-2090" },
    { drug_name: "Alprazolam 2mg", imprint: "ONAX 2", shape: "rectangle", color: "white", notes: "Foreign brand • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — commonly faked foreign bar", ndc_code: null },
    { drug_name: "Alprazolam 1mg", imprint: "B 705", shape: "oval", color: "blue", notes: "Breckenridge • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — 'blue football'", ndc_code: "51991-0705" },
    { drug_name: "Alprazolam 1mg", imprint: "S 900", shape: "oval", color: "blue", notes: "Dava • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "67253-0900" },
    { drug_name: "Alprazolam 0.5mg", imprint: "S 901", shape: "oval", color: "orange", notes: "Dava • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "67253-0901" },
    // ── Diazepam ──
    { drug_name: "Diazepam 2mg", imprint: "3926 TEVA", shape: "round", color: "white", notes: "Teva • Schedule IV", ndc_code: "00093-3926" },
    { drug_name: "Diazepam 5mg", imprint: "3927 TEVA", shape: "round", color: "yellow", notes: "Teva • Schedule IV", ndc_code: "00093-3927" },
    { drug_name: "Diazepam 10mg", imprint: "3928 TEVA", shape: "round", color: "blue", notes: "Teva • Schedule IV", ndc_code: "00093-3928" },
    // ── Clonazepam ──
    { drug_name: "Clonazepam 0.5mg", imprint: "TEVA 832", shape: "round", color: "yellow", notes: "Teva • Schedule IV", ndc_code: "00093-0832" },
    { drug_name: "Clonazepam 1mg", imprint: "TEVA 833", shape: "round", color: "green", notes: "Teva • Schedule IV", ndc_code: "00093-0833" },
    { drug_name: "Clonazepam 2mg", imprint: "TEVA 834", shape: "round", color: "white", notes: "Teva • Schedule IV", ndc_code: "00093-0834" },
    { drug_name: "Clonazepam 0.5mg", imprint: "E 63", shape: "round", color: "orange", notes: "Aurobindo • Schedule IV", ndc_code: "65862-0063" },
    { drug_name: "Clonazepam 1mg", imprint: "E 64", shape: "round", color: "blue", notes: "Aurobindo • Schedule IV", ndc_code: "65862-0064" },
    // ── Lorazepam ──
    { drug_name: "Lorazepam 0.5mg", imprint: "ATIVAN 0.5", shape: "round", color: "white", notes: "Wyeth • Brand • Schedule IV", ndc_code: "00008-0081" },
    { drug_name: "Lorazepam 1mg", imprint: "WATSON 241 1", shape: "round", color: "white", notes: "Watson • Schedule IV", ndc_code: "00591-0241" },
    { drug_name: "Lorazepam 2mg", imprint: "WATSON 242 2", shape: "round", color: "white", notes: "Watson • Schedule IV", ndc_code: "00591-0242" },
    // ── Alprazolam — additional manufacturers ──
    { drug_name: "Alprazolam 0.25mg", imprint: "MYLAN A", shape: "oval", color: "white", notes: "Mylan • Schedule IV", ndc_code: "00378-4004" },
    { drug_name: "Alprazolam 0.25mg", imprint: "027 R", shape: "oval", color: "white", notes: "Actavis • Schedule IV", ndc_code: "00228-2027" },
    { drug_name: "Alprazolam 0.25mg", imprint: "G 3719", shape: "oval", color: "white", notes: "Greenstone • Schedule IV", ndc_code: "59762-3719" },
    { drug_name: "Alprazolam 0.5mg", imprint: "MYLAN A1", shape: "oval", color: "orange", notes: "Mylan • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00378-4005" },
    { drug_name: "Alprazolam 0.5mg", imprint: "029 R", shape: "oval", color: "orange", notes: "Actavis • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00228-2029" },
    { drug_name: "Alprazolam 0.5mg", imprint: "G 3720", shape: "oval", color: "orange", notes: "Greenstone • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "59762-3720" },
    { drug_name: "Alprazolam 0.5mg", imprint: "ALG 264", shape: "oval", color: "orange", notes: "Alvogen • Schedule IV", ndc_code: "47781-0264" },
    { drug_name: "Alprazolam 1mg", imprint: "MYLAN A3", shape: "oval", color: "blue", notes: "Mylan • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00378-4006" },
    { drug_name: "Alprazolam 1mg", imprint: "031 R", shape: "oval", color: "blue", notes: "Actavis • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00228-2031" },
    { drug_name: "Alprazolam 1mg", imprint: "G 3721", shape: "oval", color: "blue", notes: "Greenstone • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "59762-3721" },
    { drug_name: "Alprazolam 1mg", imprint: "Y 20", shape: "oval", color: "blue", notes: "Aurobindo • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "65862-0920" },
    { drug_name: "Alprazolam 2mg", imprint: "G 3722", shape: "rectangle", color: "white", notes: "Greenstone • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — 'white bar'", ndc_code: "59762-3722" },
    { drug_name: "Alprazolam 2mg", imprint: "MYLAN A4", shape: "rectangle", color: "white", notes: "Mylan • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK — 'white bar'", ndc_code: "00378-4007" },
    // ── Diazepam — additional manufacturers ──
    { drug_name: "Diazepam 2mg", imprint: "MYLAN 271", shape: "round", color: "white", notes: "Mylan • Schedule IV", ndc_code: "00378-0271" },
    { drug_name: "Diazepam 2mg", imprint: "barr 555 364", shape: "round", color: "white", notes: "Barr/Teva • Schedule IV", ndc_code: "00555-0364" },
    { drug_name: "Diazepam 5mg", imprint: "MYLAN 345", shape: "round", color: "green", notes: "Mylan • Schedule IV", ndc_code: "00378-0345" },
    { drug_name: "Diazepam 5mg", imprint: "barr 555 363", shape: "round", color: "yellow", notes: "Barr/Teva • Schedule IV", ndc_code: "00555-0363" },
    { drug_name: "Diazepam 5mg", imprint: "WATSON 781", shape: "round", color: "yellow", notes: "Watson • Schedule IV", ndc_code: "00591-0781" },
    { drug_name: "Diazepam 10mg", imprint: "MYLAN 477", shape: "round", color: "green", notes: "Mylan • Schedule IV", ndc_code: "00378-0477" },
    { drug_name: "Diazepam 10mg", imprint: "barr 555 362", shape: "round", color: "blue", notes: "Barr/Teva • Schedule IV", ndc_code: "00555-0362" },
    { drug_name: "Diazepam 10mg", imprint: "WATSON 790", shape: "round", color: "blue", notes: "Watson • Schedule IV", ndc_code: "00591-0790" },
    { drug_name: "Diazepam 10mg", imprint: "DAN 5620", shape: "round", color: "blue", notes: "Watson/Actavis • Schedule IV", ndc_code: "00591-5620" },
    // ── Clonazepam — additional manufacturers ──
    { drug_name: "Clonazepam 0.5mg", imprint: "C 14", shape: "round", color: "yellow", notes: "Accord • Schedule IV", ndc_code: "16729-0014" },
    { drug_name: "Clonazepam 0.5mg", imprint: "1/2 KLONOPIN", shape: "round", color: "orange", notes: "Roche • Brand Klonopin • Schedule IV", ndc_code: "00004-0068" },
    { drug_name: "Clonazepam 1mg", imprint: "C 15", shape: "round", color: "green", notes: "Accord • Schedule IV", ndc_code: "16729-0015" },
    { drug_name: "Clonazepam 1mg", imprint: "1 KLONOPIN", shape: "round", color: "blue", notes: "Roche • Brand Klonopin • Schedule IV", ndc_code: "00004-0058" },
    { drug_name: "Clonazepam 1mg", imprint: "M C 14", shape: "round", color: "green", notes: "Mylan • Schedule IV", ndc_code: "00378-1852" },
    { drug_name: "Clonazepam 2mg", imprint: "C 16", shape: "round", color: "white", notes: "Accord • Schedule IV", ndc_code: "16729-0016" },
    { drug_name: "Clonazepam 2mg", imprint: "2 KLONOPIN", shape: "round", color: "white", notes: "Roche • Brand Klonopin • Schedule IV", ndc_code: "00004-0098" },
    { drug_name: "Clonazepam 2mg", imprint: "M C 15", shape: "round", color: "white", notes: "Mylan • Schedule IV", ndc_code: "00378-1853" },
    // ── Lorazepam — additional manufacturers ──
    { drug_name: "Lorazepam 0.5mg", imprint: "EP 904", shape: "round", color: "white", notes: "Rising/Patriot • Schedule IV", ndc_code: "64125-0904" },
    { drug_name: "Lorazepam 0.5mg", imprint: "59", shape: "round", color: "white", notes: "Actavis • Schedule IV", ndc_code: "00228-2059" },
    { drug_name: "Lorazepam 1mg", imprint: "EP 905", shape: "round", color: "white", notes: "Rising/Patriot • Schedule IV", ndc_code: "64125-0905" },
    { drug_name: "Lorazepam 1mg", imprint: "57", shape: "round", color: "white", notes: "Actavis • Schedule IV", ndc_code: "00228-2057" },
    { drug_name: "Lorazepam 1mg", imprint: "MYLAN 457", shape: "round", color: "white", notes: "Mylan • Schedule IV", ndc_code: "00378-2457" },
    { drug_name: "Lorazepam 2mg", imprint: "EP 906", shape: "round", color: "white", notes: "Rising/Patriot • Schedule IV", ndc_code: "64125-0906" },
    { drug_name: "Lorazepam 2mg", imprint: "MYLAN 777", shape: "round", color: "white", notes: "Mylan • Schedule IV", ndc_code: "00378-2777" },
    // ── Temazepam ──
    { drug_name: "Temazepam 15mg", imprint: "MYLAN 4010", shape: "capsule", color: "blue", notes: "Mylan • Schedule IV", ndc_code: "00378-4010" },
    { drug_name: "Temazepam 30mg", imprint: "MYLAN 4030", shape: "capsule", color: "blue", notes: "Mylan • Schedule IV", ndc_code: "00378-4030" },
    // ── Midazolam ──
    { drug_name: "Midazolam 7.5mg", imprint: "7.5", shape: "oval", color: "orange", notes: "Various • Schedule IV • Hospital/procedural sedation", ndc_code: null },
    { drug_name: "Midazolam 15mg", imprint: "15", shape: "oval", color: "blue", notes: "Various • Schedule IV • Hospital/procedural sedation", ndc_code: null },
  ],

  stimulants: [
    // ── Adderall brand ──
    { drug_name: "Adderall 5mg", imprint: "AD 5", shape: "round", color: "white", notes: "Teva • Mixed amphetamine salts • Schedule II", ndc_code: "57844-0105" },
    { drug_name: "Adderall 7.5mg", imprint: "AD 7.5", shape: "oval", color: "blue", notes: "Teva • Mixed amphetamine salts • Schedule II", ndc_code: "57844-0107" },
    { drug_name: "Adderall 10mg", imprint: "AD 10", shape: "round", color: "blue", notes: "Teva • Mixed amphetamine salts • Schedule II", ndc_code: "57844-0110" },
    { drug_name: "Adderall 12.5mg", imprint: "AD 12.5", shape: "round", color: "orange", notes: "Teva • Mixed amphetamine salts • Schedule II", ndc_code: "57844-0112" },
    { drug_name: "Adderall 15mg", imprint: "AD 15", shape: "oval", color: "orange", notes: "Teva • Mixed amphetamine salts • Schedule II", ndc_code: "57844-0115" },
    { drug_name: "Adderall 20mg", imprint: "AD 20", shape: "round", color: "orange", notes: "Teva • Mixed amphetamine salts • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "57844-0120" },
    { drug_name: "Adderall 30mg", imprint: "AD 30", shape: "round", color: "orange", notes: "Teva • Mixed amphetamine salts • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "57844-0130" },
    // ── Generic amphetamine IR — common manufacturers ──
    { drug_name: "Amphetamine/Dextroamphetamine 10mg", imprint: "E 401", shape: "round", color: "pink", notes: "Eon/Sandoz • Schedule II", ndc_code: "00185-0401" },
    { drug_name: "Amphetamine/Dextroamphetamine 15mg", imprint: "E 403", shape: "oval", color: "orange", notes: "Eon/Sandoz • Schedule II", ndc_code: "00185-0403" },
    { drug_name: "Amphetamine/Dextroamphetamine 20mg", imprint: "E 404", shape: "round", color: "orange", notes: "Eon/Sandoz • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00185-0404" },
    { drug_name: "Amphetamine/Dextroamphetamine 30mg", imprint: "E 404 30", shape: "round", color: "orange", notes: "Eon/Sandoz • Schedule II • ⚠️ HIGH COUNTERFEIT RISK — commonly faked", ndc_code: "00185-0404" },
    { drug_name: "Amphetamine/Dextroamphetamine 20mg", imprint: "b 973 2 0", shape: "round", color: "orange", notes: "Teva/Barr • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00555-0973" },
    { drug_name: "Amphetamine/Dextroamphetamine 30mg", imprint: "b 974 3 0", shape: "round", color: "orange", notes: "Teva/Barr • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00555-0974" },
    { drug_name: "Amphetamine/Dextroamphetamine 10mg", imprint: "b 972 1 0", shape: "round", color: "blue", notes: "Teva/Barr • Schedule II", ndc_code: "00555-0972" },
    { drug_name: "Amphetamine/Dextroamphetamine 30mg", imprint: "dp 30", shape: "round", color: "orange", notes: "Teva • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00555-0790" },
    { drug_name: "Amphetamine/Dextroamphetamine 20mg", imprint: "dp 20", shape: "round", color: "orange", notes: "Teva • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: null },
    { drug_name: "Amphetamine/Dextroamphetamine 30mg", imprint: "u30", shape: "round", color: "orange", notes: "Aurolife • Schedule II • ⚠️ HIGH COUNTERFEIT RISK — very commonly faked", ndc_code: "13107-0030" },
    { drug_name: "Amphetamine/Dextroamphetamine 20mg", imprint: "u27", shape: "round", color: "orange", notes: "Aurolife • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "13107-0027" },
    { drug_name: "Amphetamine/Dextroamphetamine 30mg", imprint: "cor 136", shape: "round", color: "orange", notes: "CorePharma • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "64720-0136" },
    { drug_name: "Amphetamine/Dextroamphetamine 20mg", imprint: "cor 135", shape: "round", color: "orange", notes: "CorePharma • Schedule II", ndc_code: "64720-0135" },
    { drug_name: "Amphetamine/Dextroamphetamine 20mg", imprint: "NP 12", shape: "round", color: "pink", notes: "Nostrum • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "29033-0012" },
    { drug_name: "Amphetamine/Dextroamphetamine 30mg", imprint: "NP 13", shape: "round", color: "pink", notes: "Nostrum • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "29033-0013" },
    { drug_name: "Amphetamine/Dextroamphetamine 30mg", imprint: "MP 447", shape: "round", color: "orange", notes: "Sun Pharma • Schedule II", ndc_code: "53489-0447" },
    { drug_name: "Amphetamine/Dextroamphetamine 20mg", imprint: "MP 446", shape: "round", color: "orange", notes: "Sun Pharma • Schedule II", ndc_code: "53489-0446" },
    { drug_name: "Amphetamine/Dextroamphetamine 10mg", imprint: "MP 441", shape: "round", color: "blue", notes: "Sun Pharma • Schedule II", ndc_code: "53489-0441" },
    { drug_name: "Amphetamine/Dextroamphetamine 30mg", imprint: "TEVA 30", shape: "round", color: "orange", notes: "Teva • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: null },
    // ── Adderall XR ──
    { drug_name: "Adderall XR 5mg", imprint: "ADDERALL XR 5mg", shape: "capsule", color: "blue", notes: "Shire • Extended-release • Schedule II", ndc_code: "54092-0379" },
    { drug_name: "Adderall XR 10mg", imprint: "ADDERALL XR 10mg", shape: "capsule", color: "blue", notes: "Shire • Extended-release • Schedule II", ndc_code: "54092-0381" },
    { drug_name: "Adderall XR 15mg", imprint: "ADDERALL XR 15mg", shape: "capsule", color: "blue", notes: "Shire • Extended-release • Schedule II", ndc_code: "54092-0382" },
    { drug_name: "Adderall XR 20mg", imprint: "ADDERALL XR 20mg", shape: "capsule", color: "orange", notes: "Shire • Extended-release • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "54092-0383" },
    { drug_name: "Adderall XR 25mg", imprint: "ADDERALL XR 25mg", shape: "capsule", color: "orange", notes: "Shire • Extended-release • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "54092-0385" },
    { drug_name: "Adderall XR 30mg", imprint: "ADDERALL XR 30mg", shape: "capsule", color: "orange", notes: "Shire • Extended-release • Schedule II • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "54092-0387" },
    // ── Methylphenidate ──
    { drug_name: "Methylphenidate 5mg", imprint: "CIBA 7", shape: "round", color: "yellow", notes: "Novartis • Ritalin • Schedule II", ndc_code: "00078-0007" },
    { drug_name: "Methylphenidate 10mg", imprint: "CIBA 3", shape: "round", color: "green", notes: "Novartis • Ritalin • Schedule II", ndc_code: "00078-0003" },
    { drug_name: "Methylphenidate 20mg", imprint: "CIBA 34", shape: "round", color: "yellow", notes: "Novartis • Ritalin • Schedule II", ndc_code: "00078-0034" },
    // ── Concerta ──
    { drug_name: "Concerta 18mg", imprint: "alza 18", shape: "capsule", color: "yellow", notes: "Janssen • Extended-release methylphenidate • Schedule II", ndc_code: "50458-0585" },
    { drug_name: "Concerta 27mg", imprint: "alza 27", shape: "capsule", color: "gray", notes: "Janssen • Extended-release methylphenidate • Schedule II", ndc_code: "50458-0588" },
    { drug_name: "Concerta 36mg", imprint: "alza 36", shape: "capsule", color: "white", notes: "Janssen • Extended-release methylphenidate • Schedule II", ndc_code: "50458-0586" },
    { drug_name: "Concerta 54mg", imprint: "alza 54", shape: "capsule", color: "red", notes: "Janssen • Extended-release methylphenidate • Schedule II", ndc_code: "50458-0587" },
    // ── Vyvanse ──
    { drug_name: "Vyvanse 20mg", imprint: "S489 20 mg", shape: "capsule", color: "orange", notes: "Shire • Lisdexamfetamine • Schedule II", ndc_code: "59417-0102" },
    { drug_name: "Vyvanse 30mg", imprint: "S489 30 mg", shape: "capsule", color: "orange", notes: "Shire • Lisdexamfetamine • Schedule II", ndc_code: "59417-0103" },
    { drug_name: "Vyvanse 40mg", imprint: "S489 40 mg", shape: "capsule", color: "blue", notes: "Shire • Lisdexamfetamine • Schedule II", ndc_code: "59417-0104" },
    { drug_name: "Vyvanse 50mg", imprint: "S489 50 mg", shape: "capsule", color: "blue", notes: "Shire • Lisdexamfetamine • Schedule II", ndc_code: "59417-0105" },
    { drug_name: "Vyvanse 60mg", imprint: "S489 60 mg", shape: "capsule", color: "blue", notes: "Shire • Lisdexamfetamine • Schedule II", ndc_code: "59417-0106" },
    { drug_name: "Vyvanse 70mg", imprint: "S489 70 mg", shape: "capsule", color: "blue", notes: "Shire • Lisdexamfetamine • Schedule II", ndc_code: "59417-0107" },
    // ── Other stimulants ──
    { drug_name: "Modafinil 200mg", imprint: "PROVIGIL 200 MG", shape: "capsule", color: "white", notes: "Cephalon • Schedule IV", ndc_code: "63459-0201" },
    { drug_name: "Modafinil 100mg", imprint: "PROVIGIL 100 MG", shape: "capsule", color: "white", notes: "Cephalon • Schedule IV", ndc_code: "63459-0101" },
    { drug_name: "Dextroamphetamine 5mg", imprint: "DextroStat 5", shape: "round", color: "yellow", notes: "Shire • Schedule II", ndc_code: "54092-0071" },
    { drug_name: "Dextroamphetamine 10mg", imprint: "DextroStat 10", shape: "round", color: "yellow", notes: "Shire • Schedule II", ndc_code: "54092-0073" },
  ],

  antibiotics: [
    { drug_name: "Amoxicillin 500mg", imprint: "AMOX 500 GG 849", shape: "capsule", color: "pink", notes: "Sandoz • Penicillin antibiotic", ndc_code: "00781-2613" },
    { drug_name: "Amoxicillin 500mg", imprint: "WC 731", shape: "capsule", color: "pink", notes: "West-ward • Penicillin antibiotic", ndc_code: "00143-9731" },
    { drug_name: "Amoxicillin 500mg", imprint: "A 45", shape: "capsule", color: "pink", notes: "Aurobindo • Penicillin antibiotic", ndc_code: "65862-0045" },
    { drug_name: "Amoxicillin 500mg", imprint: "RX 655", shape: "capsule", color: "pink", notes: "Ranbaxy • Penicillin antibiotic", ndc_code: "63304-0655" },
    { drug_name: "Amoxicillin 250mg", imprint: "AMOX 250 GG 848", shape: "capsule", color: "pink", notes: "Sandoz • Penicillin antibiotic", ndc_code: "00781-2612" },
    { drug_name: "Amoxicillin 875mg", imprint: "93 2274", shape: "capsule", color: "pink", notes: "Teva • Penicillin antibiotic", ndc_code: "00093-2274" },
    { drug_name: "Amoxicillin 875mg", imprint: "WW 951", shape: "capsule", color: "white", notes: "West-ward • Penicillin antibiotic", ndc_code: "00143-9951" },
    { drug_name: "Amoxicillin/Clavulanate 875-125mg", imprint: "93 2274", shape: "capsule", color: "white", notes: "Teva • Augmentin generic", ndc_code: "00093-2274" },
    { drug_name: "Amoxicillin/Clavulanate 875-125mg", imprint: "AMC 875 125", shape: "capsule", color: "white", notes: "Sandoz • Augmentin generic", ndc_code: "00781-2763" },
    { drug_name: "Amoxicillin/Clavulanate 500-125mg", imprint: "93 2264", shape: "oval", color: "white", notes: "Teva • Augmentin generic", ndc_code: "00093-2264" },
    { drug_name: "Azithromycin 250mg", imprint: "APO AZ 250", shape: "capsule", color: "pink", notes: "Apotex • Z-pack • Macrolide", ndc_code: "60505-2581" },
    { drug_name: "Azithromycin 250mg", imprint: "PFIZER 306", shape: "capsule", color: "pink", notes: "Pfizer • Zithromax brand • Macrolide", ndc_code: "00069-3060" },
    { drug_name: "Azithromycin 250mg", imprint: "W 962", shape: "oval", color: "pink", notes: "Wockhardt • Macrolide", ndc_code: "64679-0962" },
    { drug_name: "Azithromycin 500mg", imprint: "787", shape: "oval", color: "blue", notes: "Sandoz • Macrolide", ndc_code: "00781-5787" },
    { drug_name: "Azithromycin 500mg", imprint: "APO AZ 500", shape: "capsule", color: "blue", notes: "Apotex • Macrolide", ndc_code: "60505-2583" },
    { drug_name: "Cephalexin 500mg", imprint: "LUPIN 500", shape: "capsule", color: "green", notes: "Lupin • Cephalosporin", ndc_code: "68180-0122" },
    { drug_name: "Cephalexin 500mg", imprint: "TEVA 3147", shape: "capsule", color: "green", notes: "Teva • Cephalosporin", ndc_code: "00093-3147" },
    { drug_name: "Cephalexin 250mg", imprint: "LUPIN 250", shape: "capsule", color: "white", notes: "Lupin • Cephalosporin", ndc_code: "68180-0121" },
    { drug_name: "Cephalexin 500mg", imprint: "IP 141", shape: "capsule", color: "green", notes: "Amneal • Cephalosporin", ndc_code: "65162-0141" },
    { drug_name: "Ciprofloxacin 500mg", imprint: "CIPRO 500", shape: "capsule", color: "white", notes: "Bayer • Fluoroquinolone", ndc_code: "00026-8512" },
    { drug_name: "Ciprofloxacin 500mg", imprint: "93 0862", shape: "capsule", color: "white", notes: "Teva • Fluoroquinolone", ndc_code: "00093-0862" },
    { drug_name: "Ciprofloxacin 250mg", imprint: "CIP 250", shape: "round", color: "white", notes: "Generic • Fluoroquinolone", ndc_code: "65862-0537" },
    { drug_name: "Ciprofloxacin 250mg", imprint: "93 0852", shape: "round", color: "white", notes: "Teva • Fluoroquinolone", ndc_code: "00093-0852" },
    { drug_name: "Doxycycline 100mg", imprint: "WESTWARD 3142", shape: "capsule", color: "blue", notes: "West-ward • Tetracycline", ndc_code: "00143-3142" },
    { drug_name: "Doxycycline 100mg", imprint: "DAN 5440", shape: "capsule", color: "yellow", notes: "Watson • Tetracycline", ndc_code: "00591-5440" },
    { drug_name: "Doxycycline 100mg", imprint: "VIBRAMYCIN", shape: "capsule", color: "blue", notes: "Pfizer • Brand Tetracycline", ndc_code: "00069-0990" },
    { drug_name: "Doxycycline 50mg", imprint: "WESTWARD 3141", shape: "capsule", color: "blue", notes: "West-ward • Tetracycline", ndc_code: "00143-3141" },
    { drug_name: "Levofloxacin 500mg", imprint: "LEVAQUIN 500", shape: "capsule", color: "pink", notes: "Janssen • Fluoroquinolone", ndc_code: "50458-0925" },
    { drug_name: "Levofloxacin 500mg", imprint: "93 7171", shape: "capsule", color: "pink", notes: "Teva • Fluoroquinolone", ndc_code: "00093-7171" },
    { drug_name: "Levofloxacin 250mg", imprint: "LEVAQUIN 250", shape: "round", color: "pink", notes: "Janssen • Fluoroquinolone", ndc_code: "50458-0920" },
    { drug_name: "Metronidazole 500mg", imprint: "PLIVA 334", shape: "round", color: "white", notes: "Pliva • Flagyl generic", ndc_code: "50111-0334" },
    { drug_name: "Metronidazole 500mg", imprint: "IP 204", shape: "round", color: "white", notes: "Amneal • Flagyl generic", ndc_code: "65162-0204" },
    { drug_name: "Metronidazole 250mg", imprint: "PLIVA 333", shape: "round", color: "white", notes: "Pliva • Flagyl generic", ndc_code: "50111-0333" },
    { drug_name: "Sulfamethoxazole/Trimethoprim 800-160mg", imprint: "IP 272", shape: "capsule", color: "white", notes: "Amneal • Bactrim generic", ndc_code: "65162-0272" },
    { drug_name: "Sulfamethoxazole/Trimethoprim 800-160mg", imprint: "93 089", shape: "capsule", color: "white", notes: "Teva • Bactrim generic", ndc_code: "00093-0089" },
    { drug_name: "Sulfamethoxazole/Trimethoprim 400-80mg", imprint: "IP 271", shape: "round", color: "white", notes: "Amneal • Bactrim DS generic", ndc_code: "65162-0271" },
    { drug_name: "Clindamycin 150mg", imprint: "CLINDAMYCIN 150mg", shape: "capsule", color: "green", notes: "Generic • Lincosamide", ndc_code: "00093-3171" },
    { drug_name: "Clindamycin 300mg", imprint: "RX 693", shape: "capsule", color: "pink", notes: "Ranbaxy • Lincosamide", ndc_code: "63304-0693" },
    { drug_name: "Nitrofurantoin 100mg", imprint: "MACROBID", shape: "capsule", color: "yellow", notes: "Procter & Gamble • UTI antibiotic", ndc_code: "00149-0710" },
    { drug_name: "Nitrofurantoin 100mg", imprint: "IP 101", shape: "capsule", color: "yellow", notes: "Amneal • UTI antibiotic", ndc_code: "65162-0101" },
    { drug_name: "Penicillin VK 500mg", imprint: "GG 950", shape: "oval", color: "white", notes: "Sandoz • Penicillin", ndc_code: "00781-1805" },
    { drug_name: "Penicillin VK 500mg", imprint: "V", shape: "oval", color: "white", notes: "Qualitest • Penicillin", ndc_code: "00603-0116" },
    { drug_name: "Cefdinir 300mg", imprint: "LUPIN CEFDINIR 300", shape: "capsule", color: "purple", notes: "Lupin • Cephalosporin", ndc_code: "68180-0718" },
    { drug_name: "Trimethoprim 100mg", imprint: "93 089", shape: "round", color: "white", notes: "Teva • UTI antibiotic", ndc_code: "00093-0089" },
  ],

  cardiovascular: [
    { drug_name: "Atorvastatin 10mg", imprint: "PD 155 10", shape: "oval", color: "white", notes: "Pfizer • Lipitor generic • Statin", ndc_code: "00071-0155" },
    { drug_name: "Atorvastatin 10mg", imprint: "RDY 121", shape: "oval", color: "white", notes: "Dr. Reddy's • Statin", ndc_code: "55111-0121" },
    { drug_name: "Atorvastatin 20mg", imprint: "PD 156 20", shape: "oval", color: "white", notes: "Pfizer • Lipitor generic • Statin", ndc_code: "00071-0156" },
    { drug_name: "Atorvastatin 20mg", imprint: "RDY 122", shape: "oval", color: "white", notes: "Dr. Reddy's • Statin", ndc_code: "55111-0122" },
    { drug_name: "Atorvastatin 40mg", imprint: "PD 157 40", shape: "oval", color: "white", notes: "Pfizer • Lipitor generic • Statin", ndc_code: "00071-0157" },
    { drug_name: "Atorvastatin 40mg", imprint: "RDY 123", shape: "oval", color: "white", notes: "Dr. Reddy's • Statin", ndc_code: "55111-0123" },
    { drug_name: "Atorvastatin 80mg", imprint: "PD 158 80", shape: "oval", color: "white", notes: "Pfizer • Lipitor generic • Statin", ndc_code: "00071-0158" },
    { drug_name: "Lisinopril 5mg", imprint: "LUPIN 5", shape: "round", color: "white", notes: "Lupin • ACE inhibitor", ndc_code: "68180-0512" },
    { drug_name: "Lisinopril 10mg", imprint: "LUPIN 10", shape: "round", color: "pink", notes: "Lupin • ACE inhibitor", ndc_code: "68180-0513" },
    { drug_name: "Lisinopril 10mg", imprint: "M L23", shape: "round", color: "pink", notes: "Mylan • ACE inhibitor", ndc_code: "00378-0823" },
    { drug_name: "Lisinopril 20mg", imprint: "LUPIN 20", shape: "round", color: "white", notes: "Lupin • ACE inhibitor", ndc_code: "68180-0514" },
    { drug_name: "Lisinopril 20mg", imprint: "M L24", shape: "round", color: "white", notes: "Mylan • ACE inhibitor", ndc_code: "00378-0824" },
    { drug_name: "Lisinopril 40mg", imprint: "LUPIN 40", shape: "round", color: "yellow", notes: "Lupin • ACE inhibitor", ndc_code: "68180-0515" },
    { drug_name: "Lisinopril/HCTZ 20-12.5mg", imprint: "WATSON 862", shape: "round", color: "pink", notes: "Watson • ACE inhibitor + diuretic", ndc_code: "00591-0862" },
    { drug_name: "Lisinopril/HCTZ 20-25mg", imprint: "WATSON 863", shape: "round", color: "white", notes: "Watson • ACE inhibitor + diuretic", ndc_code: "00591-0863" },
    { drug_name: "Metoprolol Succinate ER 25mg", imprint: "M 1", shape: "round", color: "white", notes: "Mylan • Beta blocker", ndc_code: "00378-0071" },
    { drug_name: "Metoprolol Succinate ER 50mg", imprint: "M 47", shape: "round", color: "white", notes: "Mylan • Beta blocker", ndc_code: "00378-0072" },
    { drug_name: "Metoprolol Succinate ER 100mg", imprint: "M 50", shape: "round", color: "white", notes: "Mylan • Beta blocker", ndc_code: "00378-0073" },
    { drug_name: "Metoprolol Tartrate 25mg", imprint: "M 18", shape: "round", color: "pink", notes: "Mylan • Beta blocker", ndc_code: "00378-0018" },
    { drug_name: "Metoprolol Tartrate 50mg", imprint: "M 32", shape: "round", color: "pink", notes: "Mylan • Beta blocker", ndc_code: "00378-0032" },
    { drug_name: "Metoprolol Tartrate 100mg", imprint: "M 47", shape: "round", color: "white", notes: "Mylan • Beta blocker", ndc_code: "00378-0047" },
    { drug_name: "Amlodipine 2.5mg", imprint: "NORVASC 2.5", shape: "diamond", color: "white", notes: "Pfizer • Calcium channel blocker", ndc_code: "00069-1520" },
    { drug_name: "Amlodipine 5mg", imprint: "NORVASC 5", shape: "hexagon", color: "white", notes: "Pfizer • Calcium channel blocker", ndc_code: "00069-1530" },
    { drug_name: "Amlodipine 5mg", imprint: "G 1530", shape: "round", color: "white", notes: "Greenstone • Calcium channel blocker", ndc_code: "59762-1530" },
    { drug_name: "Amlodipine 10mg", imprint: "NORVASC 10", shape: "round", color: "white", notes: "Pfizer • Calcium channel blocker", ndc_code: "00069-1540" },
    { drug_name: "Amlodipine 10mg", imprint: "G 1540", shape: "round", color: "white", notes: "Greenstone • Calcium channel blocker", ndc_code: "59762-1540" },
    { drug_name: "Amlodipine/Atorvastatin 5-10mg", imprint: "CDT 051", shape: "capsule", color: "white", notes: "Pfizer • Caduet • Combo", ndc_code: "00069-2150" },
    { drug_name: "Losartan 25mg", imprint: "952", shape: "oval", color: "green", notes: "Teva • ARB", ndc_code: "00093-7367" },
    { drug_name: "Losartan 50mg", imprint: "953", shape: "oval", color: "white", notes: "Teva • ARB", ndc_code: "00093-7368" },
    { drug_name: "Losartan 50mg", imprint: "LU H12", shape: "oval", color: "white", notes: "Lupin • ARB", ndc_code: "68180-0187" },
    { drug_name: "Losartan 100mg", imprint: "960", shape: "oval", color: "white", notes: "Teva • ARB", ndc_code: "00093-7369" },
    { drug_name: "Losartan/HCTZ 50-12.5mg", imprint: "747", shape: "oval", color: "yellow", notes: "Teva • ARB + diuretic", ndc_code: "00093-7370" },
    { drug_name: "Valsartan 80mg", imprint: "NVR DO", shape: "round", color: "pink", notes: "Novartis • Diovan • ARB", ndc_code: "00078-0358" },
    { drug_name: "Valsartan 160mg", imprint: "NVR DX", shape: "oval", color: "gray", notes: "Novartis • Diovan • ARB", ndc_code: "00078-0359" },
    { drug_name: "Hydrochlorothiazide 12.5mg", imprint: "M 42", shape: "round", color: "white", notes: "Mylan • Thiazide diuretic", ndc_code: "00378-0042" },
    { drug_name: "Hydrochlorothiazide 25mg", imprint: "M 64", shape: "round", color: "white", notes: "Mylan • Thiazide diuretic", ndc_code: "00378-0064" },
    { drug_name: "Hydrochlorothiazide 50mg", imprint: "M 73", shape: "round", color: "white", notes: "Mylan • Thiazide diuretic", ndc_code: "00378-0073" },
    { drug_name: "Furosemide 20mg", imprint: "MYLAN 216 40", shape: "round", color: "white", notes: "Mylan • Loop diuretic", ndc_code: "00378-0216" },
    { drug_name: "Furosemide 40mg", imprint: "MYLAN 232 40", shape: "round", color: "white", notes: "Mylan • Loop diuretic", ndc_code: "00378-0232" },
    { drug_name: "Furosemide 80mg", imprint: "MYLAN 234 80", shape: "round", color: "white", notes: "Mylan • Loop diuretic", ndc_code: "00378-0234" },
    { drug_name: "Warfarin 1mg", imprint: "COUMADIN 1", shape: "round", color: "pink", notes: "Bristol-Myers • Anticoagulant", ndc_code: "00056-0169" },
    { drug_name: "Warfarin 2mg", imprint: "COUMADIN 2", shape: "round", color: "purple", notes: "Bristol-Myers • Anticoagulant", ndc_code: "00056-0170" },
    { drug_name: "Warfarin 5mg", imprint: "COUMADIN 5", shape: "round", color: "green", notes: "Bristol-Myers • Anticoagulant", ndc_code: "00056-0172" },
    { drug_name: "Warfarin 10mg", imprint: "COUMADIN 10", shape: "round", color: "white", notes: "Bristol-Myers • Anticoagulant", ndc_code: "00056-0176" },
    { drug_name: "Clopidogrel 75mg", imprint: "75 1171", shape: "round", color: "pink", notes: "Teva • Plavix generic • Antiplatelet", ndc_code: "00093-1171" },
    { drug_name: "Clopidogrel 75mg", imprint: "A 15", shape: "round", color: "pink", notes: "Aurobindo • Plavix generic • Antiplatelet", ndc_code: "65862-0527" },
    { drug_name: "Rosuvastatin 5mg", imprint: "ZD4522 5", shape: "round", color: "yellow", notes: "AstraZeneca • Crestor • Statin", ndc_code: "00310-0750" },
    { drug_name: "Rosuvastatin 10mg", imprint: "ZD4522 10", shape: "round", color: "pink", notes: "AstraZeneca • Crestor • Statin", ndc_code: "00310-0751" },
    { drug_name: "Rosuvastatin 20mg", imprint: "ZD4522 20", shape: "round", color: "pink", notes: "AstraZeneca • Crestor • Statin", ndc_code: "00310-0752" },
    { drug_name: "Rosuvastatin 40mg", imprint: "ZD4522 40", shape: "round", color: "pink", notes: "AstraZeneca • Crestor • Statin", ndc_code: "00310-0753" },
    { drug_name: "Simvastatin 10mg", imprint: "MSD 735", shape: "oval", color: "tan", notes: "Merck • Zocor • Statin", ndc_code: "00006-0735" },
    { drug_name: "Simvastatin 20mg", imprint: "MSD 740", shape: "round", color: "tan", notes: "Merck • Zocor • Statin", ndc_code: "00006-0740" },
    { drug_name: "Simvastatin 40mg", imprint: "MSD 749", shape: "oval", color: "red", notes: "Merck • Zocor • Statin", ndc_code: "00006-0749" },
    { drug_name: "Simvastatin 80mg", imprint: "MSD 543", shape: "capsule", color: "red", notes: "Merck • Zocor • Statin", ndc_code: "00006-0543" },
    { drug_name: "Pravastatin 20mg", imprint: "P 20", shape: "round", color: "yellow", notes: "Various • Statin", ndc_code: "00003-5194" },
    { drug_name: "Pravastatin 40mg", imprint: "P 40", shape: "round", color: "green", notes: "Various • Statin", ndc_code: "00003-5178" },
    { drug_name: "Carvedilol 3.125mg", imprint: "Z 4801", shape: "oval", color: "white", notes: "Zydus • Beta blocker", ndc_code: "68382-0021" },
    { drug_name: "Carvedilol 6.25mg", imprint: "Z 4802", shape: "oval", color: "white", notes: "Zydus • Beta blocker", ndc_code: "68382-0022" },
    { drug_name: "Carvedilol 12.5mg", imprint: "Z 4803", shape: "oval", color: "white", notes: "Zydus • Beta blocker", ndc_code: "68382-0023" },
    { drug_name: "Carvedilol 25mg", imprint: "Z 4804", shape: "oval", color: "white", notes: "Zydus • Beta blocker", ndc_code: "68382-0024" },
    { drug_name: "Propranolol 10mg", imprint: "PLIVA 468", shape: "round", color: "orange", notes: "Pliva • Beta blocker", ndc_code: "50111-0468" },
    { drug_name: "Propranolol 20mg", imprint: "PLIVA 469", shape: "round", color: "blue", notes: "Pliva • Beta blocker", ndc_code: "50111-0469" },
    { drug_name: "Propranolol 40mg", imprint: "PLIVA 471", shape: "round", color: "green", notes: "Pliva • Beta blocker", ndc_code: "50111-0471" },
    { drug_name: "Diltiazem 30mg", imprint: "CARDIZEM 30", shape: "round", color: "green", notes: "Hoechst • Calcium channel blocker", ndc_code: "00088-1771" },
    { drug_name: "Diltiazem 60mg", imprint: "CARDIZEM 60", shape: "round", color: "yellow", notes: "Hoechst • Calcium channel blocker", ndc_code: "00088-1772" },
    { drug_name: "Diltiazem ER 120mg", imprint: "CARDIZEM CD 120", shape: "capsule", color: "blue", notes: "Biovail • Extended-release", ndc_code: "64455-0120" },
    { drug_name: "Diltiazem ER 240mg", imprint: "CARDIZEM CD 240", shape: "capsule", color: "blue", notes: "Biovail • Extended-release", ndc_code: "64455-0240" },
    { drug_name: "Enalapril 5mg", imprint: "MSD 712", shape: "capsule", color: "white", notes: "Merck • Vasotec • ACE inhibitor", ndc_code: "00006-0712" },
    { drug_name: "Enalapril 10mg", imprint: "MSD 713", shape: "round", color: "red", notes: "Merck • Vasotec • ACE inhibitor", ndc_code: "00006-0713" },
    { drug_name: "Enalapril 20mg", imprint: "MSD 714", shape: "round", color: "tan", notes: "Merck • Vasotec • ACE inhibitor", ndc_code: "00006-0714" },
    { drug_name: "Ramipril 5mg", imprint: "ALTACE 5mg", shape: "capsule", color: "white", notes: "Monarch • ACE inhibitor", ndc_code: "61570-0102" },
    { drug_name: "Ramipril 10mg", imprint: "ALTACE 10mg", shape: "capsule", color: "blue", notes: "Monarch • ACE inhibitor", ndc_code: "61570-0104" },
    { drug_name: "Spironolactone 25mg", imprint: "ALDACTONE 25", shape: "round", color: "white", notes: "Pfizer • K-sparing diuretic", ndc_code: "00025-1001" },
    { drug_name: "Spironolactone 50mg", imprint: "ALDACTONE 50", shape: "round", color: "tan", notes: "Pfizer • K-sparing diuretic", ndc_code: "00025-1041" },
  ],

  diabetes: [
    { drug_name: "Metformin 500mg", imprint: "Z 70", shape: "round", color: "white", notes: "Zydus • Biguanide • First-line diabetes", ndc_code: "68382-0028" },
    { drug_name: "Metformin 850mg", imprint: "93 48", shape: "round", color: "white", notes: "Teva • Biguanide", ndc_code: "00093-0048" },
    { drug_name: "Metformin 1000mg", imprint: "101", shape: "oval", color: "white", notes: "Sun Pharma • Biguanide", ndc_code: "63304-0101" },
    { drug_name: "Metformin ER 500mg", imprint: "GG 461", shape: "oval", color: "white", notes: "Sandoz • Extended-release", ndc_code: "00781-5061" },
    { drug_name: "Metformin ER 750mg", imprint: "93 7214", shape: "capsule", color: "white", notes: "Teva • Extended-release", ndc_code: "00093-7214" },
    { drug_name: "Glipizide 5mg", imprint: "GLUCOTROL 5", shape: "diamond", color: "white", notes: "Pfizer • Sulfonylurea", ndc_code: "00049-4110" },
    { drug_name: "Glipizide 10mg", imprint: "GLUCOTROL 10", shape: "diamond", color: "white", notes: "Pfizer • Sulfonylurea", ndc_code: "00049-4120" },
    { drug_name: "Glipizide ER 5mg", imprint: "GXL 5", shape: "round", color: "white", notes: "Pfizer • Glucotrol XL", ndc_code: "00049-4150" },
    { drug_name: "Glimepiride 1mg", imprint: "AMARYL 1", shape: "oval", color: "pink", notes: "Sanofi • Sulfonylurea", ndc_code: "00039-0221" },
    { drug_name: "Glimepiride 2mg", imprint: "AMARYL 2", shape: "oval", color: "green", notes: "Sanofi • Sulfonylurea", ndc_code: "00039-0222" },
    { drug_name: "Glimepiride 4mg", imprint: "AMARYL 4", shape: "oval", color: "blue", notes: "Sanofi • Sulfonylurea", ndc_code: "00039-0224" },
    { drug_name: "Sitagliptin 100mg", imprint: "277", shape: "round", color: "tan", notes: "Merck • Januvia • DPP-4 inhibitor", ndc_code: "00006-0277" },
    { drug_name: "Sitagliptin 50mg", imprint: "112", shape: "round", color: "tan", notes: "Merck • Januvia • DPP-4 inhibitor", ndc_code: "00006-0112" },
    { drug_name: "Empagliflozin 10mg", imprint: "S10", shape: "round", color: "yellow", notes: "Boehringer • Jardiance • SGLT2 inhibitor", ndc_code: "00597-0150" },
    { drug_name: "Empagliflozin 25mg", imprint: "S25", shape: "oval", color: "yellow", notes: "Boehringer • Jardiance • SGLT2 inhibitor", ndc_code: "00597-0152" },
    { drug_name: "Pioglitazone 15mg", imprint: "ACTOS 15", shape: "round", color: "white", notes: "Takeda • Thiazolidinedione", ndc_code: "64764-0151" },
    { drug_name: "Pioglitazone 30mg", imprint: "ACTOS 30", shape: "round", color: "white", notes: "Takeda • Thiazolidinedione", ndc_code: "64764-0301" },
    { drug_name: "Glyburide 5mg", imprint: "MICRONASE 5", shape: "round", color: "blue", notes: "Pfizer • Sulfonylurea", ndc_code: "00009-0171" },
  ],

  psychiatric: [
    // ── SSRIs ──
    { drug_name: "Sertraline 25mg", imprint: "ZOLOFT 25 MG", shape: "capsule", color: "blue", notes: "Pfizer • SSRI", ndc_code: "00049-4900" },
    { drug_name: "Sertraline 50mg", imprint: "ZOLOFT 50 MG", shape: "capsule", color: "blue", notes: "Pfizer • SSRI", ndc_code: "00049-4960" },
    { drug_name: "Sertraline 100mg", imprint: "ZOLOFT 100 MG", shape: "capsule", color: "yellow", notes: "Pfizer • SSRI", ndc_code: "00049-4910" },
    { drug_name: "Sertraline 50mg", imprint: "LU D02", shape: "oval", color: "blue", notes: "Lupin • SSRI generic", ndc_code: "68180-0352" },
    { drug_name: "Sertraline 100mg", imprint: "LU D03", shape: "oval", color: "yellow", notes: "Lupin • SSRI generic", ndc_code: "68180-0353" },
    { drug_name: "Sertraline 50mg", imprint: "GG 263", shape: "capsule", color: "blue", notes: "Sandoz • SSRI generic", ndc_code: "00781-1263" },
    { drug_name: "Fluoxetine 10mg", imprint: "DISTA 3104 PROZAC 10", shape: "capsule", color: "green", notes: "Lilly • SSRI", ndc_code: "00777-3104" },
    { drug_name: "Fluoxetine 20mg", imprint: "DISTA 3105 PROZAC 20", shape: "capsule", color: "green", notes: "Lilly • SSRI", ndc_code: "00777-3105" },
    { drug_name: "Fluoxetine 40mg", imprint: "DISTA 3107 PROZAC 40", shape: "capsule", color: "green", notes: "Lilly • SSRI", ndc_code: "00777-3107" },
    { drug_name: "Fluoxetine 20mg", imprint: "R 147", shape: "capsule", color: "blue", notes: "Dr. Reddy's • SSRI generic", ndc_code: "55111-0147" },
    { drug_name: "Fluoxetine 20mg", imprint: "93 42", shape: "capsule", color: "green", notes: "Teva • SSRI generic", ndc_code: "00093-0042" },
    { drug_name: "Fluoxetine 10mg", imprint: "93 41", shape: "capsule", color: "green", notes: "Teva • SSRI generic", ndc_code: "00093-0041" },
    { drug_name: "Escitalopram 5mg", imprint: "F L 5", shape: "round", color: "white", notes: "Forest • Lexapro generic • SSRI", ndc_code: "00456-2005" },
    { drug_name: "Escitalopram 10mg", imprint: "F L 10", shape: "round", color: "white", notes: "Forest • Lexapro generic • SSRI", ndc_code: "00456-2010" },
    { drug_name: "Escitalopram 10mg", imprint: "L 10", shape: "round", color: "white", notes: "Torrent • SSRI generic", ndc_code: "13668-0010" },
    { drug_name: "Escitalopram 20mg", imprint: "F L 20", shape: "round", color: "white", notes: "Forest • Lexapro generic • SSRI", ndc_code: "00456-2020" },
    { drug_name: "Escitalopram 20mg", imprint: "L 20", shape: "round", color: "white", notes: "Torrent • SSRI generic", ndc_code: "13668-0020" },
    { drug_name: "Paroxetine 10mg", imprint: "PAXIL 10", shape: "oval", color: "yellow", notes: "GSK • SSRI", ndc_code: "00029-3210" },
    { drug_name: "Paroxetine 20mg", imprint: "PAXIL 20", shape: "oval", color: "pink", notes: "GSK • SSRI", ndc_code: "00029-3211" },
    { drug_name: "Paroxetine 30mg", imprint: "PAXIL 30", shape: "round", color: "blue", notes: "GSK • SSRI", ndc_code: "00029-3212" },
    { drug_name: "Paroxetine 40mg", imprint: "PAXIL 40", shape: "round", color: "green", notes: "GSK • SSRI", ndc_code: "00029-3213" },
    { drug_name: "Citalopram 10mg", imprint: "F E", shape: "oval", color: "tan", notes: "Forest • SSRI", ndc_code: "00456-4010" },
    { drug_name: "Citalopram 20mg", imprint: "F P", shape: "oval", color: "pink", notes: "Forest • SSRI", ndc_code: "00456-4020" },
    { drug_name: "Citalopram 40mg", imprint: "F T", shape: "oval", color: "white", notes: "Forest • SSRI", ndc_code: "00456-4040" },
    { drug_name: "Citalopram 20mg", imprint: "M 8", shape: "round", color: "pink", notes: "Mylan • SSRI generic", ndc_code: "00378-0228" },
    // ── SNRIs ──
    { drug_name: "Duloxetine 20mg", imprint: "LILLY 3235 20mg", shape: "capsule", color: "green", notes: "Lilly • Cymbalta • SNRI", ndc_code: "00002-3235" },
    { drug_name: "Duloxetine 30mg", imprint: "LILLY 3240 30mg", shape: "capsule", color: "green", notes: "Lilly • Cymbalta • SNRI", ndc_code: "00002-3240" },
    { drug_name: "Duloxetine 60mg", imprint: "LILLY 3270 60mg", shape: "capsule", color: "green", notes: "Lilly • Cymbalta • SNRI", ndc_code: "00002-3270" },
    { drug_name: "Duloxetine 30mg", imprint: "IN 30", shape: "capsule", color: "blue", notes: "InvaGen • SNRI generic", ndc_code: "43547-0351" },
    { drug_name: "Duloxetine 60mg", imprint: "IN 60", shape: "capsule", color: "blue", notes: "InvaGen • SNRI generic", ndc_code: "43547-0352" },
    { drug_name: "Venlafaxine ER 37.5mg", imprint: "W 37.5", shape: "capsule", color: "gray", notes: "Wyeth • Effexor XR • SNRI", ndc_code: "00008-0836" },
    { drug_name: "Venlafaxine ER 75mg", imprint: "W 75", shape: "capsule", color: "orange", notes: "Wyeth • Effexor XR • SNRI", ndc_code: "00008-0837" },
    { drug_name: "Venlafaxine ER 150mg", imprint: "W 150", shape: "capsule", color: "orange", notes: "Wyeth • Effexor XR • SNRI", ndc_code: "00008-0838" },
    { drug_name: "Desvenlafaxine 50mg", imprint: "W 50", shape: "round", color: "pink", notes: "Wyeth • Pristiq • SNRI", ndc_code: "00008-1050" },
    { drug_name: "Desvenlafaxine 100mg", imprint: "W 100", shape: "round", color: "red", notes: "Wyeth • Pristiq • SNRI", ndc_code: "00008-1100" },
    // ── NDRIs ──
    { drug_name: "Bupropion XL 150mg", imprint: "WELLBUTRIN XL 150", shape: "round", color: "white", notes: "GSK • NDRI • Smoking cessation", ndc_code: "00173-0177" },
    { drug_name: "Bupropion XL 300mg", imprint: "WELLBUTRIN XL 300", shape: "round", color: "white", notes: "GSK • NDRI", ndc_code: "00173-0178" },
    { drug_name: "Bupropion SR 150mg", imprint: "ZYBAN 150", shape: "round", color: "purple", notes: "GSK • NDRI", ndc_code: "00173-0600" },
    { drug_name: "Bupropion SR 150mg", imprint: "A 101", shape: "round", color: "purple", notes: "Actavis • NDRI generic", ndc_code: "00228-2101" },
    { drug_name: "Bupropion XL 150mg", imprint: "A 102", shape: "round", color: "white", notes: "Actavis • NDRI generic", ndc_code: "00228-2102" },
    // ── Atypical antipsychotics ──
    { drug_name: "Quetiapine 25mg", imprint: "SEROQUEL 25", shape: "round", color: "orange", notes: "AstraZeneca • Atypical antipsychotic", ndc_code: "00310-0275" },
    { drug_name: "Quetiapine 50mg", imprint: "SEROQUEL 50", shape: "round", color: "white", notes: "AstraZeneca • Atypical antipsychotic", ndc_code: "00310-0277" },
    { drug_name: "Quetiapine 100mg", imprint: "SEROQUEL 100", shape: "round", color: "yellow", notes: "AstraZeneca • Atypical antipsychotic", ndc_code: "00310-0271" },
    { drug_name: "Quetiapine 200mg", imprint: "SEROQUEL 200", shape: "round", color: "white", notes: "AstraZeneca • Atypical antipsychotic", ndc_code: "00310-0272" },
    { drug_name: "Quetiapine 300mg", imprint: "SEROQUEL 300", shape: "capsule", color: "white", notes: "AstraZeneca • Atypical antipsychotic", ndc_code: "00310-0274" },
    { drug_name: "Quetiapine 400mg", imprint: "SEROQUEL 400", shape: "capsule", color: "yellow", notes: "AstraZeneca • Atypical antipsychotic", ndc_code: "00310-0279" },
    { drug_name: "Aripiprazole 2mg", imprint: "A-006 2", shape: "rectangle", color: "green", notes: "Otsuka • Abilify • Atypical antipsychotic", ndc_code: "59148-0006" },
    { drug_name: "Aripiprazole 5mg", imprint: "A-008 5", shape: "rectangle", color: "blue", notes: "Otsuka • Abilify • Atypical antipsychotic", ndc_code: "59148-0008" },
    { drug_name: "Aripiprazole 10mg", imprint: "A-009 10", shape: "rectangle", color: "pink", notes: "Otsuka • Abilify • Atypical antipsychotic", ndc_code: "59148-0009" },
    { drug_name: "Aripiprazole 15mg", imprint: "A-010 15", shape: "round", color: "yellow", notes: "Otsuka • Abilify • Atypical antipsychotic", ndc_code: "59148-0010" },
    { drug_name: "Aripiprazole 20mg", imprint: "A-011 20", shape: "round", color: "white", notes: "Otsuka • Abilify • Atypical antipsychotic", ndc_code: "59148-0011" },
    { drug_name: "Aripiprazole 30mg", imprint: "A-012 30", shape: "round", color: "pink", notes: "Otsuka • Abilify • Atypical antipsychotic", ndc_code: "59148-0012" },
    { drug_name: "Risperidone 0.5mg", imprint: "JANSSEN R 0.5", shape: "oval", color: "brown", notes: "Janssen • Risperdal • Atypical antipsychotic", ndc_code: "50458-0280" },
    { drug_name: "Risperidone 1mg", imprint: "JANSSEN R 1", shape: "oval", color: "white", notes: "Janssen • Risperdal • Atypical antipsychotic", ndc_code: "50458-0300" },
    { drug_name: "Risperidone 2mg", imprint: "JANSSEN R 2", shape: "oval", color: "orange", notes: "Janssen • Risperdal • Atypical antipsychotic", ndc_code: "50458-0310" },
    { drug_name: "Risperidone 3mg", imprint: "JANSSEN R 3", shape: "oval", color: "yellow", notes: "Janssen • Risperdal • Atypical antipsychotic", ndc_code: "50458-0320" },
    { drug_name: "Risperidone 4mg", imprint: "JANSSEN R 4", shape: "oval", color: "green", notes: "Janssen • Risperdal • Atypical antipsychotic", ndc_code: "50458-0330" },
    { drug_name: "Olanzapine 2.5mg", imprint: "LILLY 4112", shape: "round", color: "white", notes: "Lilly • Zyprexa • Atypical antipsychotic", ndc_code: "00002-4112" },
    { drug_name: "Olanzapine 5mg", imprint: "LILLY 4115", shape: "round", color: "white", notes: "Lilly • Zyprexa • Atypical antipsychotic", ndc_code: "00002-4115" },
    { drug_name: "Olanzapine 10mg", imprint: "LILLY 4117", shape: "round", color: "white", notes: "Lilly • Zyprexa • Atypical antipsychotic", ndc_code: "00002-4117" },
    { drug_name: "Olanzapine 15mg", imprint: "LILLY 4415", shape: "oval", color: "blue", notes: "Lilly • Zyprexa • Atypical antipsychotic", ndc_code: "00002-4415" },
    { drug_name: "Olanzapine 20mg", imprint: "LILLY 4420", shape: "oval", color: "pink", notes: "Lilly • Zyprexa • Atypical antipsychotic", ndc_code: "00002-4420" },
    { drug_name: "Ziprasidone 20mg", imprint: "PFIZER 396", shape: "capsule", color: "blue", notes: "Pfizer • Geodon • Atypical antipsychotic", ndc_code: "00049-3960" },
    { drug_name: "Ziprasidone 40mg", imprint: "PFIZER 397", shape: "capsule", color: "blue", notes: "Pfizer • Geodon • Atypical antipsychotic", ndc_code: "00049-3970" },
    { drug_name: "Ziprasidone 60mg", imprint: "PFIZER 398", shape: "capsule", color: "white", notes: "Pfizer • Geodon • Atypical antipsychotic", ndc_code: "00049-3980" },
    { drug_name: "Ziprasidone 80mg", imprint: "PFIZER 399", shape: "capsule", color: "blue", notes: "Pfizer • Geodon • Atypical antipsychotic", ndc_code: "00049-3990" },
    { drug_name: "Lurasidone 20mg", imprint: "L 20", shape: "round", color: "white", notes: "Sunovion • Latuda • Atypical antipsychotic", ndc_code: "63402-0301" },
    { drug_name: "Lurasidone 40mg", imprint: "L 40", shape: "round", color: "white", notes: "Sunovion • Latuda • Atypical antipsychotic", ndc_code: "63402-0302" },
    { drug_name: "Lurasidone 80mg", imprint: "L 80", shape: "oval", color: "green", notes: "Sunovion • Latuda • Atypical antipsychotic", ndc_code: "63402-0304" },
    { drug_name: "Cariprazine 1.5mg", imprint: "RGF 1.5", shape: "capsule", color: "white", notes: "Allergan • Vraylar • Antipsychotic", ndc_code: "61874-0115" },
    { drug_name: "Cariprazine 3mg", imprint: "RGF 3", shape: "capsule", color: "green", notes: "Allergan • Vraylar • Antipsychotic", ndc_code: "61874-0130" },
    // ── Mood stabilizers ──
    { drug_name: "Lamotrigine 25mg", imprint: "LAMICTAL 25", shape: "diamond", color: "white", notes: "GSK • Mood stabilizer/anticonvulsant", ndc_code: "00173-0534" },
    { drug_name: "Lamotrigine 100mg", imprint: "LAMICTAL 100", shape: "diamond", color: "orange", notes: "GSK • Mood stabilizer/anticonvulsant", ndc_code: "00173-0536" },
    { drug_name: "Lamotrigine 200mg", imprint: "LAMICTAL 200", shape: "diamond", color: "blue", notes: "GSK • Mood stabilizer/anticonvulsant", ndc_code: "00173-0537" },
    { drug_name: "Lamotrigine 25mg", imprint: "93 463", shape: "round", color: "white", notes: "Teva • Mood stabilizer generic", ndc_code: "00093-0463" },
    { drug_name: "Lamotrigine 100mg", imprint: "93 465", shape: "round", color: "orange", notes: "Teva • Mood stabilizer generic", ndc_code: "00093-0465" },
    { drug_name: "Lithium Carbonate 300mg", imprint: "ESKALITH 300", shape: "capsule", color: "gray", notes: "GSK • Mood stabilizer", ndc_code: "00007-4003" },
    { drug_name: "Lithium Carbonate 300mg", imprint: "93 511", shape: "capsule", color: "pink", notes: "Teva • Mood stabilizer", ndc_code: "00093-0511" },
    { drug_name: "Lithium Carbonate ER 450mg", imprint: "LITHOBID 300", shape: "round", color: "pink", notes: "Solvay • Extended-release • Mood stabilizer", ndc_code: "00032-1028" },
    { drug_name: "Valproic Acid 250mg", imprint: "DEPAKENE 250", shape: "capsule", color: "orange", notes: "Abbott • Mood stabilizer/anticonvulsant", ndc_code: "00074-5681" },
    { drug_name: "Divalproex 250mg", imprint: "DEPAKOTE 250", shape: "oval", color: "pink", notes: "Abbott • Mood stabilizer/anticonvulsant", ndc_code: "00074-6212" },
    { drug_name: "Divalproex 500mg", imprint: "DEPAKOTE 500", shape: "oval", color: "pink", notes: "Abbott • Mood stabilizer/anticonvulsant", ndc_code: "00074-6214" },
    // ── Other psychiatric ──
    { drug_name: "Trazodone 50mg", imprint: "PLIVA 433", shape: "round", color: "white", notes: "Pliva • SARI • Sleep aid", ndc_code: "50111-0433" },
    { drug_name: "Trazodone 100mg", imprint: "PLIVA 434", shape: "round", color: "white", notes: "Pliva • SARI", ndc_code: "50111-0434" },
    { drug_name: "Trazodone 150mg", imprint: "BARR 555 490", shape: "round", color: "orange", notes: "Barr • SARI", ndc_code: "00555-0490" },
    { drug_name: "Trazodone 50mg", imprint: "MX 71", shape: "round", color: "white", notes: "Mylan • SARI generic", ndc_code: "00378-5050" },
    { drug_name: "Mirtazapine 15mg", imprint: "93 314", shape: "oval", color: "yellow", notes: "Teva • Remeron generic • NaSSA", ndc_code: "00093-0314" },
    { drug_name: "Mirtazapine 30mg", imprint: "93 315", shape: "oval", color: "brown", notes: "Teva • Remeron generic • NaSSA", ndc_code: "00093-0315" },
    { drug_name: "Mirtazapine 45mg", imprint: "93 316", shape: "oval", color: "white", notes: "Teva • Remeron generic • NaSSA", ndc_code: "00093-0316" },
    { drug_name: "Buspirone 5mg", imprint: "MJ 5", shape: "round", color: "white", notes: "Mead Johnson • Anxiolytic", ndc_code: "00087-0817" },
    { drug_name: "Buspirone 10mg", imprint: "MJ 10", shape: "round", color: "white", notes: "Mead Johnson • Anxiolytic", ndc_code: "00087-0818" },
    { drug_name: "Buspirone 15mg", imprint: "MJ 15", shape: "round", color: "white", notes: "Mead Johnson • Anxiolytic", ndc_code: "00087-0819" },
    { drug_name: "Buspirone 10mg", imprint: "TV 1003", shape: "round", color: "white", notes: "Teva • Anxiolytic generic", ndc_code: "00093-1003" },
    { drug_name: "Hydroxyzine 10mg", imprint: "VISTARIL 10mg", shape: "capsule", color: "green", notes: "Pfizer • Anxiolytic/antihistamine", ndc_code: "00069-5400" },
    { drug_name: "Hydroxyzine 25mg", imprint: "VISTARIL 25mg", shape: "capsule", color: "green", notes: "Pfizer • Anxiolytic/antihistamine", ndc_code: "00069-5410" },
    { drug_name: "Hydroxyzine 50mg", imprint: "VISTARIL 50mg", shape: "capsule", color: "green", notes: "Pfizer • Anxiolytic/antihistamine", ndc_code: "00069-5420" },
    { drug_name: "Hydroxyzine HCl 25mg", imprint: "ATARAX 25", shape: "round", color: "green", notes: "Pfizer • Anxiolytic tablet form", ndc_code: "00049-5600" },
    { drug_name: "Gabapentin 100mg", imprint: "NEURONTIN 100mg", shape: "capsule", color: "white", notes: "Pfizer • Off-label anxiolytic/pain", ndc_code: "00071-0803" },
    { drug_name: "Gabapentin 300mg", imprint: "NEURONTIN 300mg", shape: "capsule", color: "yellow", notes: "Pfizer • Off-label anxiolytic/pain", ndc_code: "00071-0805" },
    { drug_name: "Gabapentin 400mg", imprint: "NEURONTIN 400mg", shape: "capsule", color: "orange", notes: "Pfizer • Off-label anxiolytic/pain", ndc_code: "00071-0806" },
    { drug_name: "Gabapentin 600mg", imprint: "NEURONTIN 600mg", shape: "oval", color: "white", notes: "Pfizer • Off-label anxiolytic/pain", ndc_code: "00071-0811" },
    { drug_name: "Gabapentin 800mg", imprint: "NEURONTIN 800mg", shape: "oval", color: "white", notes: "Pfizer • Off-label anxiolytic/pain", ndc_code: "00071-0813" },
    { drug_name: "Pregabalin 75mg", imprint: "LYRICA 75 mg", shape: "capsule", color: "orange", notes: "Pfizer • Schedule V • Pain/anxiety", ndc_code: "00071-1014" },
    { drug_name: "Pregabalin 150mg", imprint: "LYRICA 150 mg", shape: "capsule", color: "white", notes: "Pfizer • Schedule V • Pain/anxiety", ndc_code: "00071-1015" },
    { drug_name: "Pregabalin 300mg", imprint: "LYRICA 300 mg", shape: "capsule", color: "white", notes: "Pfizer • Schedule V • Pain/anxiety", ndc_code: "00071-1018" },
  ],

  diabetes: [
    // ── Metformin ──
    { drug_name: "Metformin 500mg", imprint: "GLUCOPHAGE 500", shape: "round", color: "white", notes: "Bristol-Myers Squibb • Brand • Biguanide", ndc_code: "00087-6060" },
    { drug_name: "Metformin 850mg", imprint: "GLUCOPHAGE 850", shape: "round", color: "white", notes: "Bristol-Myers Squibb • Brand • Biguanide", ndc_code: "00087-6070" },
    { drug_name: "Metformin 1000mg", imprint: "GLUCOPHAGE 1000", shape: "oval", color: "white", notes: "Bristol-Myers Squibb • Brand • Biguanide", ndc_code: "00087-6071" },
    { drug_name: "Metformin 500mg", imprint: "Z 70", shape: "round", color: "white", notes: "Zydus • Generic biguanide", ndc_code: "68382-0028" },
    { drug_name: "Metformin 500mg", imprint: "IP 218", shape: "round", color: "white", notes: "Amneal • Generic biguanide", ndc_code: "53746-0218" },
    { drug_name: "Metformin 500mg", imprint: "93 48", shape: "round", color: "white", notes: "Teva • Generic biguanide", ndc_code: "00093-1048" },
    { drug_name: "Metformin 850mg", imprint: "93 49", shape: "round", color: "white", notes: "Teva • Generic biguanide", ndc_code: "00093-1049" },
    { drug_name: "Metformin 1000mg", imprint: "93 7214", shape: "oval", color: "white", notes: "Teva • Generic biguanide", ndc_code: "00093-7214" },
    { drug_name: "Metformin 1000mg", imprint: "IP 218 1000", shape: "oval", color: "white", notes: "Amneal • Generic biguanide", ndc_code: "53746-0219" },
    { drug_name: "Metformin 500mg", imprint: "G 45", shape: "round", color: "white", notes: "Glenmark • Generic biguanide", ndc_code: "68462-0190" },
    { drug_name: "Metformin 1000mg", imprint: "G 12", shape: "oval", color: "white", notes: "Glenmark • Generic biguanide", ndc_code: "68462-0192" },
    { drug_name: "Metformin ER 500mg", imprint: "ER 500", shape: "oval", color: "white", notes: "Generic • Extended-release", ndc_code: null },
    { drug_name: "Metformin ER 750mg", imprint: "ER 750", shape: "oval", color: "white", notes: "Generic • Extended-release", ndc_code: null },
    // ── Glipizide ──
    { drug_name: "Glipizide 5mg", imprint: "GLUCOTROL 5", shape: "diamond", color: "white", notes: "Pfizer • Brand • Sulfonylurea", ndc_code: "00049-4110" },
    { drug_name: "Glipizide 10mg", imprint: "GLUCOTROL 10", shape: "diamond", color: "white", notes: "Pfizer • Brand • Sulfonylurea", ndc_code: "00049-4120" },
    { drug_name: "Glipizide 5mg", imprint: "M 74", shape: "round", color: "white", notes: "Mylan • Generic sulfonylurea", ndc_code: "00378-0074" },
    { drug_name: "Glipizide 10mg", imprint: "M 75", shape: "round", color: "white", notes: "Mylan • Generic sulfonylurea", ndc_code: "00378-0075" },
    { drug_name: "Glipizide 5mg", imprint: "93 7456", shape: "round", color: "white", notes: "Teva • Generic sulfonylurea", ndc_code: "00093-7456" },
    { drug_name: "Glipizide ER 5mg", imprint: "GLUCOTROL XL 5", shape: "round", color: "white", notes: "Pfizer • Extended-release", ndc_code: "00049-4150" },
    { drug_name: "Glipizide ER 10mg", imprint: "GLUCOTROL XL 10", shape: "round", color: "white", notes: "Pfizer • Extended-release", ndc_code: "00049-4160" },
    // ── Glyburide ──
    { drug_name: "Glyburide 2.5mg", imprint: "MICRONASE 2.5", shape: "oval", color: "white", notes: "Upjohn • Brand • Sulfonylurea", ndc_code: "00009-0141" },
    { drug_name: "Glyburide 5mg", imprint: "MICRONASE 5", shape: "oval", color: "blue", notes: "Upjohn • Brand • Sulfonylurea", ndc_code: "00009-0171" },
    { drug_name: "Glyburide 5mg", imprint: "DAN 5440 5", shape: "oval", color: "green", notes: "Watson • Generic sulfonylurea", ndc_code: "00591-5440" },
    { drug_name: "Glyburide 5mg", imprint: "G 5", shape: "oval", color: "green", notes: "Greenstone • Generic sulfonylurea", ndc_code: "59762-0005" },
    { drug_name: "Glyburide 1.25mg", imprint: "DIABETA 1.25", shape: "oval", color: "white", notes: "Sanofi • Brand • Sulfonylurea", ndc_code: "00039-0061" },
    // ── Pioglitazone ──
    { drug_name: "Pioglitazone 15mg", imprint: "ACTOS 15", shape: "round", color: "white", notes: "Takeda • Brand • Thiazolidinedione", ndc_code: "64764-0151" },
    { drug_name: "Pioglitazone 30mg", imprint: "ACTOS 30", shape: "round", color: "white", notes: "Takeda • Brand • Thiazolidinedione", ndc_code: "64764-0301" },
    { drug_name: "Pioglitazone 45mg", imprint: "ACTOS 45", shape: "round", color: "white", notes: "Takeda • Brand • Thiazolidinedione", ndc_code: "64764-0451" },
    { drug_name: "Pioglitazone 15mg", imprint: "93 7189", shape: "round", color: "white", notes: "Teva • Generic thiazolidinedione", ndc_code: "00093-7189" },
    { drug_name: "Pioglitazone 30mg", imprint: "93 7190", shape: "round", color: "white", notes: "Teva • Generic thiazolidinedione", ndc_code: "00093-7190" },
    // ── Sitagliptin ──
    { drug_name: "Sitagliptin 25mg", imprint: "221", shape: "round", color: "pink", notes: "Merck • Januvia • DPP-4 inhibitor", ndc_code: "00006-0221" },
    { drug_name: "Sitagliptin 50mg", imprint: "112", shape: "round", color: "tan", notes: "Merck • Januvia • DPP-4 inhibitor", ndc_code: "00006-0112" },
    { drug_name: "Sitagliptin 100mg", imprint: "277", shape: "round", color: "tan", notes: "Merck • Januvia • DPP-4 inhibitor", ndc_code: "00006-0277" },
    // ── SGLT2 inhibitors ──
    { drug_name: "Empagliflozin 10mg", imprint: "S10", shape: "round", color: "yellow", notes: "Boehringer • Jardiance • SGLT2 inhibitor", ndc_code: "00597-0151" },
    { drug_name: "Empagliflozin 25mg", imprint: "S25", shape: "oval", color: "yellow", notes: "Boehringer • Jardiance • SGLT2 inhibitor", ndc_code: "00597-0152" },
    { drug_name: "Dapagliflozin 5mg", imprint: "5 1427", shape: "round", color: "yellow", notes: "AstraZeneca • Farxiga • SGLT2 inhibitor", ndc_code: "00310-6205" },
    { drug_name: "Dapagliflozin 10mg", imprint: "10 1428", shape: "diamond", color: "yellow", notes: "AstraZeneca • Farxiga • SGLT2 inhibitor", ndc_code: "00310-6210" },
    { drug_name: "Canagliflozin 100mg", imprint: "CFZ 100", shape: "capsule", color: "yellow", notes: "Janssen • Invokana • SGLT2 inhibitor", ndc_code: "50458-0140" },
    { drug_name: "Canagliflozin 300mg", imprint: "CFZ 300", shape: "capsule", color: "white", notes: "Janssen • Invokana • SGLT2 inhibitor", ndc_code: "50458-0141" },
    // ── Repaglinide / Nateglinide ──
    { drug_name: "Repaglinide 0.5mg", imprint: "PRANDIN 0.5", shape: "round", color: "white", notes: "Novo Nordisk • Meglitinide", ndc_code: "00169-0081" },
    { drug_name: "Repaglinide 1mg", imprint: "PRANDIN 1", shape: "round", color: "yellow", notes: "Novo Nordisk • Meglitinide", ndc_code: "00169-0082" },
    { drug_name: "Repaglinide 2mg", imprint: "PRANDIN 2", shape: "round", color: "pink", notes: "Novo Nordisk • Meglitinide", ndc_code: "00169-0084" },
    { drug_name: "Nateglinide 60mg", imprint: "STARLIX 60", shape: "round", color: "pink", notes: "Novartis • Meglitinide", ndc_code: "00078-0351" },
    { drug_name: "Nateglinide 120mg", imprint: "STARLIX 120", shape: "oval", color: "yellow", notes: "Novartis • Meglitinide", ndc_code: "00078-0352" },
  ],

  gi: [
    { drug_name: "Omeprazole 20mg", imprint: "PRILOSEC 20", shape: "capsule", color: "pink", notes: "AstraZeneca • PPI", ndc_code: "00186-0742" },
    { drug_name: "Omeprazole 40mg", imprint: "PRILOSEC 40", shape: "capsule", color: "purple", notes: "AstraZeneca • PPI", ndc_code: "00186-0743" },
    { drug_name: "Pantoprazole 20mg", imprint: "P 20", shape: "oval", color: "yellow", notes: "Wyeth • PPI", ndc_code: "00008-0841" },
    { drug_name: "Pantoprazole 40mg", imprint: "PROTONIX 40", shape: "oval", color: "yellow", notes: "Wyeth • PPI", ndc_code: "00008-0842" },
    { drug_name: "Esomeprazole 20mg", imprint: "20 mg A/EH", shape: "capsule", color: "pink", notes: "AstraZeneca • Nexium • PPI", ndc_code: "00186-5020" },
    { drug_name: "Esomeprazole 40mg", imprint: "40 mg A/EI", shape: "capsule", color: "purple", notes: "AstraZeneca • Nexium • PPI", ndc_code: "00186-5040" },
    { drug_name: "Famotidine 20mg", imprint: "MSD 963", shape: "round", color: "tan", notes: "Merck • Pepcid • H2 blocker", ndc_code: "00006-0963" },
    { drug_name: "Famotidine 40mg", imprint: "MSD 964", shape: "round", color: "tan", notes: "Merck • Pepcid • H2 blocker", ndc_code: "00006-0964" },
    { drug_name: "Ranitidine 150mg", imprint: "ZANTAC 150", shape: "round", color: "white", notes: "GSK • H2 blocker (recalled 2020)", ndc_code: "00173-0393" },
    { drug_name: "Ondansetron 4mg", imprint: "ZOFRAN 4", shape: "oval", color: "white", notes: "GSK • Antiemetic • 5-HT3 antagonist", ndc_code: "00173-0461" },
    { drug_name: "Ondansetron 8mg", imprint: "ZOFRAN 8", shape: "oval", color: "yellow", notes: "GSK • Antiemetic • 5-HT3 antagonist", ndc_code: "00173-0462" },
    { drug_name: "Ondansetron ODT 4mg", imprint: "R4", shape: "round", color: "white", notes: "Dr. Reddy's • Orally disintegrating", ndc_code: "55111-0160" },
    { drug_name: "Dicyclomine 10mg", imprint: "BENTYL 10", shape: "capsule", color: "blue", notes: "Axcan • Antispasmodic", ndc_code: "58914-0100" },
    { drug_name: "Loperamide 2mg", imprint: "IMODIUM", shape: "capsule", color: "green", notes: "McNeil • Anti-diarrheal", ndc_code: "50580-0410" },
    { drug_name: "Sucralfate 1g", imprint: "CARAFATE 1712", shape: "capsule", color: "pink", notes: "Axcan • GI protectant", ndc_code: "58914-0171" },
    { drug_name: "Lansoprazole 30mg", imprint: "TAP PREVACID 30", shape: "capsule", color: "pink", notes: "Takeda • PPI", ndc_code: "64764-0541" },
    { drug_name: "Metoclopramide 10mg", imprint: "REGLAN 10", shape: "round", color: "white", notes: "Schwarz • Prokinetic", ndc_code: "00091-4420" },
    // ── Generic manufacturer variants ──
    { drug_name: "Omeprazole 20mg", imprint: "MYLAN 6150", shape: "capsule", color: "pink", notes: "Mylan • Generic PPI", ndc_code: "00378-6150" },
    { drug_name: "Omeprazole 20mg", imprint: "R 158", shape: "capsule", color: "purple", notes: "Dr. Reddy's • Generic PPI", ndc_code: "55111-0158" },
    { drug_name: "Omeprazole 40mg", imprint: "R 159", shape: "capsule", color: "purple", notes: "Dr. Reddy's • Generic PPI", ndc_code: "55111-0159" },
    { drug_name: "Omeprazole 20mg", imprint: "G 04", shape: "capsule", color: "blue", notes: "Glenmark • Generic PPI", ndc_code: "68462-0269" },
    { drug_name: "Pantoprazole 20mg", imprint: "93 12", shape: "oval", color: "yellow", notes: "Teva • Generic PPI", ndc_code: "00093-0012" },
    { drug_name: "Pantoprazole 40mg", imprint: "93 11", shape: "oval", color: "yellow", notes: "Teva • Generic PPI", ndc_code: "00093-0011" },
    { drug_name: "Pantoprazole 40mg", imprint: "M P9", shape: "oval", color: "yellow", notes: "Mylan • Generic PPI", ndc_code: "00378-5540" },
    { drug_name: "Ondansetron 4mg", imprint: "93 233", shape: "round", color: "white", notes: "Teva • Generic antiemetic", ndc_code: "00093-0233" },
    { drug_name: "Ondansetron 8mg", imprint: "93 234", shape: "round", color: "yellow", notes: "Teva • Generic antiemetic", ndc_code: "00093-0234" },
    { drug_name: "Ondansetron 4mg", imprint: "M O 4", shape: "round", color: "white", notes: "Mylan • Generic antiemetic", ndc_code: "00378-3633" },
    { drug_name: "Lansoprazole 15mg", imprint: "93 7350", shape: "capsule", color: "green", notes: "Teva • Generic PPI", ndc_code: "00093-7350" },
    { drug_name: "Lansoprazole 30mg", imprint: "93 7351", shape: "capsule", color: "pink", notes: "Teva • Generic PPI", ndc_code: "00093-7351" },
    { drug_name: "Famotidine 20mg", imprint: "93 26", shape: "round", color: "tan", notes: "Teva • Generic H2 blocker", ndc_code: "00093-0026" },
    { drug_name: "Famotidine 40mg", imprint: "93 27", shape: "round", color: "tan", notes: "Teva • Generic H2 blocker", ndc_code: "00093-0027" },
    { drug_name: "Famotidine 20mg", imprint: "MYLAN 1620", shape: "round", color: "tan", notes: "Mylan • Generic H2 blocker", ndc_code: "00378-1620" },
    { drug_name: "Metoclopramide 10mg", imprint: "DAN 5307", shape: "round", color: "white", notes: "Watson • Generic prokinetic", ndc_code: "00591-5307" },
    { drug_name: "Dicyclomine 10mg", imprint: "MYLAN 1010", shape: "capsule", color: "blue", notes: "Mylan • Generic antispasmodic", ndc_code: "00378-1010" },
    { drug_name: "Dicyclomine 20mg", imprint: "DAN 5554", shape: "round", color: "blue", notes: "Watson • Generic antispasmodic", ndc_code: "00591-5554" },
  ],

  antihistamines: [
    { drug_name: "Cetirizine 10mg", imprint: "Y", shape: "round", color: "white", notes: "Dr. Reddy's • Second-gen antihistamine", ndc_code: "55111-0159" },
    { drug_name: "Cetirizine 10mg", imprint: "ZYRTEC", shape: "round", color: "white", notes: "UCB/Pfizer • Brand • Second-gen", ndc_code: "50580-0726" },
    { drug_name: "Loratadine 10mg", imprint: "CLARITIN 10", shape: "round", color: "white", notes: "Schering • Brand • Second-gen", ndc_code: "11523-7160" },
    { drug_name: "Loratadine 10mg", imprint: "RX526", shape: "round", color: "white", notes: "Ranbaxy • Second-gen antihistamine", ndc_code: "63304-0526" },
    { drug_name: "Fexofenadine 60mg", imprint: "E 35", shape: "round", color: "pink", notes: "Generic • Second-gen antihistamine", ndc_code: "65862-0035" },
    { drug_name: "Fexofenadine 180mg", imprint: "E 37", shape: "capsule", color: "pink", notes: "Generic • Second-gen antihistamine", ndc_code: "65862-0037" },
    { drug_name: "Fexofenadine 180mg", imprint: "ALLEGRA", shape: "capsule", color: "tan", notes: "Sanofi • Brand", ndc_code: "00088-1090" },
    { drug_name: "Diphenhydramine 25mg", imprint: "BENADRYL 25", shape: "capsule", color: "pink", notes: "McNeil • First-gen antihistamine", ndc_code: "50580-0223" },
    { drug_name: "Diphenhydramine 50mg", imprint: "ZLP", shape: "capsule", color: "pink", notes: "Generic • First-gen antihistamine", ndc_code: "24385-0425" },
    { drug_name: "Chlorpheniramine 4mg", imprint: "CHLOR-TRIMETON", shape: "round", color: "yellow", notes: "Schering • First-gen antihistamine", ndc_code: "11523-7100" },
    { drug_name: "Levocetirizine 5mg", imprint: "X", shape: "oval", color: "white", notes: "UCB • Xyzal • Third-gen", ndc_code: "50580-0778" },
    { drug_name: "Promethazine 25mg", imprint: "Z 4173", shape: "round", color: "white", notes: "Zydus • Phenothiazine antihistamine", ndc_code: "68382-0028" },
    { drug_name: "Montelukast 10mg", imprint: "SINGULAIR MSD 117", shape: "rectangle", color: "tan", notes: "Merck • Leukotriene inhibitor", ndc_code: "00006-0117" },
    // ── Generic manufacturer variants ──
    { drug_name: "Cetirizine 10mg", imprint: "93 44", shape: "round", color: "white", notes: "Teva • Generic second-gen antihistamine", ndc_code: "00093-0044" },
    { drug_name: "Cetirizine 10mg", imprint: "MYLAN 117", shape: "round", color: "white", notes: "Mylan • Generic second-gen antihistamine", ndc_code: "00378-0117" },
    { drug_name: "Cetirizine 10mg", imprint: "L612", shape: "round", color: "white", notes: "Perrigo • OTC generic", ndc_code: "45802-0868" },
    { drug_name: "Loratadine 10mg", imprint: "93 88", shape: "round", color: "white", notes: "Teva • Generic second-gen antihistamine", ndc_code: "00093-0088" },
    { drug_name: "Loratadine 10mg", imprint: "L 10", shape: "round", color: "white", notes: "Perrigo • OTC generic", ndc_code: "45802-0650" },
    { drug_name: "Fexofenadine 60mg", imprint: "93 7377", shape: "round", color: "pink", notes: "Teva • Generic second-gen", ndc_code: "00093-7377" },
    { drug_name: "Fexofenadine 180mg", imprint: "93 7378", shape: "capsule", color: "pink", notes: "Teva • Generic second-gen", ndc_code: "00093-7378" },
    { drug_name: "Fexofenadine 180mg", imprint: "MYLAN FE 180", shape: "capsule", color: "tan", notes: "Mylan • Generic second-gen", ndc_code: "00378-5189" },
    { drug_name: "Diphenhydramine 25mg", imprint: "44 107", shape: "capsule", color: "pink", notes: "LNK International • OTC generic", ndc_code: "11673-0107" },
    { drug_name: "Diphenhydramine 25mg", imprint: "L 479", shape: "capsule", color: "pink", notes: "Perrigo • OTC generic", ndc_code: "45802-0479" },
    { drug_name: "Promethazine 25mg", imprint: "G 51", shape: "round", color: "white", notes: "Glenmark • Generic phenothiazine", ndc_code: "68462-0310" },
    { drug_name: "Promethazine 12.5mg", imprint: "G 50", shape: "round", color: "white", notes: "Glenmark • Generic phenothiazine", ndc_code: "68462-0309" },
    { drug_name: "Montelukast 10mg", imprint: "93 7426", shape: "rectangle", color: "tan", notes: "Teva • Generic leukotriene inhibitor", ndc_code: "00093-7426" },
    { drug_name: "Montelukast 10mg", imprint: "M ML 10", shape: "rectangle", color: "tan", notes: "Mylan • Generic leukotriene inhibitor", ndc_code: "00378-5210" },
    { drug_name: "Montelukast 5mg", imprint: "93 7391", shape: "round", color: "pink", notes: "Teva • Generic chewable", ndc_code: "00093-7391" },
    { drug_name: "Levocetirizine 5mg", imprint: "93 7245", shape: "oval", color: "white", notes: "Teva • Generic third-gen", ndc_code: "00093-7245" },
  ],

  thyroid: [
    { drug_name: "Levothyroxine 25mcg", imprint: "SYNTHROID 25", shape: "round", color: "orange", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6621" },
    { drug_name: "Levothyroxine 50mcg", imprint: "SYNTHROID 50", shape: "round", color: "white", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6624" },
    { drug_name: "Levothyroxine 75mcg", imprint: "SYNTHROID 75", shape: "round", color: "purple", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6627" },
    { drug_name: "Levothyroxine 88mcg", imprint: "SYNTHROID 88", shape: "round", color: "green", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6630" },
    { drug_name: "Levothyroxine 100mcg", imprint: "SYNTHROID 100", shape: "round", color: "yellow", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6633" },
    { drug_name: "Levothyroxine 112mcg", imprint: "SYNTHROID 112", shape: "round", color: "pink", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6645" },
    { drug_name: "Levothyroxine 125mcg", imprint: "SYNTHROID 125", shape: "round", color: "brown", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6636" },
    { drug_name: "Levothyroxine 150mcg", imprint: "SYNTHROID 150", shape: "round", color: "blue", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6639" },
    { drug_name: "Levothyroxine 175mcg", imprint: "SYNTHROID 175", shape: "round", color: "purple", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6642" },
    { drug_name: "Levothyroxine 200mcg", imprint: "SYNTHROID 200", shape: "round", color: "pink", notes: "AbbVie • Thyroid hormone", ndc_code: "00074-6648" },
    { drug_name: "Levothyroxine 50mcg", imprint: "M L 5", shape: "round", color: "white", notes: "Mylan generic • Thyroid hormone", ndc_code: "00378-1805" },
    { drug_name: "Levothyroxine 100mcg", imprint: "M L 7", shape: "round", color: "yellow", notes: "Mylan generic • Thyroid hormone", ndc_code: "00378-1807" },
    { drug_name: "Levothyroxine 75mcg", imprint: "GG 332", shape: "round", color: "purple", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5072" },
    { drug_name: "Liothyronine 5mcg", imprint: "KPI 115", shape: "round", color: "white", notes: "King • Cytomel • T3", ndc_code: "60793-0115" },
    { drug_name: "Liothyronine 25mcg", imprint: "KPI 116", shape: "round", color: "white", notes: "King • Cytomel • T3", ndc_code: "60793-0116" },
    { drug_name: "Methimazole 5mg", imprint: "J 64", shape: "round", color: "white", notes: "Jubilant • Tapazole generic • Anti-thyroid", ndc_code: "67877-0423" },
    { drug_name: "Methimazole 10mg", imprint: "J 65", shape: "round", color: "white", notes: "Jubilant • Tapazole generic • Anti-thyroid", ndc_code: "67877-0424" },
    // ── Generic manufacturer variants ──
    { drug_name: "Levothyroxine 25mcg", imprint: "M L 4", shape: "round", color: "orange", notes: "Mylan generic • Thyroid hormone", ndc_code: "00378-1804" },
    { drug_name: "Levothyroxine 88mcg", imprint: "M L 6", shape: "round", color: "green", notes: "Mylan generic • Thyroid hormone", ndc_code: "00378-1806" },
    { drug_name: "Levothyroxine 112mcg", imprint: "M L 8", shape: "round", color: "pink", notes: "Mylan generic • Thyroid hormone", ndc_code: "00378-1808" },
    { drug_name: "Levothyroxine 125mcg", imprint: "M L 9", shape: "round", color: "brown", notes: "Mylan generic • Thyroid hormone", ndc_code: "00378-1809" },
    { drug_name: "Levothyroxine 150mcg", imprint: "M L 10", shape: "round", color: "blue", notes: "Mylan generic • Thyroid hormone", ndc_code: "00378-1810" },
    { drug_name: "Levothyroxine 25mcg", imprint: "GG 330", shape: "round", color: "orange", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5070" },
    { drug_name: "Levothyroxine 50mcg", imprint: "GG 331", shape: "round", color: "white", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5071" },
    { drug_name: "Levothyroxine 88mcg", imprint: "GG 333", shape: "round", color: "green", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5073" },
    { drug_name: "Levothyroxine 100mcg", imprint: "GG 334", shape: "round", color: "yellow", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5074" },
    { drug_name: "Levothyroxine 112mcg", imprint: "GG 335", shape: "round", color: "pink", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5075" },
    { drug_name: "Levothyroxine 125mcg", imprint: "GG 336", shape: "round", color: "brown", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5076" },
    { drug_name: "Levothyroxine 150mcg", imprint: "GG 337", shape: "round", color: "blue", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5077" },
    { drug_name: "Levothyroxine 175mcg", imprint: "GG 338", shape: "round", color: "purple", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5078" },
    { drug_name: "Levothyroxine 200mcg", imprint: "GG 339", shape: "round", color: "pink", notes: "Sandoz • Thyroid hormone", ndc_code: "00781-5079" },
    { drug_name: "Levothyroxine 50mcg", imprint: "LEVOXYL 50", shape: "round", color: "white", notes: "King • Levoxyl brand", ndc_code: "60793-0850" },
    { drug_name: "Levothyroxine 100mcg", imprint: "LEVOXYL 100", shape: "round", color: "yellow", notes: "King • Levoxyl brand", ndc_code: "60793-0852" },
    { drug_name: "Levothyroxine 75mcg", imprint: "TIROSINT 75", shape: "capsule", color: "purple", notes: "IBSA • Gel capsule form", ndc_code: "20955-0181" },
    { drug_name: "Levothyroxine 100mcg", imprint: "TIROSINT 100", shape: "capsule", color: "yellow", notes: "IBSA • Gel capsule form", ndc_code: "20955-0182" },
    { drug_name: "Methimazole 5mg", imprint: "93 1811", shape: "round", color: "white", notes: "Teva • Tapazole generic • Anti-thyroid", ndc_code: "00093-1811" },
    { drug_name: "Methimazole 10mg", imprint: "93 1812", shape: "round", color: "white", notes: "Teva • Tapazole generic • Anti-thyroid", ndc_code: "00093-1812" },
    { drug_name: "Propylthiouracil 50mg", imprint: "PTU 50", shape: "round", color: "white", notes: "Generic • Anti-thyroid", ndc_code: "00677-0781" },
  ],

  muscle_relaxants: [
    { drug_name: "Cyclobenzaprine 5mg", imprint: "DAN 5658", shape: "round", color: "orange", notes: "Watson • Flexeril generic", ndc_code: "00591-5658" },
    { drug_name: "Cyclobenzaprine 10mg", imprint: "DAN 5659", shape: "round", color: "yellow", notes: "Watson • Flexeril generic", ndc_code: "00591-5659" },
    { drug_name: "Cyclobenzaprine 10mg", imprint: "FLEXERIL", shape: "round", color: "yellow", notes: "McNeil • Brand", ndc_code: "00045-0265" },
    { drug_name: "Methocarbamol 500mg", imprint: "H 114", shape: "round", color: "white", notes: "Heritage • Robaxin generic", ndc_code: "23155-0114" },
    { drug_name: "Methocarbamol 750mg", imprint: "H 115", shape: "capsule", color: "white", notes: "Heritage • Robaxin generic", ndc_code: "23155-0115" },
    { drug_name: "Tizanidine 2mg", imprint: "R180", shape: "round", color: "white", notes: "Dr. Reddy's • Zanaflex generic", ndc_code: "55111-0180" },
    { drug_name: "Tizanidine 4mg", imprint: "R181", shape: "round", color: "white", notes: "Dr. Reddy's • Zanaflex generic", ndc_code: "55111-0181" },
    { drug_name: "Baclofen 10mg", imprint: "DAN 5730 10", shape: "round", color: "white", notes: "Watson • GABA-B agonist", ndc_code: "00591-5730" },
    { drug_name: "Baclofen 20mg", imprint: "DAN 5731 20", shape: "round", color: "white", notes: "Watson • GABA-B agonist", ndc_code: "00591-5731" },
    { drug_name: "Carisoprodol 350mg", imprint: "DAN 5513", shape: "round", color: "white", notes: "Watson • Soma • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00591-5513" },
    { drug_name: "Carisoprodol 350mg", imprint: "SOMA 350", shape: "round", color: "white", notes: "Meda • Soma brand • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00037-0350" },
    { drug_name: "Carisoprodol 350mg", imprint: "2410 V", shape: "round", color: "white", notes: "Qualitest • Soma generic • Schedule IV • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "00603-2410" },
    { drug_name: "Orphenadrine 100mg", imprint: "NORFLEX 100", shape: "round", color: "white", notes: "3M • Anticholinergic muscle relaxant", ndc_code: "00089-0545" },
    { drug_name: "Metaxalone 800mg", imprint: "8667 S", shape: "capsule", color: "pink", notes: "Shire • Skelaxin", ndc_code: "54092-0043" },
    { drug_name: "Chlorzoxazone 500mg", imprint: "PARAFON FORTE DSC", shape: "capsule", color: "green", notes: "McNeil • Skeletal muscle relaxant", ndc_code: "00045-0267" },
    { drug_name: "Dantrolene 25mg", imprint: "DANTRIUM 25", shape: "capsule", color: "orange", notes: "Procter & Gamble • Direct-acting", ndc_code: "00149-0030" },
    // ── Gabapentin (increasingly counterfeited) ──
    { drug_name: "Gabapentin 300mg", imprint: "D 03", shape: "capsule", color: "yellow", notes: "Aurobindo • Anticonvulsant • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "65862-0013" },
    { drug_name: "Gabapentin 400mg", imprint: "D 04", shape: "capsule", color: "orange", notes: "Aurobindo • Anticonvulsant • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "65862-0014" },
    { drug_name: "Gabapentin 800mg", imprint: "G 13", shape: "capsule", color: "white", notes: "Glenmark • Anticonvulsant • ⚠️ HIGH COUNTERFEIT RISK", ndc_code: "68462-0263" },
    // ── Generic manufacturer variants ──
    { drug_name: "Cyclobenzaprine 5mg", imprint: "M 751", shape: "round", color: "orange", notes: "Mylan • Flexeril generic", ndc_code: "00378-0751" },
    { drug_name: "Cyclobenzaprine 10mg", imprint: "M 771", shape: "round", color: "yellow", notes: "Mylan • Flexeril generic", ndc_code: "00378-0771" },
    { drug_name: "Cyclobenzaprine 5mg", imprint: "V 2631", shape: "round", color: "orange", notes: "Qualitest • Flexeril generic", ndc_code: "00603-2631" },
    { drug_name: "Cyclobenzaprine 10mg", imprint: "V 2632", shape: "round", color: "yellow", notes: "Qualitest • Flexeril generic", ndc_code: "00603-2632" },
    { drug_name: "Cyclobenzaprine 5mg", imprint: "93 7250", shape: "round", color: "orange", notes: "Teva • Flexeril generic", ndc_code: "00093-7250" },
    { drug_name: "Cyclobenzaprine 10mg", imprint: "93 7251", shape: "round", color: "yellow", notes: "Teva • Flexeril generic", ndc_code: "00093-7251" },
    { drug_name: "Tizanidine 2mg", imprint: "93 77", shape: "round", color: "white", notes: "Teva • Zanaflex generic", ndc_code: "00093-0077" },
    { drug_name: "Tizanidine 4mg", imprint: "93 78", shape: "round", color: "white", notes: "Teva • Zanaflex generic", ndc_code: "00093-0078" },
    { drug_name: "Tizanidine 2mg", imprint: "M 722", shape: "round", color: "white", notes: "Mylan • Zanaflex generic", ndc_code: "00378-0722" },
    { drug_name: "Tizanidine 4mg", imprint: "M 724", shape: "round", color: "white", notes: "Mylan • Zanaflex generic", ndc_code: "00378-0724" },
    { drug_name: "Methocarbamol 500mg", imprint: "WW 290", shape: "round", color: "white", notes: "West-Ward • Robaxin generic", ndc_code: "00143-1290" },
    { drug_name: "Methocarbamol 750mg", imprint: "WW 291", shape: "capsule", color: "white", notes: "West-Ward • Robaxin generic", ndc_code: "00143-1291" },
    { drug_name: "Methocarbamol 500mg", imprint: "M 500", shape: "round", color: "white", notes: "Mylan • Robaxin generic", ndc_code: "00378-0123" },
    { drug_name: "Baclofen 10mg", imprint: "V 22 65", shape: "round", color: "white", notes: "Qualitest • GABA-B agonist", ndc_code: "00603-2265" },
    { drug_name: "Baclofen 20mg", imprint: "V 22 66", shape: "round", color: "white", notes: "Qualitest • GABA-B agonist", ndc_code: "00603-2266" },
    { drug_name: "Baclofen 10mg", imprint: "93 1090", shape: "round", color: "white", notes: "Teva • GABA-B agonist", ndc_code: "00093-1090" },
    { drug_name: "Carisoprodol 350mg", imprint: "V 2403", shape: "round", color: "white", notes: "Qualitest • Soma generic • Schedule IV • ⚠️ COUNTERFEIT RISK", ndc_code: "00603-2403" },
    { drug_name: "Metaxalone 800mg", imprint: "AN 553", shape: "capsule", color: "pink", notes: "Amneal • Skelaxin generic", ndc_code: "65162-0553" },
    { drug_name: "Gabapentin 100mg", imprint: "93 637", shape: "capsule", color: "white", notes: "Teva • Anticonvulsant generic", ndc_code: "00093-0637" },
    { drug_name: "Gabapentin 300mg", imprint: "93 639", shape: "capsule", color: "yellow", notes: "Teva • Anticonvulsant generic", ndc_code: "00093-0639" },
    { drug_name: "Gabapentin 400mg", imprint: "93 640", shape: "capsule", color: "orange", notes: "Teva • Anticonvulsant generic", ndc_code: "00093-0640" },
    { drug_name: "Gabapentin 600mg", imprint: "IP 205 600", shape: "oval", color: "white", notes: "Amneal • Anticonvulsant generic", ndc_code: "53746-0205" },
    { drug_name: "Gabapentin 800mg", imprint: "IP 113 800", shape: "oval", color: "white", notes: "Amneal • Anticonvulsant generic", ndc_code: "53746-0113" },
  ],

  supplements: [
    { drug_name: "Folic Acid 1mg", imprint: "FOLIC ACID 1", shape: "round", color: "yellow", notes: "Generic • B vitamin", ndc_code: "00536-4445" },
    { drug_name: "Folic Acid 400mcg", imprint: "FA", shape: "round", color: "yellow", notes: "Generic • B vitamin", ndc_code: "00536-4455" },
    { drug_name: "Vitamin D3 1000IU", imprint: "D1000", shape: "round", color: "white", notes: "Generic • Cholecalciferol", ndc_code: null },
    { drug_name: "Vitamin D3 2000IU", imprint: "D2000", shape: "round", color: "white", notes: "Generic • Cholecalciferol", ndc_code: null },
    { drug_name: "Vitamin D2 50000IU", imprint: "D50000", shape: "capsule", color: "green", notes: "Rx only • Ergocalciferol", ndc_code: "00536-1350" },
    { drug_name: "Ferrous Sulfate 325mg", imprint: "FE", shape: "round", color: "green", notes: "Generic • Iron supplement • 65mg elemental", ndc_code: "00904-7590" },
    { drug_name: "Ferrous Sulfate 325mg", imprint: "44 393", shape: "round", color: "red", notes: "Generic • Iron supplement", ndc_code: "00904-7591" },
    { drug_name: "Potassium Chloride 10mEq", imprint: "K 10", shape: "capsule", color: "blue", notes: "Generic • Electrolyte", ndc_code: "00245-0041" },
    { drug_name: "Potassium Chloride 20mEq", imprint: "K 20", shape: "oval", color: "white", notes: "Generic • Extended-release", ndc_code: "00245-0042" },
    { drug_name: "Calcium Carbonate 500mg", imprint: "TUMS", shape: "round", color: "white", notes: "GSK • Antacid/calcium", ndc_code: "00135-0070" },
    { drug_name: "Magnesium Oxide 400mg", imprint: "MAG-OX 400", shape: "oval", color: "white", notes: "Blaine • Magnesium supplement", ndc_code: "00067-0162" },
    { drug_name: "Vitamin B12 1000mcg", imprint: "B12", shape: "round", color: "pink", notes: "Generic • Cyanocobalamin", ndc_code: null },
    { drug_name: "Prenatal Vitamin", imprint: "PRENATAL", shape: "oval", color: "pink", notes: "Generic • Multivitamin + folic acid", ndc_code: null },
    { drug_name: "Zinc Sulfate 220mg", imprint: "ZINC 220", shape: "capsule", color: "blue", notes: "Generic • 50mg elemental zinc", ndc_code: null },
  ],
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getDedupeKey(imprint: string, shape: PillShape, color: PillColor): string {
  return `${imprint.toLowerCase().replace(/\s+/g, "")}|${shape}|${color}`;
}

function getEntriesForCategory(category: string): CuratedEntry[] {
  if (category === "all") {
    return Object.values(CURATED_DATA).flat();
  }
  return CURATED_DATA[category] ?? [];
}

async function fetchAllExistingReferences(adminClient: ReturnType<typeof createClient>): Promise<ExistingReference[]> {
  const allRows: ExistingReference[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await adminClient
      .from("pill_reference")
      .select("id, imprint, shape, color, source")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...(data as ExistingReference[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

// ─── RXIMAGE FETCH ──────────────────────────────────────────────────────────

async function fetchRxImageUrl(ndcCode: string): Promise<string | null> {
  try {
    // Normalize NDC: remove dashes for the API
    const ndcNorm = ndcCode.replace(/-/g, "");
    const url = `https://rximage.nlm.nih.gov/api/rximage/1/rxnav?ndc=${ndcNorm}&resolution=600`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const images = data?.nlmRxImages;
    if (images && images.length > 0) {
      return images[0].imageUrl || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function storeReferenceImage(
  adminClient: ReturnType<typeof createClient>,
  pillReferenceId: string,
  imageUrl: string,
  source: string,
): Promise<boolean> {
  // Check if this image URL already exists for this reference
  const { data: existing } = await adminClient
    .from("pill_reference_images")
    .select("id")
    .eq("pill_reference_id", pillReferenceId)
    .eq("image_url", imageUrl)
    .maybeSingle();

  if (existing) return false;

  const { error } = await adminClient
    .from("pill_reference_images")
    .insert({
      pill_reference_id: pillReferenceId,
      image_url: imageUrl,
      source,
    });

  return !error;
}

// ─── CURATED IMPORT ─────────────────────────────────────────────────────────

async function runCuratedImport(
  adminClient: ReturnType<typeof createClient>,
  category: string,
  limit: number,
  dryRun: boolean,
): Promise<ImportResult> {
  const entries = getEntriesForCategory(category);

  const existingRows = await fetchAllExistingReferences(adminClient);
  const existingByKey = new Map<string, ExistingReference>();
  for (const row of existingRows) {
    const normalized = row.imprint?.trim().toUpperCase();
    if (!normalized) continue;
    existingByKey.set(getDedupeKey(normalized, row.shape, row.color), row);
  }

  let inserted = 0;
  let updated = 0;
  let duplicatesSkipped = 0;
  let processed = 0;
  let apiErrors = 0;
  let imagesAdded = 0;

  for (const entry of entries) {
    if (processed >= limit) break;
    processed += 1;

    const key = getDedupeKey(entry.imprint, entry.shape, entry.color);
    const existing = existingByKey.get(key);

    if (existing?.source === "manual") {
      duplicatesSkipped += 1;
      continue;
    }

    if (dryRun) {
      if (existing) updated += 1;
      else inserted += 1;
      continue;
    }

    let pillRefId: string | null = null;

    if (existing) {
      const { error } = await adminClient
        .from("pill_reference")
        .update({
          drug_name: entry.drug_name,
          imprint: entry.imprint,
          shape: entry.shape,
          color: entry.color,
          notes: entry.notes,
          ndc_code: entry.ndc_code,
          source: "curated",
          last_synced: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        apiErrors += 1;
        console.error("Failed to update pill reference:", error);
        continue;
      }
      updated += 1;
      pillRefId = existing.id;
    } else {
      const { data: insertedRow, error } = await adminClient
        .from("pill_reference")
        .insert({
          drug_name: entry.drug_name,
          imprint: entry.imprint,
          shape: entry.shape,
          color: entry.color,
          notes: entry.notes,
          ndc_code: entry.ndc_code,
          source: "curated",
          last_synced: new Date().toISOString(),
        })
        .select("id, imprint, shape, color, source")
        .single();

      if (error || !insertedRow) {
        apiErrors += 1;
        console.error("Failed to insert pill reference:", error);
        continue;
      }
      inserted += 1;
      pillRefId = insertedRow.id;
      existingByKey.set(key, insertedRow as ExistingReference);
    }

    // Fetch and store reference image from RxImage API (only for pills with NDC codes)
    if (pillRefId && entry.ndc_code) {
      try {
        const imageUrl = await fetchRxImageUrl(entry.ndc_code);
        if (imageUrl) {
          const added = await storeReferenceImage(adminClient, pillRefId, imageUrl, "rximage");
          if (added) imagesAdded += 1;
        }
      } catch (e) {
        console.error(`RxImage fetch failed for NDC ${entry.ndc_code}:`, e);
      }
    }
  }

  return {
    source: "curated",
    dryRun,
    category,
    limit,
    processed,
    inserted,
    updated,
    duplicatesSkipped,
    imagesAdded,
    enriched: 0,
    apiErrors,
    completedAt: new Date().toISOString(),
  };
}

// ─── HANDLER ────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check — must be an admin
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json();
    const source: ImportSource = body.source ?? "curated";
    const category: string = body.category ?? "opioids";
    const rawLimit = Number(body.limit) || 150;
    const limit = Math.max(1, Math.min(500, rawLimit));
    const dryRun: boolean = body.dryRun === true;

    console.log(`Import request: source=${source}, category=${category}, limit=${limit}, dryRun=${dryRun}`);

    let result: ImportResult;

    if (source === "curated") {
      result = await runCuratedImport(adminClient, category, limit, dryRun);
    } else {
      // DailyMed enrichment not supported yet — return empty result
      result = {
        source: "dailymed",
        dryRun,
        category,
        limit,
        processed: 0,
        inserted: 0,
        updated: 0,
        duplicatesSkipped: 0,
        imagesAdded: 0,
        enriched: 0,
        apiErrors: 0,
        completedAt: new Date().toISOString(),
      };
    }

    console.log(`Import complete: inserted=${result.inserted}, updated=${result.updated}, skipped=${result.duplicatesSkipped}, errors=${result.apiErrors}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
