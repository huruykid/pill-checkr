import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/shared/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Code, Key, Shield, Zap, BarChart3, AlertTriangle, Image, Activity } from "lucide-react";
import { useState } from "react";

const METHOD_COLORS: Record<string, string> = {
  POST: "bg-success text-success-foreground",
  GET: "bg-primary text-primary-foreground",
};

interface Endpoint {
  method: string;
  path: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  auth: boolean;
  request: string;
  response: string;
}

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/v1/check",
    title: "Single Pill Check",
    description: "Submit pill characteristics (imprint, color, shape) and receive structured identification results with risk scoring, match confidence, and drug information.",
    icon: <Shield className="h-5 w-5" />,
    auth: true,
    request: JSON.stringify({
      imprint: "M30",
      color: "blue",
      shape: "round",
      photo_url: "https://example.com/pill.jpg",
      include_drug_info: true,
    }, null, 2),
    response: JSON.stringify({
      report_id: "d11ded98-5280-4a8d-a2a2-9ffa452cdc50",
      risk_level: "high",
      risk_reasons: [
        "Imprint M30 is commonly counterfeited with fentanyl",
        "Blue round pills with this imprint have high counterfeit rates",
      ],
      match_confidence: "high",
      matches: [
        {
          rank: 1,
          drug_name: "Oxycodone 30mg",
          confidence: "high",
          matched_imprint: "M30",
          matched_color: "blue",
          matched_shape: "round",
          explanation: "Exact match to Mallinckrodt oxycodone 30mg tablet",
        },
      ],
      anomaly_score: 78,
      anomaly_reasons: ["High counterfeit prevalence for this imprint"],
    }, null, 2),
  },
  {
    method: "POST",
    path: "/v1/check/batch",
    title: "Batch Pill Check",
    description: "Submit an array of pill images or characteristics for bulk identification. Ideal for forensic labs, ERs processing multiple samples, or pharmacy intake workflows.",
    icon: <Zap className="h-5 w-5" />,
    auth: true,
    request: JSON.stringify({
      pills: [
        { imprint: "M30", color: "blue", shape: "round" },
        { imprint: "A51", color: "blue", shape: "round" },
        { imprint: "RP 30", color: "white", shape: "round" },
      ],
    }, null, 2),
    response: JSON.stringify({
      results: [
        {
          index: 0,
          report_id: "a1b2c3d4-...",
          risk_level: "high",
          match_confidence: "high",
          top_match: "Oxycodone 30mg (counterfeit risk)",
        },
        {
          index: 1,
          report_id: "e5f6g7h8-...",
          risk_level: "medium",
          match_confidence: "medium",
          top_match: "Oxycodone/Acetaminophen",
        },
        {
          index: 2,
          report_id: "i9j0k1l2-...",
          risk_level: "low",
          match_confidence: "high",
          top_match: "Oxycodone 30mg (Rhodes Pharma)",
        },
      ],
      processed: 3,
      high_risk_count: 1,
    }, null, 2),
  },
  {
    method: "GET",
    path: "/v1/analytics",
    title: "Aggregate Analytics",
    description: "Access anonymized, aggregate pill check data segmented by region, time period, and risk level. Powers public health dashboards and regional surveillance.",
    icon: <BarChart3 className="h-5 w-5" />,
    auth: true,
    request: `GET /v1/analytics?region=midwest&period=30d&group_by=risk_level

Headers:
  Authorization: Bearer <API_KEY>
  Content-Type: application/json`,
    response: JSON.stringify({
      region: "midwest",
      period: "30d",
      total_checks: 12847,
      breakdown: {
        high_risk: { count: 3412, pct: 26.5 },
        medium_risk: { count: 5203, pct: 40.5 },
        low_risk: { count: 4232, pct: 33.0 },
      },
      top_imprints: [
        { imprint: "M30", count: 2841, risk_level: "high" },
        { imprint: "A51", count: 1203, risk_level: "medium" },
        { imprint: "RP 30", count: 987, risk_level: "low" },
      ],
      trend: "increasing",
      trend_pct: 12.3,
    }, null, 2),
  },
  {
    method: "GET",
    path: "/v1/interactions",
    title: "Drug Interaction Lookup",
    description: "Check for dangerous drug-drug interactions using the RxNorm database. Returns severity levels and clinical descriptions for each interaction found.",
    icon: <AlertTriangle className="h-5 w-5" />,
    auth: true,
    request: `GET /v1/interactions?drug=oxycodone&with=alprazolam,alcohol

Headers:
  Authorization: Bearer <API_KEY>
  Content-Type: application/json`,
    response: JSON.stringify({
      interactions: [
        {
          drug1: "Oxycodone",
          drug2: "Alprazolam",
          severity: "severe",
          description: "Concurrent use of opioids with benzodiazepines may result in profound sedation, respiratory depression, coma, and death.",
        },
        {
          drug1: "Oxycodone",
          drug2: "Ethanol",
          severity: "severe",
          description: "Alcohol may increase opioid blood levels and enhance CNS depressant effects.",
        },
      ],
      has_severe: true,
      warning: "⚠️ SEVERE interactions detected. Combining these substances could be life-threatening.",
      resolved_count: 3,
      unresolved_drugs: [],
    }, null, 2),
  },
  {
    method: "POST",
    path: "/v1/alerts/send",
    title: "Buddy Alert",
    description: "Programmatically trigger an emergency buddy alert on behalf of a user. Designed for telehealth platforms and harm reduction apps to integrate emergency notifications.",
    icon: <Activity className="h-5 w-5" />,
    auth: true,
    request: JSON.stringify({
      user_id: "67cb3c07-184e-44ed-a28b-148931b3c382",
      report_id: "d11ded98-5280-4a8d-a2a2-9ffa452cdc50",
      message: "HIGH RISK substance detected. Please check on me immediately.",
    }, null, 2),
    response: JSON.stringify({
      alert_id: "f3a1b2c3-d4e5-6789-abcd-ef0123456789",
      contacts_notified: [
        { name: "Emergency Contact 1", method: "sms", status: "sent" },
        { name: "Emergency Contact 2", method: "email", status: "sent" },
      ],
      sent_at: "2026-03-12T14:30:00Z",
    }, null, 2),
  },
  {
    method: "GET",
    path: "/v1/reference/images",
    title: "Reference Images",
    description: "Retrieve verified reference images from the pill database. Use for visual comparison, training ML models, or building educational materials.",
    icon: <Image className="h-5 w-5" />,
    auth: true,
    request: `GET /v1/reference/images?drug_name=oxycodone&color=blue&shape=round&limit=5

Headers:
  Authorization: Bearer <API_KEY>
  Content-Type: application/json`,
    response: JSON.stringify({
      images: [
        {
          id: "img-001",
          drug_name: "Oxycodone 30mg",
          imprint: "M30",
          color: "blue",
          shape: "round",
          image_url: "https://api.fentfinder.com/ref/img-001.jpg",
          source: "FDA",
          verified: true,
        },
        {
          id: "img-002",
          drug_name: "Oxycodone 30mg",
          imprint: "A51",
          color: "blue",
          shape: "round",
          image_url: "https://api.fentfinder.com/ref/img-002.jpg",
          source: "DailyMed",
          verified: true,
        },
      ],
      total: 2,
      page: 1,
    }, null, 2),
  },
];

