# Stamped data sources

Stamped's record of dangerous drug supplies combines four kinds of evidence.
They live in four tables and are never merged, because they mean different
things: a lab detection is not a death, a death is not a detection in today's
supply, and an EMS dispatch is not a confirmed overdose.

| Table | Evidence | Sync function | Cadence |
|---|---|---|---|
| `external_reports` | Lab results on street samples | `sync-unc-drugchecking`, `import-testri` | see notes |
| `external_deaths` | Medical examiner / coroner drug deaths | `sync-me-deaths` | daily 04:45 UTC |
| `external_incidents` | Nonfatal EMS / 911 overdose responses | `sync-od-incidents` | hourly :20 |
| `external_alerts` | Official advisories | `sync-nps-alerts`, `sync-health-alerts` | daily |
| `overdose_county_periods` | CDC provisional county death counts | `sync-cdc-overdose` | weekly |
| `overdose_area_periods` | Aggregate counts per area and period (city / ZIP / county) | `sync-area-stats` | daily 06:10 UTC |

Every row keeps the upstream payload in `raw` (minus personal fields) and a
`shape_version`, because open-data shapes drift. Every source has a row in
`external_sources` with its license and the exact attribution line the UI shows.

## Privacy contract

Nothing published is more precise than an H3 res-6 cell (~36 km²). Upstream
points are reduced in the edge function before they reach the database. No
names, case numbers, ages, sex, race, or street addresses are stored anywhere;
case numbers are SHA-256 hashed when they are the only stable upsert key.

## Live sources (wave 1, Oct 2026)

### Deaths (`external_deaths`)

| Source id | Jurisdiction | Platform | Upstream cadence | Geo | License |
|---|---|---|---|---|---|
| `cook_county_me` | Cook County, IL (Chicago) | Socrata `cjeq-bs86` | daily | point → hex | Public domain |
| `santa_clara_me` | Santa Clara County, CA | Socrata `s3fb-yrjp` | nightly | point → hex | County open data, no license field (attributed) |
| `san_diego_me` | San Diego County, CA | Socrata `jkvb-n4p7` | monthly | zip → county | County open data, PII pre-removed upstream |
| `connecticut_ocme` | Connecticut (statewide) | Socrata `rybz-nyjw` | annual | town centroid | Public domain |
| `allegheny_me` | Allegheny County, PA (Pittsburgh) | CKAN (WPRDC) | monthly | zip → county | CC0 |
| `sacramento_coroner` | Sacramento County, CA | ArcGIS FeatureServer | ~daily | zip → county | CC0 1.0 (fentanyl-related deaths only) |

Filters: manner accident/undetermined and a cause of death that names a drug
(`DRUG_DEATH_RE`), or the county's own opioid flag. Substances are parsed from
the examiner's text with `_shared/substances.ts`; Connecticut's per-drug Y/N
columns are merged in.

### Nonfatal incidents (`external_incidents`)

| Source id | Jurisdiction | Platform | Upstream cadence | Geo | License |
|---|---|---|---|---|---|
| `seattle_fire_911` | Seattle, WA | Socrata `kzjm-xkqj` | every 5 min | point → hex | Public domain |
| `cincinnati_fire_ems` | Cincinnati, OH | Socrata `vnsz-a3wp` | daily | point → hex | Public domain — **paused Oct 2026**: since Oct 2025 the feed publishes rows with no incident type, so overdose runs cannot be identified |
| `tempe_fire_opioid` | Tempe, AZ | ArcGIS FeatureServer | continuous | randomized point → hex | CC BY 4.0 |
| `baltimore_fire_naloxone` | Baltimore, MD | ArcGIS FeatureServer | monthly | zip (daily counts) | CC BY 3.0 |

### Alerts (`external_alerts`)

| Source id | Issuer | Format | Notes |
|---|---|---|---|
| `cfsre_nps_discovery` | CFSRE NPS Discovery | HTML listing | national early warning (existing) |
| `philly_pdph_han` | Philadelphia Dept. of Public Health | HTML table | dated; the densest city drug-alert stream in the US |
| `nyc_dohmh_han` | NYC DOHMH | HTML archive by year | `date_precision = 'year'` |
| `wa_doh_han` | Washington State DOH | HTML table | **also our reachable mirror of CDC HAN notices** (region `US`) |
| `baltimore_bchd_news` | Baltimore City Health Dept. | HTML cards | drug-supply items only |
| `la_county_lahan` | LA County DPH (LAHAN) | HTML rows, date in icon `alt` | relays CDC (→ `US`) and CDPH (→ `CA`) notices too |

### Aggregates (`overdose_area_periods`)

| Source id | Area | Period | Metric / categories | License |
|---|---|---|---|---|
| `sf_ocme_monthly_deaths` | San Francisco (city) | monthly, 2020→ | deaths, all drugs | ODbL (share-alike) |
| `sf_ems_overdose_911` | San Francisco (city) | weekly, 2022→ | EMS overdose-related 911 responses | PDDL |
| `la_county_zip_overdose` | LA County ZIPs | 2018–19, 2020–21 pooled | deaths: all, any opioid, fentanyl, heroin, methamphetamine, alcohol | LA County eGIS terms |

Only alerts about the drug supply are kept (`DRUG_ALERT_RE`). Titles and dates
are the issuer's own words; every row links to the original document.

