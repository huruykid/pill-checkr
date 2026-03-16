import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/hooks/useI18n";

interface CounterfeitWarningProps {
  className?: string;
}

export function CounterfeitWarning({ className }: CounterfeitWarningProps) {
  const { t } = useI18n();

  return (
    <Alert variant="destructive" className={className}>
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle className="text-base font-bold">
        {t("counterfeit.title")}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p dangerouslySetInnerHTML={{ __html: t("counterfeit.desc") }} />
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: t("counterfeit.tip1") }} />
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: t("counterfeit.tip2") }} />
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: t("counterfeit.tip3") }} />
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
