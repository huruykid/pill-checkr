import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle } from "lucide-react";

type RiskLevel = "low" | "medium" | "high";

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const riskConfig = {
  // MVP: no green/"safe" state. A visual match is still an unverified pill.
  low: {
    label: "Unverified — Test It",
    variant: "risk-medium" as const,
    icon: AlertCircle,
  },
  medium: {
    label: "Medium Risk",
    variant: "risk-medium" as const,
    icon: AlertCircle,
  },
  high: {
    label: "High Risk",
    variant: "risk-high" as const,
    icon: AlertTriangle,
  },
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-1.5",
};

export function RiskBadge({ 
  level, 
  size = "md", 
  showIcon = true,
  className 
}: RiskBadgeProps) {
  const config = riskConfig[level];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "gap-1.5",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(
        size === "sm" && "h-3 w-3",
        size === "md" && "h-3.5 w-3.5",
        size === "lg" && "h-4 w-4"
      )} />}
      {config.label}
    </Badge>
  );
}
