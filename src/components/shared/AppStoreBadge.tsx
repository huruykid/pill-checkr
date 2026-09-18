import { isNative } from "@/lib/platform";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** Apple ID for Pill Checkr: ID & Test (permanent, see RELEASING.md). */
export const APP_STORE_ID = "6804091193";

/**
 * App Store campaign link. `ct` is the placement or poster code so installs
 * from each surface show up separately in App Store Connect → Analytics →
 * Sources. `pt` is the provider token from App Store Connect (Users and
 * Access → Marketing Tools); optional until it exists.
 */
export function appStoreUrl(campaign: string): string {
  const pt = import.meta.env.VITE_ASC_PROVIDER_TOKEN as string | undefined;
  const params = new URLSearchParams({ ct: campaign.slice(0, 40), mt: "8" });
  if (pt) params.set("pt", pt);
  return `https://apps.apple.com/app/id${APP_STORE_ID}?${params.toString()}`;
}

/** True once the listing is live; flips the badges on without a code change. */
export const APP_STORE_LIVE = import.meta.env.VITE_APP_STORE_LIVE === "true";

interface AppStoreBadgeProps {
  /** Where this badge sits; becomes the `ct` campaign and the analytics prop. */
  placement: string;
  className?: string;
  /** Render even before launch (used on /go so posters printed early still work). */
  force?: boolean;
}

/**
 * Official-style "Download on the App Store" badge. Hidden inside the native
 * shell and, unless forced, until VITE_APP_STORE_LIVE=true.
 */
export function AppStoreBadge({ placement, className, force }: AppStoreBadgeProps) {
  if (isNative()) return null;
  if (!APP_STORE_LIVE && !force) return null;
  return (
    <a
      href={appStoreUrl(placement)}
      onClick={() => track("store_badge_tapped", { placement })}
      className={cn("inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white shadow-sm transition-opacity hover:opacity-90", className)}
      aria-label="Download on the App Store"
      rel="noopener"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M16.365 1.43c0 1.14-.47 2.26-1.24 3.08-.83.9-2.17 1.6-3.29 1.5-.14-1.1.43-2.28 1.2-3.06.86-.9 2.3-1.57 3.33-1.52zM20.9 17.4c-.6 1.37-.88 1.98-1.65 3.19-1.07 1.68-2.58 3.78-4.45 3.79-1.66.02-2.09-1.09-4.34-1.08-2.25.01-2.73 1.1-4.39 1.08-1.87-.02-3.3-1.9-4.37-3.58C-.8 15.9-.6 10.6 1.7 7.8c1.3-1.6 3.16-2.5 4.9-2.5 1.77 0 2.88 1.08 4.34 1.08 1.42 0 2.28-1.08 4.33-1.08 1.55 0 3.19.84 4.36 2.3-3.83 2.1-3.21 7.57 1.27 9.8z" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide opacity-80">Download on the</span>
        <span className="block text-base font-semibold">App Store</span>
      </span>
    </a>
  );
}
