# App Store Connect — Pill Checkr 1.0 submission package

Everything below is ready to paste into App Store Connect
(appstoreconnect.apple.com → My Apps → Pill Checkr, Apple ID 6804091193).
Screenshots are in `store-submission/ios/screenshots/`, already at exact
Apple sizes, RGB, no alpha, named in upload order.

---

## 1. Screenshots

| Slot | Folder | Size (verified) |
|---|---|---|
| iPhone 6.9" Display | `ios/screenshots/iphone-6.9/` | 1320×2868 |
| iPad 13" Display | `ios/screenshots/ipad-13/` | 2064×2752 |

Upload in filename order (01→05): Home, Results verdict + strip logging,
Check a pill, Community alerts, Education. The iPad 13" slot is a hard gate —
Add for Review is blocked while it's empty. iPhone 6.5" auto-mirrors 6.9".

Screens show sample community reports (the feed is new); this is standard
populated-state practice and every screen is the real app UI.

## 2. App Information

| Field | Value |
|---|---|
| Name | `Pill Checkr: ID & Test` |
| Subtitle | `Fentanyl Strips & Naloxone` |
| Primary category | Medical |
| Secondary category | Health & Fitness |
| Content rights | Does not contain third-party content |
| Age rating | Answers in §5 → 18+ (17+ on iOS < 26) |

## 3. Version Information (1.0)

**Promotional text** (cuttable any time, 170 max):

> Identify a pill by its imprint, see if that type is being faked near you, and log a fentanyl test strip result — no account needed.

**Description:**

```
A photo cannot detect fentanyl. A $1 test strip can.

Pill Checkr is a free harm-reduction tool that answers one question:
what is this pill stamped to be, is that type being counterfeited near
me, and how do I test it?

IDENTIFY
Type an imprint (like "M 30") or snap a photo. Pill Checkr matches it
against reference data and tells you what the pill is stamped to be —
and warns you when that imprint is a commonly counterfeited one.
It never tells you a pill is safe, because no photo can.

TEST
Clear, step-by-step instructions for fentanyl test strips. Log your
strip result in two taps — no account required.

ALERTS
Anonymous, city-level community reports. See what's being found near
you: which imprints, which drugs, which strip results. Report what you
found in under a minute and warn the next person. No GPS, no names,
no photos on public reports.

HELP, ONE TAP AWAY
Find naloxone (Narcan), fentanyl test strips, and treatment options
near you. Overdose response steps built in. Emergency help is always
one tap from every screen.

PRIVATE BY DESIGN
Works without an account. Anonymous photos are deleted after 30 days.
Location on reports is city-level by default; exact locations are
opt-in per report, never shown publicly, and hard-deleted after 30
days. Delete your account and data in-app at any time.

Pill Checkr is an educational harm-reduction tool, not medical advice
and not lab testing. It cannot confirm fentanyl and cannot guarantee
any pill's contents. If you suspect an overdose, call 911.
Guidance draws on SAMHSA and CDC harm-reduction resources.
```

**Keywords** (98/100 chars):

```
pill identifier,fentanyl,test strips,naloxone,narcan,imprint,counterfeit,harm reduction,drug check
```

**What's New (1.0):** `First release.`

| Field | Value |
|---|---|
| Support URL | https://pill-checkr.lovable.app |
| Marketing URL | https://pill-checkr.lovable.app |
| Privacy Policy URL | https://pill-checkr.lovable.app/privacy |
| Copyright | © 2026 Pill Checkr |

(Swap in pillcheckr.app URLs when the custom domain is connected.)

## 4. App Privacy (nutrition label)

Data collection answers — these mirror the actual code and the privacy
policy; do not embellish either direction.

**Contact Info → Email Address**: collected, linked to identity, App
Functionality only (optional accounts). Not used for tracking.

**Health & Fitness**: NOT collected (pill checks are not health records tied
to identity; guest checks are anonymous).

**Location → Coarse Location**: collected, NOT linked to identity, App
Functionality (city-level alerts and nearby help). Precise Location:
collected only when the user opts in per report, NOT linked to identity,
App Functionality, deleted after 30 days.

**User Content → Photos or Videos**: collected, NOT linked to identity for
guests / linked for account holders, App Functionality (pill
identification). Anonymous photos deleted after 30 days.
**User Content → Other**: community reports (imprint, drug name, city/state,
strip result), NOT linked to identity.

**Identifiers**: none for advertising. (The 24-hour salted connection-hash
for rate limiting falls under fraud prevention and is not retained.)

**Tracking**: NO data used for tracking. No ads, no data brokers.

## 5. Age rating questionnaire

- Drug, Alcohol, or Tobacco Use or References: **Frequent/Intense**
- Medical/Treatment Information: **Frequent/Intense**
- Health & wellness topics: **Yes**
- Unrestricted web access: No
- Gambling, contests: No
- User-generated content: **Yes** (community reports; moderated — hidden
  flag + admin queue; users cannot contact each other, no profiles,
  no messaging)
- Result: 18+ (17+ shown on iOS < 26)

## 6. App Review Information

**Notes for reviewer (paste as-is):**

```
Pill Checkr is a harm-reduction tool built on SAMHSA/CDC guidance. It
helps people identify what a pill is stamped to be, warns when that
imprint is commonly counterfeited, and directs users to fentanyl test
strips, naloxone, and treatment.

- The app NEVER outputs "safe" or any safety guarantee. Risk is
  categorical only: unidentified (red) or identified-but-untested
  (amber), with test-strip guidance.
- All core features work WITHOUT an account: identify, test-strip
  logging, community alerts, nearby help, history.
- To try identification, enter imprint "M 30" (round, blue) on the
  Check screen.
- Community reports are anonymous and city-level; they are moderated
  (admin hide queue) and rate-limited server-side.
- Account deletion is in-app: Settings → Delete account.
- Sign-in is email-based on iOS. (Google sign-in is web-only until
  Sign in with Apple ships.)

Demo account (optional — every feature works logged out):
  email: <CREATE BEFORE SUBMITTING>
  password: <CREATE BEFORE SUBMITTING>
```

**Contact:** your name, phone, huruydesigns@gmail.com.

## 7. Build & release settings

- Build: archive from `ios/App/App.xcodeproj`, scheme App (RELEASING.md loop;
  run the iPad dead-tap checklist first).
- Export compliance: already answered in the binary
  (`ITSAppUsesNonExemptEncryption = false`) — ASC will not ask.
- Release option: **Manually release this version** (recommended for 1.0 so
  the release moment is yours).
- Phased release: off for 1.0.

## 8. Pre-submission checklist

- [ ] privacy@pillcheckr.app mailbox exists (policy references it)
- [ ] Demo account created; credentials pasted into review notes
- [ ] iPad simulator dead-tap pass (RELEASING.md checklist)
- [ ] TestFlight pass on a real device
- [ ] Screenshots uploaded to BOTH slots (iPad 13" gates Add for Review)
- [ ] Privacy nutrition label saved (§4)
- [ ] Age rating saved (§5)
- [ ] Build attached to version 1.0
- [ ] Add for Review → Submit