function CodeBlock({ code, lang = "json" }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-md bg-foreground text-background overflow-x-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-background/20">
        <span className="text-xs uppercase tracking-wider text-background/50 font-display">{lang}</span>
      </div>
      <pre className="p-4 text-sm leading-relaxed font-mono whitespace-pre overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <Card className="border-2 border-border hover:border-secondary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={`${METHOD_COLORS[endpoint.method]} font-mono font-bold text-xs px-2 py-0.5`}>
            {endpoint.method}
          </Badge>
          <code className="text-sm font-mono text-foreground/80">{endpoint.path}</code>
          {endpoint.auth && (
            <Badge variant="outline" className="text-xs border-secondary text-secondary">
              <Key className="h-3 w-3 mr-1" />
              AUTH
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl mt-2 flex items-center gap-2">
          {endpoint.icon}
          {endpoint.title}
        </CardTitle>
        <p className="text-muted-foreground text-sm mt-1">{endpoint.description}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="request" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-muted">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>
          <TabsContent value="request" className="mt-3">
            <CodeBlock code={endpoint.request} lang={endpoint.method === "GET" ? "http" : "json"} />
          </TabsContent>
          <TabsContent value="response" className="mt-3">
            <CodeBlock code={endpoint.response} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function ApiDocs() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <Layout>
      <SEOHead
        title="API Documentation — Fent Finder"
        description="Integrate pill identification, drug interaction checks, and harm reduction tools into your platform with the Fent Finder API."
        path="/api-docs"
      />

      {/* Hero */}
      <section className="bg-foreground text-background py-16">
        <div className="container max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Code className="h-5 w-5 text-secondary-foreground" />
            </div>
            <Badge className="bg-secondary text-secondary-foreground font-display tracking-wider">
              DEVELOPER API
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-display text-background mb-4">
            FENT FINDER API
          </h1>
          <p className="text-lg text-background/70 max-w-2xl mb-8">
            Pill identification, drug interactions, and harm reduction data — built for
            health departments, ERs, forensic labs, pharmacies, telehealth platforms, and
            harm reduction organizations.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/auth">
              <Button variant="hero" size="lg" className="gap-2">
                <Key className="h-5 w-5" />
                Request API Key
              </Button>
            </Link>
            <a href="#endpoints">
              <Button variant="hero-outline" size="lg" className="gap-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
                <Code className="h-5 w-5" />
                View Endpoints
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Quick start */}
      <section className="py-12 bg-background border-b-4 border-secondary">
        <div className="container max-w-5xl">
          <h2 className="text-2xl font-display mb-6">QUICK START</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2">
              <CardContent className="pt-6 text-center">
                <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="font-display text-xl text-primary">1</span>
                </div>
                <h3 className="font-display text-lg mb-2">GET YOUR KEY</h3>
                <p className="text-sm text-muted-foreground">Sign up and request an API key from your dashboard.</p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="pt-6 text-center">
                <div className="h-12 w-12 mx-auto rounded-full bg-secondary/20 flex items-center justify-center mb-3">
                  <span className="font-display text-xl text-secondary-foreground">2</span>
                </div>
                <h3 className="font-display text-lg mb-2">SEND A REQUEST</h3>
                <p className="text-sm text-muted-foreground">POST pill data to our endpoints with your API key in the header.</p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="pt-6 text-center">
                <div className="h-12 w-12 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
                  <span className="font-display text-xl text-success">3</span>
                </div>
                <h3 className="font-display text-lg mb-2">GET RESULTS</h3>
                <p className="text-sm text-muted-foreground">Receive structured JSON with risk scores, matches, and drug info.</p>
              </CardContent>
            </Card>
          </div>

          {/* Auth example */}
          <div className="mt-8">
            <h3 className="font-display text-lg mb-3">AUTHENTICATION</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Include your API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization</code> header with every request:
            </p>
            <CodeBlock
              code={`curl -X POST https://api.fentfinder.com/v1/check \\
  -H "Authorization: Bearer ff_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"imprint": "M30", "color": "blue", "shape": "round"}'`}
              lang="bash"
            />
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section id="endpoints" className="py-12 bg-background">
        <div className="container max-w-5xl">
          <h2 className="text-2xl font-display mb-2">API ENDPOINTS</h2>
          <p className="text-muted-foreground mb-8">
            Base URL: <code className="bg-muted px-2 py-0.5 rounded text-sm">https://api.fentfinder.com</code>
          </p>
          <div className="space-y-6">
            {endpoints.map((ep) => (
              <EndpointCard key={ep.path} endpoint={ep} />
            ))}
          </div>
        </div>
      </section>

      {/* Rate limits & CTA */}
      <section className="py-12 bg-foreground text-background">
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-display mb-4">RATE LIMITS</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-background/20 pb-2">
                  <span className="text-background/70">Free tier</span>
                  <span className="font-mono">100 req / day</span>
                </div>
                <div className="flex justify-between border-b border-background/20 pb-2">
                  <span className="text-background/70">Partner</span>
                  <span className="font-mono">10,000 req / day</span>
                </div>
                <div className="flex justify-between border-b border-background/20 pb-2">
                  <span className="text-background/70">Enterprise</span>
                  <span className="font-mono">Unlimited</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center items-start">
              <h2 className="text-2xl font-display mb-3">READY TO INTEGRATE?</h2>
              <p className="text-background/70 mb-4">
                Get started in minutes. Our team is here to help with onboarding for health departments and large-scale deployments.
              </p>
              <Link to="/auth">
                <Button variant="hero" size="lg" className="gap-2">
                  <Key className="h-5 w-5" />
                  Request API Key
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
