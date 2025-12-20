import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: 
          "text-foreground",
        warning:
          "border-warning/20 bg-warning-light text-warning",
        success:
          "border-success/20 bg-success-light text-success",
        danger:
          "border-danger/20 bg-danger-light text-danger",
        "risk-low":
          "border-success/20 bg-success-light text-success",
        "risk-medium":
          "border-warning/20 bg-warning-light text-warning",
        "risk-high":
          "border-danger/20 bg-danger-light text-danger",
        "confidence-low":
          "border-danger/20 bg-danger-light text-danger",
        "confidence-medium":
          "border-warning/20 bg-warning-light text-warning",
        "confidence-high":
          "border-success/20 bg-success-light text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
