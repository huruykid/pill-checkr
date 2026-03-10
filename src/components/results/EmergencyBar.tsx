import { Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmergencyBarProps {
  className?: string;
}

export function EmergencyBar({ className }: EmergencyBarProps) {
  return (
    <div className={`rounded-lg border-2 border-destructive bg-destructive/10 p-4 space-y-3 ${className || ""}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive animate-pulse-subtle" />
        <h3 className="font-bold text-destructive uppercase tracking-wide text-sm">
          Emergency Help
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <a href="tel:911" className="block">
          <Button variant="danger" className="w-full gap-2" size="lg">
            <Phone className="h-4 w-4" />
            Call 911
          </Button>
        </a>

        <a href="tel:18002221222" className="block">
          <Button variant="warning" className="w-full gap-2" size="lg">
            <Phone className="h-4 w-4" />
            Poison Control
          </Button>
        </a>

        <a href="tel:988" className="block">
          <Button variant="outline" className="w-full gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground" size="lg">
            <Phone className="h-4 w-4" />
            988 Crisis Line
          </Button>
        </a>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        If you or someone else is in danger, call immediately. Good Samaritan laws protect you in most states.
      </p>
    </div>
  );
}
