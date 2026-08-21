import { Link, useLocation } from "react-router-dom";
import { Search, Radio, MapPin, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

/**
 * Owns the bottom safe-area inset. Mobile-only (md:hidden).
 * Tabs: Identify / Alerts / Help / History — the four jobs the app is for.
 */
export const TAB_BAR_HEIGHT = 56;

export function BottomTabBar() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  const tabs = [
    { to: "/check", label: t("tabs.identify"), icon: Search, match: ["/check", "/results"] },
    { to: "/trends", label: t("tabs.alerts"), icon: Radio, match: ["/trends"] },
    { to: "/nearby-help", label: t("tabs.help"), icon: MapPin, match: ["/nearby-help"] },
    { to: "/history", label: t("tabs.history"), icon: History, match: ["/history"] },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4" style={{ height: TAB_BAR_HEIGHT }}>
        {tabs.map((tab) => {
          const active = tab.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          return (
            <li key={tab.to} className="flex">
              <Link
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground",
                )}
              >
                <tab.icon className={cn("h-6 w-6", active && "stroke-[2.5]")} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
