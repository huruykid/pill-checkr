import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { Button } from "@/components/ui/button";
import { Shield, Search, BookOpen, ArrowRight, Heart, CheckCircle } from "lucide-react";

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/50 to-background py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Shield className="h-4 w-4" />
              Harm Reduction Tool
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Check Your Pills.
              <br />
              <span className="text-primary">Reduce Risk.</span>
            </h1>
            
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              Like a librarian, we can tell you if a pill looks similar to known references — 
              but we can't promise what's inside. Not a lab test. Not a guarantee of safety.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/check">
                <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto">
                  <Search className="h-5 w-5" />
                  Check a Pill
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/education">
                <Button variant="hero-outline" size="xl" className="gap-2 w-full sm:w-auto">
                  <BookOpen className="h-5 w-5" />
                  Learn Harm Reduction
                </Button>
              </Link>
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

      {/* How It Works */}
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold md:text-3xl">
            How It Works
          </h2>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="relative rounded-2xl border border-border/50 bg-card p-6 text-center transition-all hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                1
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-accent">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Upload Photo</h3>
              <p className="text-sm text-muted-foreground">
                Take or upload a clear photo of your pill with good lighting
              </p>
            </div>

            <div className="relative rounded-2xl border border-border/50 bg-card p-6 text-center transition-all hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                2
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-accent">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Reference Lookup</h3>
              <p className="text-sm text-muted-foreground">
                Like a librarian comparing book covers, we check against known references
              </p>
            </div>

            <div className="relative rounded-2xl border border-border/50 bg-card p-6 text-center transition-all hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                3
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-accent">
                <Heart className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Get Guidance</h3>
              <p className="text-sm text-muted-foreground">
                View possible matches, consistency notes, and harm reduction steps
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border/50 bg-muted/30 py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">
              What We Provide
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "Image quality assessment",
                "Imprint text recognition (OCR)",
                "Shape and color classification",
                "Reference database matching",
                "Consistency / anomaly scoring",
                "Harm reduction guidance",
              ].map((feature) => (
                <div 
                  key={feature}
                  className="flex items-center gap-3 rounded-xl bg-card p-4 border border-border/50"
                >
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <Disclaimer variant="emergency" />
        </div>
      </section>
    </Layout>
  );
};

export default Index;
