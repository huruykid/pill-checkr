import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { IS_NATIVE_BUILD } from "./lib/platform";
import { captureAttribution } from "./lib/analytics";

// First-touch source (?c= from QR posters, ?utm_source= from shares) before
// the router strips anything.
captureAttribution();

if (IS_NATIVE_BUILD) {
  // Dynamic import keeps Capacitor plugin code out of the web bundle entirely.
  import("./lib/native").then(({ initNativeShell }) => initNativeShell());
}

createRoot(document.getElementById("root")!).render(<App />);