### California: what is and is not available

The CDPH California Overdose Surveillance Dashboard (skylab.cdph.ca.gov/ODdash)
is an R Shiny app with no API and no open-data mirror on data.ca.gov or
data.chhs.ca.gov (searched Oct 2026: zero overdose datasets). County/ZIP
statewide numbers by drug type exist only inside it. Treat it as a data
request: opi@cdph.ca.gov. The LA County Medical Examiner publishes no
case-level open data; LA coverage is LAHAN alerts + the ZIP-level DPH layer
+ CDC county counts. Drug Checking Los Angeles (dashboard only) — ask
checkingla@proton.me for a feed.

## Hosts that block cloud runtimes

Verified from this project's database with `pg_net` (same AWS egress as the
edge functions): **cdc.gov (403), dea.gov (403), health.ny.gov (403),
fda.gov RSS (404 to non-browser clients), dhss.delaware.gov (blocked),
cdph.ca.gov (TLS error).** Do not add direct scrapers for these; they will
fail silently in production. Options: the WA DOH relay (CDC HAN, done), a
GitHub Actions runner that scrapes and POSTs to an ingest function, or
official data feeds on data.cdc.gov / api.fda.gov (openFDA works).

## Researched, not yet built (next waves)

High value, reachable, needs a parser or a schema decision:

- **CDC census-tract overdose deaths** (`data.cdc.gov/resource/4day-mt2f.json`, public domain, monthly) — sub-county heat; needs an `overdose_tract_periods` table.
- **Pennsylvania ED visits for overdose by county, quarterly** (`data.pa.gov/resource/svnp-capx.json`).
- **North Carolina DHHS county indicators CSV** (Tableau export, monthly).
- **LA County LAHAN** (`publichealth.lacounty.gov/lahan/`) and **King County alerts**, **Maryland RAD** — reachable, HTML not yet inspected (the pg_net probe hit an unrelated header bug; fetch raw HTML with a browser and write a fixture first).
- **Virginia VDH EMS substance-use incidents** (CKAN CSV) and **Orange County FL ME** (ArcGIS, geocoded but category-only).
- **openFDA drug enforcement** (`api.fda.gov/drug/enforcement.json`, CC0) filtered to counterfeit.
- **America's Poison Centers RSS**, **TX DSHS**, **WI HAN**, **SNHD** — reachable listings, low drug-specific volume.

Requires permission before any ingestion:

- **StreetCheck (Brandeis / MADDS)** — the best US per-sample drug-checking portal (MA, RI, MI, VT…), city-level. No terms published. Email madds@brandeis.edu before scraping. If granted, it belongs in `external_reports`.
- **Maryland RAD** per-jurisdiction aggregates (PDF/Tableau) — ask margaret.rybak@maryland.gov for a data export.

Do not use:

- UNC Street Drug Analysis Lab / streetsafe.supply (re-use withdrawn Sep 2026), and anything derived from it (WA ADAI drug checking, Allegheny substance monitoring dashboard).
- DrugsData / Erowid (program on hiatus; declined).
- Get Your Drugs Tested (Vancouver) — terms prohibit republication.
- ODMAP — government agencies only.

## First-run notes (Oct 3 2026)

- Run backfills one source at a time (`only`). Running Cook County together
  with other sources hit the edge-function memory limit (546
  WORKER_RESOURCE_LIMIT) after Cook's 14.7k rows had already landed.
- Cook County 14,706 · San Diego 7,936 · Allegheny 3,961 · Santa Clara 2,615 ·
  Sacramento 1,494 · Connecticut 12.9k · Seattle 1,354 · Tempe 385 ·
  Baltimore naloxone ~2.5k (13 months) · Philadelphia 19 alerts.
- ArcGIS servers cap pages at their own maxRecordCount; `arcgisAll` advances
  by rows returned, not by the requested page size (a first-run bug lost half
  of Baltimore until fixed).
- PostgREST caps any select at 1,000 rows; `loadCountyCentroids` pages.
- WPRDC (Allegheny) reloads its table monthly and reassigns `_id`; the
  upsert key is a hash of the public fields. When a key scheme changes,
  delete the source's rows and re-run `full` so the old keys do not linger.

## Adding a source

The repo ships a subagent for this: `.claude/agents/data-source-onboarder.md`.
From a Claude session in this repo, ask it to "add <source>" or "find more
sources for <state>"; it verifies reachability from the Supabase runtime and
the license first, then builds, tests, registers, deploys through Lovable,
backfills one source at a time and reports counts.

## Operating the syncs

Each function accepts `{"only":["<source_id>"],"full":true}`. `only` runs one
source; `full` ignores the incremental window (first run / backfill). A source
can be paused by setting `external_sources.enabled = false`; the function
skips it and reports `"disabled"`. Trigger manually from SQL:

```sql
select net.http_post(
  url := 'https://ptisltjfqomavvlnghcm.supabase.co/functions/v1/sync-me-deaths',
  headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon key>"}'::jsonb,
  body := '{"only":["cook_county_me"],"full":true}'::jsonb);
```

Unit tests for the parsers run offline:
`deno test --allow-read --no-npm --node-modules-dir=none supabase/functions/_shared/parsers_test.ts`
