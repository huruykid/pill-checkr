## Stamped: brand-to-product shipping plan

**Positioning:** the neighborhood alert system for the US drug supply. **Line:** “Check the stamp. Check the map.”

Plan only: no source, database, deployment, screenshot or App Store changes made. Treat iOS 1.0 as frozen while in App Review; put native experience changes into 1.1. This audit covers current repo code and selected live configuration, not the binary or screenshots currently submitted to Apple.

**Effort:** S = roughly 1–2 engineering days; M = 3–5; L = 1–2+ weeks. Estimates include targeted testing, but exclude provider setup, permission negotiations and Apple review time.

### Findings and proposed changes

#### 1. Area alerts as primary onboarding — Partly exists · M · Both, with native-only push
- **Current:** `WelcomeGate.tsx:99–108` makes legal acceptance primary and offers “Try it: M 30.” No area selection or notification action there. `AreaAlertsToggle.tsx` exists in `CommunityAlerts.tsx:228` and `Settings.tsx:325`, only inside native and once a state is saved. `src/lib/push.ts` handles permission, registration, subscription and notification navigation. The live 15-minute sender schedule exists.
- **Missing:** bring optional city/state selection and alert opt-in into the first-run experience, retaining legal acceptance, guest access and a visible skip. Ask for notification permission only after the person requests alerts; manual area entry must work without GPS. Handle denied permission and allow later enabling from Settings.
- **Delivery gate:** `notify-area-alerts:155–197` sends state-wide positive strips, not all alert types or city-specific changes. APNs credentials are absent from the available secret listing; production TestFlight delivery must be verified first.
- **Web:** offer “Choose my area” and the filtered feed, not a nonfunctional push button. Browser push would be separate L work, not included here. Native gets “Turn on alerts for my area” in 1.1 once delivery works.

#### 2. Homepage imprint search + first screenshot — Partly exists · M · Both + store assets
- **Current:** `Index.tsx:45–59` links to Identify and Alerts but contains no imprint field. `CheckPill.tsx:69,183,319` already accepts text and `/check?imprint=…&auto=1`. `Go.tsx:113–135` has a reusable pattern for the packet imprint form.
- **Missing:** labeled imprint search above the fold, Stamped/new line, map action, secondary camera access and blank/error/loading states. Reuse the existing check flow.
- **Screenshot:** repo `01-home.png` shows the old Pill Checkr name and a link-based homepage; `LISTING.md:21` puts Home first. Recapture the real new native home with imprint entry as image 01 for iPhone and iPad. Do not imply repo assets are the images currently in App Review, or advertise a screen absent from the submitted binary.

#### 3. Weekly “Supply Report” signup — Missing · M for signup; sending handled externally · Web + native Settings
- **Current:** no newsletter signup or sending integration found in site/Settings/functions/dependencies. Email-domain check reports no configured sender domain; available connections include no newsletter service. Existing account email is for sign-in/reset, not list consent.
- **Need:** Brevo or Mailchimp, an owned/verified sender domain, separate opted-in list, double opt-in/consent records, unsubscribe, suppression/bounce handling and an editorial owner. Never link email to checks, reports, push tokens or install identifiers.
- **Boundary:** **Lovable does not support marketing-email sending.** Weekly list delivery belongs in the dedicated provider, not Lovable’s app-email queue. Mixing them harms reputation/deliverability.
- **First version:** provider-hosted signup linked from site and guest Settings; provider handles list/confirmation. No tracking SDK. No setup or credentials requested now.
- **Gate:** `Privacy.tsx:126` says “We do not send marketing email.” Rewrite disclosures and assess App Privacy purposes first; explain sender/frequency/unsubscribe and await confirmation. Provider charges are separate.

