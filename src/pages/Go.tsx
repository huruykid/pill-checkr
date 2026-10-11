import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/shared/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StripGuide } from "@/components/results/StripGuide";
import { AppStoreBadge } from "@/components/shared/AppStoreBadge";
import { useI18n, LANGUAGES, LANGUAGE_LABELS, type Language } from "@/hooks/useI18n";
import { track, captureAttribution } from "@/lib/analytics";
import { FlaskConical, Radio, Search } from "lucide-react";

/**
 * QR landing page. Every printed poster and handout points here with its own
 * ?c= campaign code, so installs and first checks can be attributed per
 * location in the admin Metrics tab. Two actions, no scrolling required.
 */
export default function Go() {
  const { t, lang, setLang } = useI18n();
  const [params] = useSearchParams();
  const campaign = (params.get("c") || "qr").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "qr";
  // mode=test: the code is on a strip packet, so the person is holding a strip.
  const packet = params.get("mode") === "test";

  useEffect(() => {
    captureAttribution(`?c=${campaign}`);
    track("qr_landing", { campaign, mode: packet ? "test" : "poster" });
    const wanted = params.get("lang");
    if (wanted && LANGUAGES.includes(wanted as Language) && wanted !== lang) setLang(wanted as Language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = LANGUAGES[(LANGUAGES.indexOf(lang) + 1) % LANGUAGES.length];

  if (packet) return <PacketLanding campaign={campaign} onToggleLang={() => setLang(next)} nextLabel={LANGUAGE_LABELS[next]} />;

  return (
    <Layout>
      <SEOHead
        title="Stamped — Identify a Pill, Find Test Strips & Naloxone"
        description="A photo can't detect fentanyl. A $1 test strip can. Identify a pill by its imprint, see what's being faked near you, and find strips and naloxone. Free, anonymous, no account."
        path="/go"
      />
      <div className="container flex min-h-[70dvh] max-w-md flex-col justify-center py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <FlaskConical className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-4xl leading-tight md:text-5xl">{t("go.title")}</h1>
          <p className="mt-4 text-base text-muted-foreground font-sans normal-case">{t("go.subtitle")}</p>
        </div>

        <div className="space-y-3">
          <Button asChild size="xl" className="w-full gap-2 whitespace-normal h-auto py-4">
            <Link to={`/check?utm_source=qr&utm_campaign=${campaign}`}>
              <Search className="h-5 w-5" />
              {t("go.checkNow")}
            </Link>
          </Button>
          <AppStoreBadge placement={`go-${campaign}`} className="w-full justify-center py-3" force />
          <Button asChild variant="outline" size="lg" className="w-full gap-2 whitespace-normal h-auto py-3">
            <Link to="/trends">
              <Radio className="h-5 w-5" />
              {t("go.alerts")}
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground font-sans normal-case">{t("go.footnote")}</p>

        <button
          type="button"
          onClick={() => setLang(next)}
          className="mx-auto mt-4 text-xs text-muted-foreground underline underline-offset-4"
        >
          {LANGUAGE_LABELS[next]}
        </button>
      </div>
    </Layout>
  );
}

/**
 * Strip-packet landing (/go?c=<code>&mode=test). One field: what's stamped on
 * the pill. The check carries mode=test so Results opens the strip guide. The
 * guide is also here, so someone who can't read the stamp still gets the steps.
 */
function PacketLanding({ campaign, onToggleLang, nextLabel }: { campaign: string; onToggleLang: () => void; nextLabel: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [imprint, setImprint] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const base = `mode=test&utm_source=qr&utm_campaign=${campaign}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = imprint.trim();
    navigate(value ? `/check?imprint=${encodeURIComponent(value)}&auto=1&${base}` : `/check?${base}`);
  };

  return (
    <Layout>
      <SEOHead title="Test your pill | Stamped" description={t("packet.subtitle")} path="/go" noindex />
      <div className="container max-w-md py-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <FlaskConical className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-4xl leading-tight md:text-5xl">{t("packet.title")}</h1>
          <p className="mt-4 text-base text-muted-foreground font-sans normal-case">{t("packet.subtitle")}</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="packet-imprint" className="block text-sm font-semibold text-foreground font-sans normal-case">
            {t("packet.imprintLabel")}
          </label>
          <Input
            id="packet-imprint"
            value={imprint}
            onChange={(e) => setImprint(e.target.value)}
            placeholder={t("packet.placeholder")}
            autoCapitalize="characters"
            autoComplete="off"
            className="min-h-11 text-lg font-semibold"
          />
          <Button type="submit" size="xl" className="w-full gap-2 whitespace-normal h-auto py-4">
            <Search className="h-5 w-5" />
            {t("packet.submit")}
          </Button>
          <Button asChild variant="ghost" className="w-full min-h-11 whitespace-normal h-auto">
            <Link to={`/check?${base}`}>{t("packet.noStamp")}</Link>
          </Button>
        </form>

        <div className="mt-6">
          <StripGuide open={guideOpen} onOpenChange={setGuideOpen} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground font-sans normal-case">{t("go.footnote")}</p>
        <button
          type="button"
          onClick={onToggleLang}
          className="mx-auto mt-2 flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-4"
        >
          {nextLabel}
        </button>
      </div>
    </Layout>
  );
}
