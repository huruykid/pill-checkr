## Stamped: brand-to-product shipping plan

**Positioning:** the neighborhood alert system for the US drug supply. **Line:** “Check the stamp. Check the map.”

Plan only: no source, database, deployment, screenshot or App Store changes made. Treat iOS 1.0 as frozen while in App Review; put native experience changes into 1.1. This audit covers current repo code and selected live configuration, not the binary or screenshots currently submitted to Apple.

**Effort:** S ≈ 1–2 days; M ≈ 3–5; L ≈ 1–2+ weeks, excluding external setup/review.

### Findings and proposed changes

#### 1. Area alerts as primary onboarding — Partly exists · M · Both, with native-only push
- **Current:** `WelcomeGate:99–108` has acceptance + sample check, no area step. Native `AreaAlertsToggle` appears in `CommunityAlerts:228`/`Settings:325` after a state is saved. `push.ts` handles registration/navigation; live sender schedule exists.
- **Missing:** optional manual city/state and opt-in, preserving legal acceptance/guest access/skip. Ask permission on request; handle denial/later enabling.
- **Delivery gate:** `notify-area-alerts:155–197` sends state-wide positive strips, not all alert types or city-specific changes. APNs credentials are absent from the available secret listing; production TestFlight delivery must be verified first.
- **Web:** area choice/filtered feed; browser push is separate L work. Native opt-in in 1.1 after delivery works.

#### 2. Homepage imprint search + first screenshot — Partly exists · M · Both + store assets
- **Current:** `Index:45–59` has links, no input. `CheckPill:69,183,319` supports text/deep links; `Go:113–135` supplies a form pattern.
- **Missing:** labeled imprint search above the fold, Stamped/new line, map action, secondary camera access and blank/error/loading states. Reuse the existing check flow.
- **Screenshot:** repo `01-home.png` is old Pill Checkr/link-based home; `LISTING:21` puts it first. Recapture actual new native home for iPhone/iPad 1.1; Apple’s current uploads were not verified.

#### 3. Weekly “Supply Report” signup — Missing · M for signup; sending handled externally · Web + native Settings
- **Current:** no signup/integration found; domain check shows none configured, connections no newsletter service. Account email is not list consent.
- **Need:** Brevo or Mailchimp, an owned/verified sender domain, separate opted-in list, double opt-in/consent records, unsubscribe, suppression/bounce handling and an editorial owner. Never link email to checks, reports, push tokens or install identifiers.
- **Boundary:** **Lovable does not support marketing-email sending.** Weekly list delivery belongs in the dedicated provider, not Lovable’s app-email queue. Mixing them harms reputation/deliverability.
- **First version:** provider-hosted signup linked from site and guest Settings; provider handles list/confirmation. No tracking SDK. No setup or credentials requested now.
- **Gate:** `Privacy.tsx:126` says “We do not send marketing email.” Rewrite disclosures and assess App Privacy purposes first; explain sender/frequency/unsubscribe and await confirmation. Provider charges are separate.

#### 4. Confirmed / Unverified on every alert — Partly exists · M · Both + shared images
- **Current:** `ReportFoundSheet:92–94` writes tiers; live public view exposes them, `CommunityAlerts:57`/`AlertCard` omit them. Other cards show lab/issuer/source, not binary labels.
- **Missing:** one rule for all cards/details/map popups/images, separating method/outcome/source from badge.
- **Proposed mapping:** attributable `lab` → **Confirmed**; `strip` → **Unverified · reported test-strip result** unless independently validated; `suspected_opioid`, `visual`, unknown → **Unverified**. Invalid strips never support confirmation.
- **Notices:** publication is not detection confirmation. Classify underlying evidence, not issuer/severity. External notices lack a dedicated tier field; reviewed metadata is needed.
- **Meaning:** Confirmed concerns that sample/event, not another pill’s contents or safety. Broader strip confirmation needs validation criteria first.

#### 5. Instagram Story image sharing — Missing · L overall; M image/export first · Both, native handoff later
- **Current:** `ShareResultCard:53–85` shares Results text/link, not alert images. No Share/Stories plugin in dependencies.
- **Missing:** previewable 1080×1920 image with title, coarse area/date, source/“via,” evidence label/method and caution. Public fields only; no private notes/photos, coordinates, tokens or reporter identifiers. Include errors/cancel/download fallback.
- **Two parts:** image/file share/download first; native Stories handoff second. Direct Stories needs native integration, Meta App ID and real-device testing with Instagram installed. No tracking SDK. Web gets file sharing/download, not a promised Story composer.
- **Depends on #4/#8/source exclusion.** Bake credits/labels into pixels. No auto-posting or equating handoff with publication.

#### 6. “Log your result” after how-to — Mostly exists · S · Both
- **Current:** `TestStripLogger:127–156` places guide before guest logging buttons; `Results:432–436` connects reporting nudge. `StripGuide:104` says read strip, no log handoff; `/go?mode=test` has guide alone.
- **Missing:** guide-end/timer-complete “Log your result” focuses existing controls. No forced timer/auto-save. Guide-only contexts continue through check/results, never fabricate a report. Preserve guest corrections, neutral negatives and invalid retries.

