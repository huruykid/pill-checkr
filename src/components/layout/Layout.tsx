import { forwardRef, ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { EmergencyFAB } from "@/components/shared/EmergencyFAB";

interface LayoutProps {
  children: ReactNode;
  /** Show urgent (pulsing) emergency FAB — used on high-risk results */
  urgentEmergency?: boolean;
}

export const Layout = forwardRef<HTMLDivElement, LayoutProps>(function Layout({ children, urgentEmergency = false }, ref) {
  return (
    <div ref={ref} className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <EmergencyFAB urgent={urgentEmergency} />
    </div>
  );
});
