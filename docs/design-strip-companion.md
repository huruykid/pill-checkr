# Design: strip-packet companion, then "send this to someone you worry about"

Office-hours session, 2026-10-11 (YC-style, following gstack's `/office-hours` startup mode).
Status: **approved direction: A, then C.** A is built (PRs #5, #6, #7); C is built (PR #8). Remaining: the open questions at the end.

## Why

Stamped hasn't launched and has no users, so demand is a hypothesis. What the founder said:

- **Demand:** no real users yet.
- **What people do today:** they test with a strip if they happen to have one (unsure where to get it or how to read it), or they **do nothing and take it.**
- **Who needs it most:**
  - A 24-year-old who buys "M30s" from a dealer on Snapchat and keeps Narcan in his car.
  - A friend who took a bad pill and died.

**The real competitor is "do nothing."** Doing nothing costs no time, needs no phone, involves no shame and has no wait. Stamped only wins if, at the moment of decision, opening it is easier than not.

**The user is someone who knows the risk but doesn't test.** They know pills can be fake and some carry Narcan, but they don't test every time, and Narcan in the car doesn't help someone using alone in a bedroom.

## Assumptions we're no longer leaning on

| Assumption | Why it's weak | What changes |
|---|---|---|
| Identifying the imprint is the main value | For an M30 the answer is always "commonly counterfeited, treat as untested." The user already half-knows that | Value is what comes after identifying: test, buddy, Narcan |
| The alert feed makes the app feel alive | Near-me is empty at launch apart from official advisories | Don't lead with alerts; let them fill as strips are logged |
| People open the app at the moment of decision | "Do nothing" wins on effort | Reach people with a strip in hand, or through someone who cares about them |
| The App Store is the main way in | The user lives on Snapchat; an install is friction | Web links (`/go`, shares) carry the first wave; the app follows |

## A. Strip-packet companion (build first)

Outreach groups already hand out strips. Put a QR sticker on every packet. Scanning it opens straight to: **what's it stamped as → how to test → log the result → text a friend.**

**Already built:**
- `/go?c=<code>`: QR landing page, sets `pc_acq_source` and switches language with `?lang=es`.
- `/qr?c=<code>&lang=es`: printable poster, web only.
- **Metrics:** first checks by source.
- **Strip guide** with the 1-line / 2-lines key, steps, timer and invalid → retest (`StripGuide.tsx`, PR #4).
- **Buddy Alert** texting from the person's own phone, on every result, under the strip logger (PR #4).
- `/check?imprint=…&auto=1` deep link.

**To build:**
1. **Packet mode on `/go`.** With `?c=<code>&mode=test`, the landing page leads with "Got a strip? Let's test it." It sends people to `/check` with a short line saying they'll be walked through the strip next, then on to Results, where the guide opens automatically. (`test_strip_results.report_id` is required, so a log still hangs off a check. Keep it that way.)
2. **Skip friction on first launch from a packet.**
   - `WelcomeGate` still shows (legal), but as one tap.
   - Skip the 3-second safety countdown when the source is a packet, since the strip guide covers the same ground.
   - Keep `pc_safety_modal_seen` semantics for everyone else.
3. **Sticker sheet.** A small-format variant of `/qr` (about 2×2 in per code, 20 per sheet, en/es) so groups can label packets, not just put posters on walls. One code per group, or per batch.
4. **Partner stats link.** A read-only page per code showing aggregate scans, first checks and strips logged, read from the daily rollup only and never row-level. No change to the privacy policy if it only reads the rollup; confirm against Privacy.tsx before shipping.

**Partners to start with:** one or two outreach groups that already distribute strips. Fresno or the Central Valley is a natural first, since the data pipeline is already strongest there.

## C. "Send this to someone you worry about" (second)

People like the founder are the motivated ones; the cousin is the one who benefits. Give the motivated person a one-tap way to send a link that opens the test guide and buddy text, with their own note on top.

**To build:**
1. **Entry points:**
   - Home (secondary button)
   - Settings
   - Results, after the share card: "Worried about someone? Send them this."
2. **Message.**
   - The sender writes a short personal note, prefilled with something like "Please test before you take anything. This shows you how. I'd rather you text me than not."
   - Share text lives in `share.*`, en + es, and never contains "safe."
3. **Link.** `/go?c=share&mode=test` (or a per-sender code if we want to count shares; it must not identify the sender). It opens straight into packet mode from A, so A has to exist first.
4. **No accounts, no stored messages.** The note goes out through the phone's own share sheet, the same pattern as Buddy Alert.

## What we measure

- **First real signal:** one strip logged by someone we don't know, from a packet code.
- **Then, per code:** scans → first checks → strips logged → buddy texts opened. The last is a client-side event only, with no content.
- **For C:** shares sent → links opened → strips logged from `c=share`.
- **Not success:** installs, page views, waitlist counts.

## Not doing

- Leading with the alert feed or seeding fake community reports.
- Any "tested clean" or negative-rate stats used as reassurance.
- Gating any of this behind an account.
- Third-party analytics or attribution SDKs to measure it.

## Open questions

- Which outreach group goes first, and who's the contact?
- Do partners want stats per batch, or just per group?
- Is the cousin profile accurate? It's worth one real conversation with someone like him before building C: where he'd see the link, and what would make him open it.
