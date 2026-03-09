import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CounterfeitWarningProps {
  className?: string;
}

export function CounterfeitWarning({ className }: CounterfeitWarningProps) {
  return (
    <Alert variant="destructive" className={className}>
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle className="text-base font-bold">
        ⚠️ High Counterfeit Risk
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>
          This pill matches a medication <strong>commonly targeted by counterfeiters</strong>. 
          Visual appearance alone <strong>CANNOT</strong> confirm authenticity.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Use <strong>fentanyl test strips</strong> before consuming any pill</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Have <strong>naloxone (Narcan)</strong> ready and accessible</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span><strong>Never use alone</strong> — call 1-800-484-3731 (Never Use Alone)</span>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
