import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface MatchFeedbackProps {
  reportId: string;
  matchId?: string;
  className?: string;
}

function getSessionId(): string {
  let id = localStorage.getItem("ff_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ff_session_id", id);
  }
  return id;
}

export function MatchFeedback({ reportId, matchId, className }: MatchFeedbackProps) {
  const { t } = useI18n();
  const [submitted, setSubmitted] = useState<boolean | null>(null);

  const handleFeedback = async (helpful: boolean) => {
    setSubmitted(helpful);
    try {
      await supabase.from("match_feedback" as any).insert({
        report_id: reportId,
        match_id: matchId || null,
        helpful,
        session_id: getSessionId(),
      } as any);
      toast.success(t("feedback.thanks"));
    } catch {
      toast.error(t("feedback.error"));
      setSubmitted(null);
    }
  };

  if (submitted !== null) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground", className)}>
        {submitted ? (
          <ThumbsUp className="h-4 w-4 text-success" />
        ) : (
          <ThumbsDown className="h-4 w-4 text-warning" />
        )}
        {t("feedback.submitted")}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3", className)}>
      <span className="text-sm font-medium text-foreground">{t("feedback.question")}</span>
      <div className="flex gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={() => handleFeedback(true)} className="gap-1.5">
          <ThumbsUp className="h-3.5 w-3.5" />
          {t("feedback.yes")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleFeedback(false)} className="gap-1.5">
          <ThumbsDown className="h-3.5 w-3.5" />
          {t("feedback.no")}
        </Button>
      </div>
    </div>
  );
}