#### 4. Confirmed / Unverified on every alert — Partly exists · M · Both + shared images
- **Current:** `ReportFoundSheet.tsx:92–94` writes `lab/strip/suspected_opioid/visual`-compatible evidence. The live `counterfeit_reports_public` view includes `evidence_tier`, but `CommunityAlerts.tsx:57` and `AlertCard` do not read/display it. Cards currently show strip status; lab cards show “Lab result,” advisories show issuer and early warnings show source, not a shared two-label model.
- **Missing:** one evidence-label rule applied to community cards, lab cards, advisory/early-warning summaries and details, map popups and exported images. Keep evidence method, test outcome and source separate from the badge.
- **Proposed mapping:** attributable `lab` → **Confirmed**; `strip` → **Unverified · reported test-strip result** unless independently validated; `suspected_opioid`, `visual`, unknown → **Unverified**. Invalid strips never support confirmation.
- **Notices:** publication is not detection confirmation. Classify underlying evidence, not issuer/severity. External notices lack a dedicated tier field; reviewed metadata is needed.
- **Meaning:** Confirmed concerns that sample/event, not another pill’s contents or safety. Broader strip confirmation needs validation criteria first.

#### 5. Instagram Story image sharing — Missing · L overall; M image/export first · Both, native handoff later
- **Current:** `ShareResultCard.tsx:53–85` shares Results text/link using browser share or clipboard. Alert cards have no share action or image generator. `package.json` has no Capacitor Share plugin or dedicated Stories integration.
- **Missing:** previewable 1080×1920 image with title, coarse area/date, source/“via,” evidence label/method and caution. Public fields only; no private notes/photos, coordinates, tokens or reporter identifiers. Include errors/cancel/download fallback.
- **Two parts:** image/file share/download first; native Stories handoff second. Direct Stories needs native integration, Meta App ID and real-device testing with Instagram installed. No tracking SDK. Web gets file sharing/download, not a promised Story composer.
- **Depends on #4/#8/source exclusion.** Bake credits/labels into pixels. No auto-posting or equating handoff with publication.

#### 6. “Log your result” after how-to — Mostly exists · S · Both
- **Current:** `TestStripLogger.tsx:127–156` already puts the how-to immediately before negative/positive/invalid logging buttons; it saves without an account. `Results.tsx:432–436` puts it below the verdict and connects successful logs to the reporting nudge. `StripGuide.tsx:104` ends its timer with “read your strip now,” but has no explicit log-result handoff. `/go?mode=test` also displays a guide without a logger.
- **Missing:** guide-end/timer-complete “Log your result” focuses existing controls. No forced timer/auto-save. Guide-only contexts continue through check/results, never fabricate a report. Preserve guest corrections, neutral negatives and invalid retries.

#### 7. “Lookouts” + coarse area test count — Missing as requested · S naming + L aggregation · Both
- **Current:** no Lookout terminology found. `CommunityAlerts.tsx:150–183` displays positive reports in seven days, calculated from a capped feed—not all tests logged. `test_strip_results` stores logs but no area. First-party `app_events_daily` has state-level `strip_logged` activity counts; `analytics.ts` obtains state from saved alert preferences, which is not necessarily where the test occurred. Repeat/corrected logs can create more rows/events.
- **Missing:** Lookouts copy without profiles/ranks/messaging. Count distinct tested checks with a valid latest result, not clicks, people or lab totals.
- **Proposed:** optional coarse area, server deduplication, public aggregates only. Start with closed monthly state-level bands; smaller areas remain H3 res 6 or coarser. Suppress sparse groups; no live increments, overlapping filters, result/imprint breakdowns or subtraction-revealing totals.
- **Gate:** approve group/contributor thresholds and cadence; test differencing. H3 alone is not anonymity. No new identities; if permitted data cannot protect contributors, widen or withhold counts. No private logs/points or absolute anonymity claim. Update policy with handling changes.

#### 8. “via [group]” source credit — Partly exists · M · Both + shared images
- **Current:** `external_sources` provides name, organization and attribution; `DataSourcesSheet.tsx:40–62` displays full credits. `CommunityAlerts.tsx:115–116` passes source names to lab cards, map popups and early warnings; `AdvisoryCard` shows issuer/original link. This is not consistent partner-group credit on each item.
- **Missing:** approved group name/attribution/link/image rights. Distinguish origin from relay/lab; “via” requires provenance, not a QR referral or presumed partnership. Unknown stays unknown. Future partner submissions need trusted provenance, not free-text credit.

