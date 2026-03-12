import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, ExternalLink, Heart, TestTube, Package, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface HarmReductionResourcesProps {
  className?: string;
  showFindHelp?: boolean;
}

export function HarmReductionResources({ className, showFindHelp }: HarmReductionResourcesProps) {
  const { t } = useI18n();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          {t("hr.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {showFindHelp && (
          <Link to="/nearby-help">
            <Button variant="default" className="w-full gap-2 font-semibold" size="lg">
              <MapPin className="h-5 w-5" />
              {t("hr.findHelp")}
            </Button>
          </Link>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t("hr.crisisLines")}
          </h3>
          <a
            href="tel:18004843731"
            className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Phone className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t("hr.neverUseAlone")}</p>
              <p className="text-sm text-muted-foreground">{t("hr.neverUseAloneDesc")}</p>
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
              <p className="font-semibold text-foreground">{t("hr.988Title")}</p>
              <p className="text-sm text-muted-foreground">{t("hr.988Desc")}</p>
            </div>
          </a>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t("hr.testStripsTitle")}
          </h3>
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <TestTube className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("hr.testStripsDesc")}</p>
                <a
                  href="https://dancesafe.org/product/fentanyl-test-strips-pack-of-10-free-shipping/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    {t("hr.getTestStrips")} <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t("hr.naloxoneTitle")}
          </h3>
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("hr.naloxoneDesc")}</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://nextdistro.org/naloxone"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      {t("hr.freeByMail")} <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Link to="/nearby-help?filter=naloxone">
                    <Button variant="default" size="sm" className="gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {t("hr.findNaloxone")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
