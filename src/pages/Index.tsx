import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { SEOHead, jsonLdWebSite } from "@/components/shared/SEOHead";
import { Button } from "@/components/ui/button";
import { Shield, Search, BookOpen, ArrowRight, Heart, CheckCircle, ArrowDown, Radio, FlaskConical } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

const Index = () => {
  const { t } = useI18n();

  const features = [
    t("index.feature1"),
    t("index.feature2"),
    t("index.feature3"),
    t("index.feature4"),
    t("index.feature5"),
    t("index.feature6"),
    t("index.feature7"),
  ];

  return (
    <Layout>
      <SEOHead
        title="Pill Checkr — Identify Pills, Find Test Strips & Naloxone"
        description="Identify a pill, test it with a fentanyl strip, log the result, and see what counterfeits are being found near you. Free harm reduction tool with naloxone and help nearby."
        path="/"
        jsonLd={jsonLdWebSite}
      />
      <section className="relative overflow-hidden bg-background py-16 md:py-24">
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 font-display text-5xl tracking-wide text-foreground md:text-6xl lg:text-7xl">
              {t("index.heroTitle1")}
              <br />
              <span className="text-primary">{t("index.heroTitle2")}</span>
            </h1>
            
            <p className="mb-8 text-lg text-muted-foreground md:text-xl font-sans">
              {t("index.heroSubtitle")}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/check">
                <Button variant="default" size="xl" className="gap-2 w-full sm:w-auto">
                  <Search className="h-5 w-5" />
                  {t("index.checkPill")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/trends">
                <Button variant="outline" size="xl" className="gap-2 w-full sm:w-auto">
                  <Radio className="h-5 w-5" />
                  {t("index.getTheFacts")}
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex justify-center">
              <ArrowDown className="h-8 w-8 text-muted-foreground animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Red Section - Bold Info */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 font-display text-4xl text-primary-foreground md:text-5xl lg:text-6xl tracking-wide">
              {t("index.safetyTitle")}
            </h2>
            
            <p className="mb-8 text-lg text-primary-foreground/90 md:text-xl font-sans">
              {t("index.safetyDesc")}
            </p>

            <Link to="/education">
              <Button variant="hero-outline" size="lg" className="gap-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                {t("index.getTheFacts")}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works - Accent stripe */}
      <section className="border-y-4 border-secondary bg-secondary/10 py-2">
        <div className="container">
          <div className="flex items-center justify-center gap-4 text-sm font-semibold uppercase tracking-wider text-foreground">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>{t("index.stripUpload")}</span>
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>{t("index.stripAnalyze")}</span>
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>{t("index.stripResults")}</span>
            <span className="h-2 w-2 rounded-full bg-secondary" />
          </div>
        </div>
      </section>

      {/* How It Works Details */}
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center font-display text-3xl md:text-4xl">
            {t("index.howItWorks")}
          </h2>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="relative rounded-sm border-2 border-border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                1
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-sm bg-muted">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-display text-xl">{t("index.step1Title")}</h3>
              <p className="text-sm text-muted-foreground font-sans">
                {t("index.step1Desc")}
              </p>
            </div>

            <div className="relative rounded-sm border-2 border-border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                2
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-sm bg-muted">
                <FlaskConical className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-display text-xl">{t("index.step2Title")}</h3>
              <p className="text-sm text-muted-foreground font-sans">
                {t("index.step2Desc")}
              </p>
            </div>

            <div className="relative rounded-sm border-2 border-border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                3
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-sm bg-muted">
                <Radio className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-display text-xl">{t("index.step3Title")}</h3>
              <p className="text-sm text-muted-foreground font-sans">
                {t("index.step3Desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t-4 border-secondary bg-muted py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center font-display text-3xl md:text-4xl">
              {t("index.whatWeProvide")}
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {features.map((feature) => (
                <div 
                  key={feature}
                  className="flex items-center gap-3 rounded-sm bg-card p-4 border-2 border-border"
                >
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <span className="text-foreground font-sans">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="container py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <Disclaimer />
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="container pb-12 md:pb-16">
        <div className="mx-auto max-w-3xl">
          <Disclaimer variant="emergency" />
        </div>
      </section>
    </Layout>
  );
};

export default Index;
