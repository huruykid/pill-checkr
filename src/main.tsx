import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { IS_NATIVE_BUILD } from "./lib/platform";

if (IS_NATIVE_BUILD) {
  // Dynamic import keeps Capacitor plugin code out of the web bundle entirely.
  import("./lib/native").then(({ initNativeShell }) => initNativeShell());
}

createRoot(document.getElementById("root")!).render(<App />);
