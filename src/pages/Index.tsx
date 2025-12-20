import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { Button } from "@/components/ui/button";
import { Shield, Search, BookOpen, ArrowRight, Heart, CheckCircle, ArrowDown } from "lucide-react";

const Index = () => {
  return (
    <Layout>
      {/* Hero Section - Light with bold typography */}
      <section className="relative overflow-hidden bg-background py-16 md:py-24">
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 font-display text-5xl tracking-wide text-foreground md:text-6xl lg:text-7xl">
              THE REAL
              <br />
              <span className="text-primary">RISK CHECK</span>
            </h1>
            
            <p className="mb-8 text-lg text-muted-foreground md:text-xl font-sans">
              A free tool to help assess consistency with known reference pills 
              using image analysis and matching. Not a guarantee of safety.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/check">
                <Button variant="default" size="xl" className="gap-2 w-full sm:w-auto">
                  <Search className="h-5 w-5" />
                  Check a Pill
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/education">
                <Button variant="outline" size="xl" className="gap-2 w-full sm:w-auto">
                  <BookOpen className="h-5 w-5" />
                  Get the Facts
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex justify-center">
              <ArrowDown className="h-8 w-8 text-muted-foreground animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Golden Section - Help Your Friends */}
      <section className="bg-secondary py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-2 font-display text-4xl text-secondary-foreground md:text-5xl lg:text-6xl tracking-wide">
              HELP YOUR
            </h2>
            <h2 className="mb-6 font-display text-4xl text-primary md:text-5xl lg:text-6xl tracking-wide italic">
              FRIENDS
            </h2>
            
            <p className="mb-8 text-lg text-secondary-foreground/90 md:text-xl font-sans">
              Know the signs of overdose. Carry naloxone. You could save a life.
              Learn how to recognize when someone needs help and what to do.
            </p>

            <Link to="/education">
              <Button variant="outline" size="lg" className="gap-2">
                Learn How to Help
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Red Section - Pill Safety 101 */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 font-display text-4xl text-primary-foreground md:text-5xl lg:text-6xl tracking-wide">
              PILL SAFETY 101
            </h2>
            
            <p className="mb-8 text-lg text-primary-foreground/90 md:text-xl font-sans">
              Counterfeit pills are increasingly common and often contain deadly doses 
              of fentanyl. This tool helps you compare pills against known references — 
              but only lab testing can confirm what's inside.
            </p>

            <Link to="/education">
              <Button variant="hero-outline" size="lg" className="gap-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Get the Facts
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
            <span>Upload</span>
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Analyze</span>
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Get Results</span>
            <span className="h-2 w-2 rounded-full bg-secondary" />
          </div>
        </div>
      </section>

      {/* How It Works Details */}
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center font-display text-3xl md:text-4xl">
            HOW IT WORKS
          </h2>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="relative rounded-sm border-2 border-border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                1
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-sm bg-muted">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-display text-xl">UPLOAD PHOTO</h3>
              <p className="text-sm text-muted-foreground font-sans">
                Take or upload a clear photo of your pill with good lighting
              </p>
            </div>

            <div className="relative rounded-sm border-2 border-border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                2
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-sm bg-muted">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-display text-xl">REFERENCE MATCHING</h3>
              <p className="text-sm text-muted-foreground font-sans">
                We compare against known pill references to find possible matches
              </p>
            </div>

            <div className="relative rounded-sm border-2 border-border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-lg">
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                3
              </div>
              <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-sm bg-muted">
                <Heart className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-display text-xl">GET GUIDANCE</h3>
              <p className="text-sm text-muted-foreground font-sans">
                View possible matches, consistency notes, and harm reduction steps
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
              WHAT WE PROVIDE
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