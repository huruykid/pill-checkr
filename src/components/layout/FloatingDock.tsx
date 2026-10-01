import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FloatingDockProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout-owned slot for a page's primary floating action (e.g. "Report what
 * you found" on Alerts). The emergency FAB owns the bottom-right corner;
 * the dock sits to its left and shares its bottom offset, so the two can
 * never overlap at any width. Column width = viewport − 16 − (fab + gap + 16):
 * 220pt at 320, 275 at 375, 330 at 430. Layout reserves matching bottom
 * padding on <main> so the last item on the page clears both controls.
 *
 * Rule: a page never renders its own fixed-bottom element. Put it here.
 */
export const FloatingDock = forwardRef<HTMLDivElement, FloatingDockProps>(function FloatingDock({ children, className }, ref) {
  const style: CSSProperties = {
    left: "1rem",
    right: "calc(1rem + var(--fab-size, 56px) + var(--fab-gap, 12px))",
    bottom: "calc(var(--tab-bar-space, 56px) + env(safe-area-inset-bottom) + var(--fab-gap, 12px))",
  };
  return (
    <div ref={ref} className={cn("pointer-events-none fixed z-40 flex justify-center", className)} style={style}>
      {children}
    </div>
  );
});