#### 7. “Lookouts” + coarse area test count — Missing as requested · S naming + L aggregation · Both
- **Current:** no Lookouts copy. `CommunityAlerts:150–183` counts capped-feed positives, not all tests. Logs lack area; state activity rollup uses alert preferences, not necessarily test location. Repeat/corrected logs can inflate counts.
- **Missing:** Lookouts copy without profiles/ranks/messaging. Count distinct tested checks with a valid latest result, not clicks, people or lab totals.
- **Proposed:** optional coarse area, server deduplication, public aggregates only. Start with closed monthly state-level bands; smaller areas remain H3 res 6 or coarser. Suppress sparse groups; no live increments, overlapping filters, result/imprint breakdowns or subtraction-revealing totals.
- **Gate:** approve group/contributor thresholds and cadence; test differencing. H3 alone is not anonymity. No new identities; if permitted data cannot protect contributors, widen or withhold counts. No private logs/points or absolute anonymity claim. Update policy with handling changes.

#### 8. “via [group]” source credit — Partly exists · M · Both + shared images
- **Current:** source metadata/`DataSourcesSheet:40–62` provide credits; `CommunityAlerts:115–116` passes names to lab/map/early warnings; `AdvisoryCard` has issuer/link. Originating-group credit is inconsistent.
- **Missing:** approved group name/attribution/link/image rights. Distinguish origin from relay/lab; “via” requires provenance, not a QR referral or presumed partnership. Unknown stays unknown. Future partner submissions need trusted provenance, not free-text credit.

#### 9. Never use alone + naloxone one tap from alerts — Partly exists · S–M · Both
- **Current:** `Layout:37` includes emergency button; `EmergencyFAB:19` has Never Use Alone after expansion, no naloxone, and a green icon. `EarlyWarningStrip` detail sheets lack local help.
- **Missing:** one tap opens guidance/hotline + naloxone information from feed/map/detail/share preview, including inside modals. Calling/navigation is a subsequent tap. Remove affected green; preserve control space. Images carry guidance, not interactive buttons.

### Two site pages
- **Plain-language privacy — Partial · M · Companion web-only; policy both.** `/privacy` has “The short version” (`Privacy.tsx:31–54`), no companion page. SEO says exact location is never stored; body permits precise opt-in storage. Review anonymity claims, rewrite/verify policy, then publish companion linking to it. Point/image purge schedules are active; not all promises were verified.
- **Strip how-to — Partial · S–M · New page web-only; guide both.** Reuse `StripGuide` and `/go?mode=test`; `App.tsx` lacks a standalone route and redirects `/go` on native. Add cited en/es page, limitations/help and #6 handoff. Validate manufacturer instructions; no universal dilution/read-time promise.

### Recommended shipping order
1. **Gates:** freeze 1.0; agree evidence/source rights; rewrite/verify privacy. Live metadata confirms UNC enabled despite `DATA_SOURCES.md:141–144` prohibiting it, derivatives and DrugsData. Public views/counts do not filter enabled sources. Separately approve exclusion across ingestion, public views/counts, feeds/maps, caches/exports—not just credits. No prohibited samples fetched for this audit. Shared Cloud changes affect reviewed 1.0; assess compatibility first.
2. **Quick value:** #2 search, #6 logging, web how-to, #9 help, #7 Lookouts copy. Web independently; native/screenshots in 1.1.
3. **Trust:** #4 labels + #8 credit, including details/maps/empty states. Privacy companion only after rewrite.
4. **iOS 1.1:** #1 after production push tests; honest state coverage, wider delivery separate. Refresh screenshot 01.
5. **Sharing:** #5 image export, then native Stories.
6. **Newsletter:** #3 after provider/consent/privacy approval; parallel with phases 4–5. Weekly publishing external.
7. **Counts last:** #7 after deduplication/privacy safeguards/disclosure approval.

### Technical and release checks
- Preserve bundle ID, `pc_*`, guest/legal access, target separation and matching math. New copy en + es. No green/“safe”/“tested clean,” numeric confidence, precision beyond H3 resolution, or stronger anonymity/“no police” promises. Retain coarser source geography.
- Preserve public shapes for installed 1.0; unknown evidence/source defaults conservatively. Exclusion must protect callers beyond the redesigned feed.
- Requested iPhone audit guidance exists only as a draft here; no active workspace version found. Activate before implementation; do not execute draft as approved guidance.
- Test web desktop/mobile and iPhone/iPad guests, manual/denied location, logging/invalid strips, modal help, labels/credits, exports and excluded-source absence. Push/Instagram need real-device TestFlight checks; follow `RELEASING.md` before archive.
- External inputs: APNs; newsletter provider/domain/editorial owner; Meta App ID; partner rights/provenance; privacy rewrite/count safeguards. No implementation or deployment performed.

