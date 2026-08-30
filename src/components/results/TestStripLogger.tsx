import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { FlaskConical, ShieldCheck, ShieldAlert, RotateCcw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticSuccess } from "@/lib/platform";

interface TestStripLoggerProps {
  reportId: string;
  className?: string;
  /** Fired after a result is saved; Results uses it to offer "warn people near you". */
  onLogged?: (result: "positive" | "negative" | "invalid") => void;
}

type TestResult = "positive" | "negative" | "invalid";

export function TestStripLogger({ reportId, className, onLogged }: TestStripLoggerProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState<TestResult | null>(null);

  useEffect(() => {
    // Check if a test result already exists for this report
    const fetchExisting = async () => {
      const { data } = await supabase
        .from("test_strip_results")
        .select("result")
        .eq("report_id", reportId)
        .limit(1)
        .maybeSingle();
      if (data) setSavedResult(data.result as TestResult);
    };
    fetchExisting();
  }, [reportId]);

  const logResult = async (result: TestResult) => {
    setSaving(true);
    try {
      const sessionId = localStorage.getItem("sessionId") || crypto.randomUUID();
      localStorage.setItem("sessionId", sessionId);

      if (savedResult) {
        // Update existing
        await supabase
          .from("test_strip_results")
          .update({ result, test_type: "fentanyl" })
          .eq("report_id", reportId);
      } else {
        // Insert new
        await supabase
          .from("test_strip_results")
          .insert({
            report_id: reportId,
            test_type: "fentanyl",
            result,
            user_id: user?.id || null,
            session_id: sessionId,
          });
      }

      setSavedResult(result);
      hapticSuccess();
      toast.success(t("testStrip.logged"));
      onLogged?.(result);
    } catch (error) {
      console.error("Error logging test strip result:", error);
      toast.error(t("testStrip.error"));
    } finally {
      setSaving(false);
    }
  };

  const buttons: { result: TestResult; icon: React.ReactNode; className: string }[] = [
    {
      result: "negative",
      icon: <ShieldCheck className="h-5 w-5" />,
      className: "border-success/40 bg-success/10 hover:bg-success/20 text-success",
    },
    {
      result: "positive",
      icon: <ShieldAlert className="h-5 w-5" />,
      className: "border-danger/40 bg-danger/10 hover:bg-danger/20 text-danger",
    },
    {
      result: "invalid",
      icon: <RotateCcw className="h-5 w-5" />,
      className: "border-muted-foreground/30 bg-muted/50 hover:bg-muted text-muted-foreground",
    },
  ];

  return (
    <Card className={cn("border-2 border-dashed border-primary/30", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-5 w-5 text-primary" />
          {t("testStrip.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("testStrip.subtitle")}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {buttons.map(({ result, icon, className: btnClass }) => {
            const isActive = savedResult === result;
            return (
              <Button
                key={result}
                variant="outline"
                disabled={saving}
                onClick={() => logResult(result)}
                className={cn(
                  "h-auto flex-col gap-2 py-4 text-sm font-semibold border-2 transition-all",
                  btnClass,
                  isActive && "ring-2 ring-offset-2 ring-primary"
                )}
              >
                {isActive ? <CheckCircle className="h-5 w-5" /> : icon}
                <span className="text-xs leading-tight text-center">
                  {t(`testStrip.${result}`)}
                </span>
              </Button>
            );
          })}
        </div>
        {savedResult && (
          <p className="mt-3 text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <CheckCircle className="h-3 w-3 text-success" />
            {t("testStrip.recorded")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
