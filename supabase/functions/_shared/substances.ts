// Normalizes free-text cause-of-death / alert text into Stamped's substance
// vocabulary. Display names match the ones used by sync-nps-alerts so chips
// read the same across lab results, alerts and death records.
//
// Rules: a match is a match on the text as written by the examiner. We do not
// infer; "fentanyl analog" never becomes "Fentanyl", and "4-ANPP" (precursor)
// is kept distinct. Order = display order.

export const SUBSTANCE_PATTERNS: [string, RegExp][] = [
  ["Carfentanil", /\bcarfentanil\b/i],
  ["Fentanyl", /\bfentanyl\b(?![- ]?(?:analog|related|like))/i],
  ["Fentanyl analogs", /\b(?:para|p|ortho|o|meta|m)[- ]?fluoro(?:iso)?butyr?yl?fentanyl|\bfluorofentanyl|\bacetyl[- ]?fentanyl|\bfuranyl[- ]?fentanyl|\bcyclopropyl[- ]?fentanyl|\bmethoxyacetyl[- ]?fentanyl|\bbutyr(?:yl)?[- ]?fentanyl|\bvaleryl[- ]?fentanyl|\bmethylfentanyl|\bfentanyl[- ](?:analog|related)|\bdespropionyl[- ]?fentanyl|\bnorfentanyl\b/i],
  ["4-ANPP (fentanyl precursor)", /\b4[- ]?ANPP\b|despropionyl[- ]?fentanyl/i],
  ["Nitazenes", /nitazene|benzimidazole[- ]opioid|\bisotonitazene|\bmetonitazene|\bprotonitazene|\betonitazene|\bN-?pyrrolidino/i],
  ["Xylazine", /\bxylazine\b/i],
  ["Medetomidine", /\b(?:dex)?medetomidine\b/i],
  ["BTMPS", /\bBTMPS\b|tetramethyl-4-piperid/i],
  ["Heroin", /\bheroin\b|\b6-?(?:mono)?acetylmorphine\b|\b6-?MAM\b/i],
  ["Morphine", /\bmorphine\b/i],
  ["Oxycodone", /\boxycodone\b|\boxycontin\b|\bpercocet\b/i],
  ["Oxymorphone", /\boxymorphone\b/i],
  ["Hydrocodone", /\bhydrocodone\b/i],
  ["Hydromorphone", /\bhydromorphone\b/i],
  ["Methadone", /\bmethadone\b/i],
  ["Buprenorphine", /\bbuprenorphine\b/i],
  ["Tramadol", /\btramadol\b/i],
  ["Codeine", /\bcodeine\b/i],
  ["Cocaine", /\bcocaine\b|\bbenzoylecgonine\b|\bcrack\b/i],
  ["Methamphetamine", /\bmeth(?:yl)?amphetamine\b|\bmeth\b/i],
  ["Amphetamine", /\bamphetamine\b|\badderall\b/i],
  ["MDMA", /\bMDMA\b|\becstasy\b|\bmethylenedioxymethamphetamine\b/i],
  ["Synthetic cathinones", /cathinone|\beutylone\b|\bpentylone\b|\bbutylone\b|\bN-?ethylpentylone\b|\balpha-?PVP\b|\ba-?PVP\b|\bmethylone\b|\bPiHP\b|bath salts/i],
  ["Benzodiazepines", /\bbenzodiazepine|\balprazolam\b|\bxanax\b|\bclonazepam\b|\bdiazepam\b|\blorazepam\b|\btemazepam\b|\boxazepam\b|\bnordiazepam\b/i],
  ["Novel benzodiazepines", /\bbromazolam\b|\betizolam\b|\bclonazolam\b|\bflualprazolam\b|\bflubromazolam\b|\bphenazolam\b|\bdesalkylgidazepam\b|\bflubromazepam\b/i],
  ["Gabapentin", /\bgabapentin\b|\bpregabalin\b/i],
  ["Alcohol", /\bethanol\b|\balcohol\b|\bethyl alcohol\b/i],
  ["Diphenhydramine", /\bdiphenhydramine\b/i],
  ["Kratom (mitragynine)", /\bmitragynine\b|\bkratom\b|7-?(?:hydroxy|OH)/i],
  ["Tianeptine", /\btianeptine\b/i],
  ["PCP", /\bphencyclidine\b|\bPCP\b/i],
  ["Ketamine", /\bketamine\b/i],
  ["Cannabis / THC", /\bTHC\b|\bcannabi|\bmarijuana\b|\btetrahydrocannabinol\b/i],
  ["Synthetic cannabinoids", /synthetic cannabinoid|\bMDMB-|\bADB-|\bSGT-|\bK2\b|\bspice\b/i],
  ["Difluoroethane (inhalant)", /difluoroethane|\bDFE\b/i],
  ["Counterfeit pills", /counterfeit|fake (?:pill|tablet|oxy|percocet|xanax|adderall)|pressed pill|\bM30s?\b/i],
];

