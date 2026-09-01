import type { CapacitorConfig } from "@capacitor/cli";

// Bundle ID is PERMANENT (registered on App Store Connect, Apple ID 6804091193).
// Never change appId.
const config: CapacitorConfig = {
  appId: "app.pillcheckr.ios",
  appName: "Stamped",
  webDir: "dist",
  ios: {
    contentInset: "never", // Header/BottomTabBar own the safe areas via env()
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
    },
    StatusBar: {
      // Header is dark (bg-foreground): keep light glyphs over it.
      style: "DARK",
      overlaysWebView: true,
    },
  },
};

export default config;
