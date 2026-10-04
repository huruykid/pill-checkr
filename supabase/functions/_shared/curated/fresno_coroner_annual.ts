// Fresno County Sheriff-Coroner — annual accidental overdose deaths.
//
// Fresno County publishes NO machine-readable overdose data (checked Oct 2026:
// no ArcGIS Online / Hub items, no Socrata, county and city web hosts block
// cloud runtimes). The Sheriff-Coroner posts one statistics PDF per year at
// https://www.fresnosheriff.org/coroner.html. The figures below are
// transcribed from those PDFs by hand and cross-checked between editions
// (the 2023 and 2024 reports repeat the whole 2009→ series and agree exactly;
// single + combined fentanyl deaths equal the report's own fentanyl total).
//
// Updating: when the next year's PDF appears, add its rows here, bump
// EDITION, and redeploy sync-area-stats. Keep only numbers that appear
// verbatim in a report — never interpolate.
//
// Definitions (the report's own): "ACCIDENT – OVERDOSE" coroner cases.
// "Deaths involving <drug>" = single-drug deaths where that drug was the
// cause + combined-drug deaths where it was present.

export const FRESNO_EDITION = 2024;

export const FRESNO_DOCS: Record<number, string> = {
  2023: "https://www.fresnosheriff.org/images/pdfs/2023_Coroner_Unit_Statistics_Final.pdf",
  2024: "https://www.fresnosheriff.org/images/pdfs/2024%20Coroner%20Statistics%20Final%20-%20Updated.pdf",
};

export interface CuratedAnnual {
  year: number;
  category: "all" | "fentanyl" | "methamphetamine";
  value: number;
  /** Which report edition the number was read from. */
  edition: number;
  /** The report's wording or the arithmetic behind the number. */
  note: string;
}

// Total accidental overdose deaths, 2009–2024 (2024 report, "Overdose deaths by year").
const ALL: [number, number][] = [
  [2009, 94], [2010, 98], [2011, 73], [2012, 98], [2013, 87], [2014, 131], [2015, 148], [2016, 157],
  [2017, 128], [2018, 123], [2019, 164], [2020, 254], [2021, 232], [2022, 243], [2023, 278], [2024, 263],
];

// Deaths involving fentanyl, 2017–2024 (2024 report, "Total deaths involving fentanyl").
const FENTANYL: [number, number][] = [
  [2017, 4], [2018, 2], [2019, 18], [2020, 46], [2021, 71], [2022, 104], [2023, 115], [2024, 80],
];

// Deaths involving methamphetamine: single-drug + present in combined-drug deaths.
const METH: [number, number, string][] = [
  [2023, 101 + 71, "101 of 171 single-drug deaths + present in 71 of 107 combined-drug deaths (2023 report)"],
  [2024, 119 + 53, "119 of 188 single-drug deaths + present in 53 of 75 combined-drug deaths (2024 report)"],
];

export const FRESNO_CORONER_ANNUAL: CuratedAnnual[] = [
  ...ALL.map(([year, value]): CuratedAnnual => ({
    year, value, category: "all", edition: 2024,
    note: "Accident – overdose deaths by year (2024 report; identical in the 2023 report)",
  })),
  ...FENTANYL.map(([year, value]): CuratedAnnual => ({
    year, value, category: "fentanyl", edition: 2024,
    note: "Total deaths involving fentanyl (2024 report; identical in the 2023 report)",
  })),
  ...METH.map(([year, value, note]): CuratedAnnual => ({
    year, value, category: "methamphetamine", edition: year, note,
  })),
];
