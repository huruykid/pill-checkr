import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ConfidenceLevel = "low" | "medium" | "high";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  size?: "sm" | "md";
  className?: string;
}

const confidenceConfig = {
  low: {
    label: "Low Confidence",
    variant: "confidence-low" as const,
  },
  medium: {
    label: "Medium Confidence",
    variant: "confidence-medium" as const,
  },
  high: {
    label: "High Confidence",
    variant: "confidence-high" as const,
  },
};

export function ConfidenceBadge({ 
  level, 
  size = "sm",
  className 
}: ConfidenceBadgeProps) {
  const config = confidenceConfig[level];

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        size === "sm" && "text-xs",
        size === "md" && "text-sm px-3",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
