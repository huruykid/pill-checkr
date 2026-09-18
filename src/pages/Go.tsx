import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/shared/SEOHead";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    captureAttribution(`?c=${campaign}`);
    track("qr_landing", { campaign });
    const wanted = params.get("lang");
    if (wanted && LANGUAGES.includes(wanted as Language) && wanted !== lang) setLang(wanted as Language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = LANGUAGES[(LANGUAGES.indexOf(lang) + 1) % LANGUAGES.length];

  return (
    <Layout>
      <SEOHead
        title="Pill Checkr — Identify a Pill, Find Test Strips & Naloxone"
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
