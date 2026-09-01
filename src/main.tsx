import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "@/styles/index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {/* Metricas de Vercel: visitas por ruta y velocidad real de carga. No usan
        cookies ni identifican al usuario. */}
    <Analytics />
    <SpeedInsights />
  </StrictMode>
);
