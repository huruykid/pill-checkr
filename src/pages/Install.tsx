import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/shared/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Check, Smartphone, Wifi, WifiOff, Apple } from "lucide-react";
import { AppStoreBadge, APP_STORE_LIVE } from "@/components/shared/AppStoreBadge";

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <Layout>
      <SEOHead
        title="Get the Pill Checkr App | iOS and Web"
        description="Get Pill Checkr on iPhone, or add the web app to your home screen. Identify pills, log fentanyl test strips, and see counterfeit alerts near you."
        path="/install"
      />
      <div className="container py-12">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-6 text-3xl font-bold text-center">Get the App</h1>

          {/* Native first: the iOS app is the product; the PWA is the fallback. */}
          <Card className="mb-6 border-2 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Pill Checkr for iPhone and iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Identify a pill, log a test strip result, and get counterfeit alerts for your area. Free, no account, no ads.
              </p>
              {APP_STORE_LIVE ? (
                <AppStoreBadge placement="install-page" />
              ) : (
                <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  Coming to the App Store soon. Everything works in the browser today.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Add the web app to your home screen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Install Pill Checkr on your device for quick access. Education content and safety checklists are available offline.
              </p>

              {isInstalled ? (
                <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-success">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">App is installed!</span>
                </div>
              ) : deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Install Now
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  To install, open this page in Chrome or Safari and use your browser's "Add to Home Screen" option.
                </p>
              )}

              <div className="flex items-center gap-2 text-sm">
                {isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">You're online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">You're offline — cached content is available</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold">What works offline?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  Education articles and guides
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  Safety checklists and harm reduction steps
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  Emergency contact numbers
                </li>
              </ul>
              <p className="text-xs text-muted-foreground pt-2">
                Pill analysis requires an internet connection to process images.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
