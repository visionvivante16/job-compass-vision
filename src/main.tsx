// Cache bust: v3
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/socia-orb.css";
import { initSentry } from "./lib/sentry";
import { initGlobalErrorCapture } from "./lib/errorLogger";

// Initialize Sentry first so it captures everything that follows
initSentry();
// Keep in-app error_logs panel as backup
initGlobalErrorCapture();
 
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
 
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