#### 9. Never use alone + naloxone one tap from alerts — Partly exists · S–M · Both
- **Current:** `Layout.tsx:37` includes the emergency button across feed/map pages. `EmergencyFAB.tsx:19` includes Never Use Alone in its expanded panel, but no naloxone action. That hotline’s icon currently uses the success/green token. Modal alert details (`EarlyWarningStrip` + `Sheet`) have no local help actions; the surrounding page control is not a reliable substitute inside a modal.
- **Missing:** one tap opens guidance/hotline + naloxone information from feed/map/detail/share preview, including inside modals. Calling/navigation is a subsequent tap. Remove affected green; preserve control space. Images carry guidance, not interactive buttons.

### Two site pages
- **Plain-language privacy — Partly exists · M · New summary web-only; policy remains both.** `/privacy` already has “The short version” (`Privacy.tsx:31–54`), but not a separate summary page. Its SEO description says exact location is never stored, while the body documents optional precise storage; other anonymity statements need review against actual collection. Rewrite and verify the policy first, then publish a short companion linking to it. No stronger anonymity/legal-process claims. Current precise-point and anonymous-image purge schedules were confirmed active; this does not establish every privacy promise.
- **Fentanyl strip how-to — Partly exists · S–M · New page web-only; shared guide affects both.** `StripGuide` and `/go?mode=test` supply reusable instructions and timer. `App.tsx` has no dedicated how-to route; `/go` redirects on native. Add a searchable, cited page using the same en/es guide, strip limitations and help links, with #6’s honest logging handoff. Review instructions against the actual strip manufacturer rather than promise one universal dilution/read time.

### Recommended shipping order
1. **Release gates first:** preserve the 1.0 submission; settle evidence wording and source permissions; rewrite/verify privacy. Source metadata query confirms UNC is still enabled, while `DATA_SOURCES.md:141–144` prohibits UNC StreetSafe, derivatives and DrugsData. Public report views and counts do not filter enabled sources. Propose a separately approved exclusion fix across ingestion, public views/counts, feeds/maps, caches and new exports—not just hiding attribution. Do not fetch or reuse their samples. Shared Cloud changes affect the reviewed 1.0 too; assess that impact explicitly before applying anything.
2. **Fast product value:** #2 homepage search, #6 log handoff, standalone how-to, #9 help access, and #7 Lookouts copy. Web can ship independently; shared UI changes only reach installed native after a new bundle. Hold native and new screenshot upload for 1.1.
3. **Trust before distribution:** #4 evidence labels and #8 credit together, including map/detail coverage and allowed-source empty states. Publish the plain-language privacy companion only after the rewrite ships.
4. **Alert-first iOS 1.1:** #1 after APNs configuration and real delivery tests. Start with truthful state-area coverage; broader alert-type/city delivery is a separate expansion. Refresh screenshot 01 to the released search-first home.
5. **Share loop:** #5 image export first, direct native Story handoff second, using the same evidence/credit rules.
6. **Newsletter signup:** #3 after provider/consent/privacy decisions. Provider runs weekly publishing; signup work can proceed in parallel with phases 4–5 without entering the current submission.
7. **Area counts last:** #7 aggregate work after deduplication, privacy thresholds and disclosure approval. This is the most privacy-sensitive item, not a quick counter change.

### Technical and release checks
- Preserve permanent bundle ID, `pc_*` keys, guest access, existing legal acceptance, and web/native route separation. All new in-app copy gets en + es; no changes to the matching math.
- Backend/source exclusions require backward-compatible public shapes so the installed 1.0 is not broken. New fields should default to Unverified/unknown rather than silently assert confidence. Source exclusion remains effective even when a caller bypasses the redesigned feed.
- Before implementation, activate the requested iPhone UX audit guidance: it exists only as a draft in this checkout, with no active workspace version found. Do not execute a draft as an approved skill.
- Verify web desktop/mobile; iPhone/iPad guest onboarding, manual area/denied permissions, successful/invalid logging, modal help taps, map labels, long credits and exported images. Real-device TestFlight checks cover push and Instagram; simulator/browser tests alone cannot certify them. Follow `RELEASING.md` before any new archive.
- Outstanding external inputs: APNs credentials/delivery; newsletter provider/domain/editorial owner; Meta App ID for direct Stories; allowed partner provenance/redistribution rights; approved privacy rewrite and count safeguards. Nothing is deployed or implemented by approving the analysis alone.

