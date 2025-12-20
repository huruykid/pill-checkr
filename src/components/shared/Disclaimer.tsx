import { AlertTriangle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclaimerProps {
  variant?: "default" | "compact" | "emergency";
  className?: string;
}

export function Disclaimer({ variant = "default", className }: DisclaimerProps) {
  if (variant === "emergency") {
    return (
      <div className={cn(
        "rounded-xl border-2 border-danger/30 bg-danger-light p-4 md:p-6",
        className
      )}>
        <div className="flex items-start gap-3">
          <Phone className="h-6 w-6 text-danger shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold text-danger text-lg">
              If someone is overdosing, call 911 now
            </p>
            <p className="text-sm text-danger/80">
              Administer naloxone (Narcan) if available. Stay with the person until help arrives.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg bg-warning-light px-3 py-2 text-sm",
        className
      )}>
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <p className="text-warning-foreground">
          This tool cannot confirm fentanyl or guarantee safety. Not medical advice.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border border-warning/30 bg-warning-light/50 p-4 md:p-6",
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
        <div className="space-y-3">
          <p className="font-semibold text-warning-foreground">
            Librarian, Not Chemist
          </p>
          <p className="text-sm text-warning-foreground/90">
            Think of this app as a librarian: we can look at a pill's "cover" and tell you if it 
            looks similar to known references. But like a librarian, we cannot promise what's 
            actually inside — only a lab (chemist) can do that.
          </p>
          <ul className="space-y-2 text-sm text-warning-foreground/90">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
              <span>This is <strong>not</strong> medical advice or lab-grade testing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
              <span>This tool <strong>cannot</strong> confirm fentanyl or guarantee any pill is safe</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
              <span>If we <strong>cannot confidently match</strong> a pill, treat it as higher risk</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
              <span>If you suspect an overdose, <strong>call 911 immediately</strong></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
