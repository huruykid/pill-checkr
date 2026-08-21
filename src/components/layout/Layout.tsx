import { forwardRef, ReactNode } from "react";
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
  return (
    <div ref={ref} className="flex min-h-screen flex-col">
      <Header />
      <main
        className="flex-1"
        // Reserve room for the fixed tab bar on mobile; desktop gets 0 via CSS var override.
        style={{ paddingBottom: `calc(var(--tab-bar-space, ${TAB_BAR_HEIGHT}px) + env(safe-area-inset-bottom))` }}
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
