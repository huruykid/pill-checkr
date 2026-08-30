/**
 * Native-shell initialization and helpers. Imported dynamically from main.tsx
 * only when running the native build, so the web bundle never carries
 * Capacitor plugin code.
 */
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Header is dark (bg-foreground); light glyphs stay readable over it.
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Status bar styling is cosmetic — never block startup on it.
  }
  try {
    await SplashScreen.hide();
  } catch {
    // launchAutoHide covers this; explicit hide is belt and braces.
  }
}

/** Light tap for small confirmations (selection, toggle). */
export async function hapticTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics are enhancement only.
  }
}

/** Success buzz for the moments that matter (strip logged, report sent). */
export async function hapticSuccess(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Haptics are enhancement only.
  }
}
