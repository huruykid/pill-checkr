import { forwardRef, ReactNode, type CSSProperties } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomTabBar, TAB_BAR_HEIGHT } from "./BottomTabBar";
import { EmergencyFAB } from "@/components/shared/EmergencyFAB";
import { isNative } from "@/lib/platform";

interface LayoutProps {
  children: ReactNode;
  /** Show urgent (pulsing) emergency FAB — used on high-risk results */
  urgentEmergency?: boolean;
}

export const Layout = forwardRef<HTMLDivElement, LayoutProps>(function Layout({ children, urgentEmergency = false }, ref) {
  const native = isNative();
  // The FAB grows to 64px when urgent; FloatingDock and <main> padding read
  // this var so nothing overlaps or hides under it.
  const vars = { "--fab-size": urgentEmergency ? "64px" : "56px" } as CSSProperties;
  return (
    <div ref={ref} className="flex min-h-screen flex-col" style={vars}>
      <Header />
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
        // Reserve room for the fixed tab bar (mobile; 0 on desktop via CSS var)
        // plus the floating controls, so the last item on a page is reachable.
        style={{
          paddingBottom: `calc(var(--tab-bar-space, ${TAB_BAR_HEIGHT}px) + env(safe-area-inset-bottom) + var(--fab-size, 56px) + (var(--fab-gap, 12px) * 2))`,
        }}
      >
        {children}
      </main>
      {/* Web keeps the SEO footer; the native app drops it. */}
      {!native && <Footer />}
      <BottomTabBar />
      <EmergencyFAB urgent={urgentEmergency} />
    </div>
  );
});
