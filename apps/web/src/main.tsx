import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/app";
import { Toaster } from "@/ui/sonner";
import { dismissMarketingPrerenderShell } from "@/lib/marketing-prerender";
import { subscribeThemeDomSync } from "@/stores/theme";
import { QueryProvider } from "@/providers/query-provider";

import "@/index.css";

subscribeThemeDomSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <App />
        <Toaster position="bottom-center" />
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>,
);

// ponytail: one global dismiss — per-page hooks miss /dashboard and other app routes
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    dismissMarketingPrerenderShell();
  });
});
