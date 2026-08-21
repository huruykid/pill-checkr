/**
 * Platform seam. Web is the default; native opts out.
 * - Build-time: VITE_TARGET=native selects the native route table.
 * - Runtime: isNative() detects the Capacitor shell for small divergences.
 */
export const IS_NATIVE_BUILD = import.meta.env.VITE_TARGET === "native";

export function isNative(): boolean {
  if (IS_NATIVE_BUILD) return true;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return !!w.Capacitor?.isNativePlatform?.();
}
