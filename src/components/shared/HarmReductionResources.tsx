import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, ExternalLink, Heart, TestTube, Package } from "lucide-react";

interface HarmReductionResourcesProps {
  className?: string;
}

export function HarmReductionResources({ className }: HarmReductionResourcesProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Harm Reduction Resources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hotlines */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Crisis Lines
          </h3>
          <a
            href="tel:18004843731"
            className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Phone className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Never Use Alone</p>
              <p className="text-sm text-muted-foreground">
                1-800-484-3731 — Stay on the line while you use. They'll call 911 if you stop responding.
              </p>
            </div>
          </a>

          <a
            href="tel:988"
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">988 Suicide & Crisis Lifeline</p>
              <p className="text-sm text-muted-foreground">
                Call or text 988 — Free, confidential, 24/7 support.
              </p>
            </div>
          </a>
        </div>

        {/* Fentanyl Test Strips */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Fentanyl Test Strips
          </h3>
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <TestTube className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Fentanyl test strips can detect fentanyl in pills, powders, and liquids.
                  They cost ~$1 each and take 2-5 minutes.
                </p>
                <a
                  href="https://dancesafe.org/product/fentanyl-test-strips-pack-of-10-free-shipping/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    Get Test Strips <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Naloxone Locator */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Get Naloxone (Narcan)
          </h3>
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Naloxone reverses opioid overdoses and can save lives. It's available without a
                  prescription in most states. Carry it even if you don't use — you might save
                  someone else.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://nextdistro.org/naloxone"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      Free by Mail (NEXT Distro) <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a
                    href="https://www.naloxonelocator.org"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      Find Near You <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
