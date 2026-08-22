import { Layout } from "@/components/layout/Layout";
import { SEOHead, makeWebPage } from "@/components/shared/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, EyeOff, Trash2, AlertTriangle } from "lucide-react";

const UPDATED = "August 21, 2026";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 font-display text-2xl md:text-3xl">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <Layout>
      <SEOHead
        title="Privacy Policy | Pill Checkr"
        description="What Pill Checkr collects, what it never collects, and how to delete everything. We do not sell data, do not track you across apps, and never store your exact location."
        path="/privacy"
        jsonLd={makeWebPage("Privacy Policy", "/privacy", "Pill Checkr privacy policy — data collection, retention, and deletion.")}
      />

      <div className="container max-w-3xl py-8 md:py-12">
        <h1 className="font-display text-4xl md:text-5xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>

        {/* The short version, up top, because this is the part that matters. */}
        <Card className="my-8 border-2 border-primary/30">
          <CardContent className="space-y-4 pt-6">
            <p className="font-semibold text-foreground">The short version</p>
            <ul className="space-y-3 text-[15px] text-muted-foreground">
              <li className="flex gap-3">
                <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>You can identify a pill, read alerts, and find help <strong className="text-foreground">without an account</strong>. We never ask who you are.</span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>We <strong className="text-foreground">never store your exact location</strong>. Location is converted to a city and state on your device, and the coordinates are discarded.</span>
              </li>
              <li className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>We <strong className="text-foreground">do not sell your data, share it with advertisers, or track you across apps</strong>. There is no advertising SDK and no analytics broker in this app.</span>
              </li>
              <li className="flex gap-3">
                <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>You can <strong className="text-foreground">delete your account and all of its data from inside the app</strong>, at any time, in Settings.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-10">
          <Section id="who" title="Who we are">
            <p>
              Pill Checkr is a harm reduction tool operated by Appfinity Labs LLC. It helps people identify
              what a pill is stamped to be, encourages testing with a fentanyl test strip, and connects
              people to naloxone, test strips, and treatment nearby.
            </p>
            <p className="rounded-lg border border-warning/40 bg-warning-light p-4 text-foreground">
              Pill Checkr cannot detect fentanyl and does not tell you a pill is safe. A photo only matches
              an imprint against reference images. Counterfeit pills are pressed to look identical to real
              ones. Only a test strip or a laboratory can tell you what is inside a pill.
            </p>
          </Section>

          <Section id="collect" title="What we collect">
            <p><strong className="text-foreground">If you use the app without an account:</strong></p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Pill photos you upload.</strong> Used only to identify the imprint,
                shape and color. Anonymous uploads are not linked to any identity and are deleted on a rolling basis.
              </li>
              <li>
                <strong className="text-foreground">A random session identifier</strong> stored on your device, so your
                own check history shows up on that device. It is not tied to your name, phone, email, or advertising ID.
              </li>
              <li>
                <strong className="text-foreground">City and state, only if you ask for it.</strong> If you tap
                "Use my city" or "Near me", your device determines a coarse location and converts it to a city and
                state. We store only the city and state text. The latitude and longitude are discarded and are never
                sent to our servers.
              </li>
              <li>
                <strong className="text-foreground">Community alerts you post.</strong> An imprint, what it was sold
                as, a test strip result, and optionally a city and state. These are published anonymously.
              </li>
            </ul>

            <p className="pt-2"><strong className="text-foreground">If you create an account:</strong></p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Your email address, used for sign-in and password reset only. We do not send marketing email.</li>
              <li>Your check history, test strip logs, and any emergency contacts you choose to save, so they sync across your devices.</li>
            </ul>
          </Section>

          <Section id="never" title="What we never collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>Your precise GPS coordinates. A database trigger strips them on write, so they cannot be stored even by accident.</li>
              <li>Your contacts, photo library, call history, or browsing activity.</li>
              <li>Advertising identifiers. Pill Checkr contains no advertising SDK and does no cross-app tracking.</li>
              <li>Any information about drug purchases, sources, or sellers. We do not want it and there is nowhere in the app to enter it.</li>
            </ul>
          </Section>

          <Section id="public" title="What other people can see">
            <p>
              Community Alerts is a public feed. When you post an alert, other people see the imprint, what it was
              sold as, the test strip result, and the city and state if you provided one. They never see your
              account, your email, your photos, or your notes.
            </p>
            <p>
              Notes you add to a report are visible only to moderators and are used to investigate false or abusive
              reports. Location is city-level, which is deliberately too coarse to identify a person.
            </p>
          </Section>

          <Section id="why" title="Why we process this data">
            <p>
              To identify pills, to publish anonymous regional counterfeit alerts, to show you help nearby, and to
              keep the alerts feed free of spam and abuse. Aggregate, de-identified counts (for example, how many
              fentanyl-positive strips were reported in a state in a month) may be shared with public health and
              harm reduction organizations. These aggregates contain no personal data.
            </p>
          </Section>

          <Section id="share" title="Who we share it with">
            <p>
              We do not sell your data. We share it only with the service providers that run the app: our hosting
              and database provider, and the mapping and geocoding services used to show help nearby. We also
              disclose information if legally compelled, and will resist requests that appear designed to identify
              people who use drugs.
            </p>
            <p>
              Some information in the app comes from public sources — FDA and National Library of Medicine drug
              data, and SAMHSA's treatment locator. Looking up a treatment provider sends a search location to
              those services.
            </p>
          </Section>

          <Section id="retention" title="How long we keep it">
            <ul className="list-disc space-y-2 pl-5">
              <li>Anonymous pill photos: deleted on a rolling basis and not retained long-term.</li>
              <li>Check history on an account: kept until you delete the check or your account.</li>
              <li>Community alerts: kept as long as they are useful to people in that area, then aged out.</li>
            </ul>
          </Section>

          <Section id="rights" title="Your choices">
            <p>
              <strong className="text-foreground">Delete everything.</strong> Settings has a Delete Account option
              that permanently erases your account, check history, uploaded photos, test strip logs, emergency
              contacts, and API keys. It cannot be undone and does not require emailing us.
            </p>
            <p>
              <strong className="text-foreground">Use the app anonymously.</strong> You are never required to create
              an account to identify a pill, read alerts, post an alert, or find help.
            </p>
            <p>
              <strong className="text-foreground">Turn off location.</strong> Location is only requested when you tap
              a button that needs it, and you can type a city manually instead.
            </p>
            <p>
              Depending on where you live, you may have rights to access, correct, or export your data, and to
              object to processing. Contact us and we will honor them.
            </p>
          </Section>

          <Section id="children" title="Children">
            <p>
              Pill Checkr is rated 17+ and is not directed at children. We do not knowingly collect information from
              anyone under 17. If you believe a child has provided us information, contact us and we will delete it.
            </p>
          </Section>

          <Section id="changes" title="Changes and contact">
            <p>
              If we make a material change to this policy we will update the date at the top and note the change in
              the app. Questions, requests, or concerns:{" "}
              <a href="mailto:privacy@pillcheckr.app" className="text-primary underline underline-offset-4">
                privacy@pillcheckr.app
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </Layout>
  );
}