const OPIOIDS = new Set([
  "Carfentanil", "Fentanyl", "Fentanyl analogs", "Nitazenes", "Heroin", "Morphine", "Oxycodone", "Oxymorphone",
  "Hydrocodone", "Hydromorphone", "Methadone", "Buprenorphine", "Tramadol", "Codeine",
]);
const STIMULANTS = new Set(["Cocaine", "Methamphetamine", "Amphetamine", "MDMA", "Synthetic cathinones"]);

export interface SubstanceFlags {
  fentanyl: boolean;
  fentanyl_analog: boolean;
  carfentanil: boolean;
  nitazene: boolean;
  xylazine: boolean;
  medetomidine: boolean;
  any_opioid: boolean;
  stimulant: boolean;
  counterfeit_pill: boolean;
}

export function parseSubstances(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const [name, re] of SUBSTANCE_PATTERNS) {
    if (re.test(text)) out.push(name);
  }
  return out;
}

export function flagsFor(substances: string[], extra: Partial<SubstanceFlags> = {}): SubstanceFlags {
  const has = (s: string) => substances.includes(s);
  const f: SubstanceFlags = {
    fentanyl: has("Fentanyl"),
    fentanyl_analog: has("Fentanyl analogs"),
    carfentanil: has("Carfentanil"),
    nitazene: has("Nitazenes"),
    xylazine: has("Xylazine"),
    medetomidine: has("Medetomidine"),
    any_opioid: substances.some((s) => OPIOIDS.has(s)),
    stimulant: substances.some((s) => STIMULANTS.has(s)),
    counterfeit_pill: has("Counterfeit pills"),
  };
  for (const [k, v] of Object.entries(extra)) if (v === true) (f as unknown as Record<string, boolean>)[k] = true;
  if (f.fentanyl || f.fentanyl_analog || f.carfentanil || f.nitazene) f.any_opioid = true;
  return f;
}

/** Text that indicates a drug death at all (used to filter general ME archives). */
export const DRUG_DEATH_RE = /\b(?:toxicity|intoxication|overdose|poisoning|drug|opioid|opiate|fentanyl|heroin|cocaine|methamphetamine|xylazine|medetomidine|nitazene|polysubstance|mixed[- ]drug|substance)/i;

/** Severity for an alert from its text: danger when a lethal adulterant or deaths are named. */
export const ALERT_DANGER_RE = /carfentanil|fentanyl|nitazene|orphine|opioid|xylazine|medetomidine|BTMPS|fatal|overdose|death|counterfeit|spike|cluster/i;

/** Is this alert about the drug supply at all? Used to filter general HAN listings. */
export const DRUG_ALERT_RE = /\b(?:overdose|opioid|fentanyl|heroin|cocaine|methamphetamine|xylazine|medetomidine|nitazene|carfentanil|bromazolam|benzodiazepine|counterfeit (?:pill|drug|medic)|fake pill|drug supply|illicit drug|street drug|naloxone|narcan|kratom|7-?OH|tianeptine|drug checking|substance use|people who use drugs|stimulant|psychoactive|tranq)\b/i;
