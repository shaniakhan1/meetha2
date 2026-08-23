import * as Sentry from "@sentry/react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';

// Initialize Sentry — errors only, no performance tracing or session replay
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Disable all performance/tracing features
    tracesSampleRate: 0,
    // Disable session replay
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Only capture errors, not performance data
    integrations: [],
  });
}
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

function SentryFallback({ error }: { error: Error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: "2rem", fontFamily: "sans-serif", background: "#F7F3EC", color: "#2C2C2C" }}>
      <p style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "1rem", color: "#B8956A" }}>Something went wrong</p>
      <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem", opacity: 0.6, maxWidth: "320px", textAlign: "center" }}>{error.message}</p>
      <button onClick={() => window.location.reload()} style={{ padding: "0.5rem 1.5rem", border: "1px solid #B8956A", background: "transparent", cursor: "pointer", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Reload</button>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch when the user returns to the tab (e.g. from email CTA).
      // Ensures lora_status is always fresh after training completes in the background.
      refetchOnWindowFocus: true,
      staleTime: 10_000, // 10s — prevents excessive refetches on rapid tab switches
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration is best-effort; silently ignore failures
    });
  });
}

// Hard-replace any remaining Manus-era CloudFront image URLs in the rendered app.
// This removes the production dependency on the old host even if a browser has an old service worker.
const legacyEditorialReplacements: Record<string, string> = {
  "editorial-01-window-4Ex7ySDHERfgQxSGrLgiqH.webp": "/editorial/editorial-diverse-black.jpg",
  "editorial-02-fullbody-cRGwTXz2gHjynX9ahHDVXB.webp": "/editorial/editorial-diverse-street.jpg",
  "curvy-silhouette-test-T6AYZCEqwSqBi8tbjG4HV2.webp": "/editorial/editorial-diverse-curvy.jpg",
  "editorial-03-restaurant-JxCbUv26xaboJFEWHABv6g.webp": "/manus-storage/meetha-gallery-restaurant_33c494d6.webp",
  "editorial-05-jewelry-E7PHF69YfVpDeTTDRyXXDd.webp": "/manus-storage/gallery_hands_coffee_b7861070.webp",
  "editorial-04-motion-PdCsKveuYL5VJ73Dzk4AZe.webp": "/editorial/editorial-diverse-black.jpg",
  "editorial-06-softlight-X9utC7yPfkFCBqUYhBXkqQ.webp": "/editorial/editorial-diverse-curvy.jpg",
};

const replaceLegacyEditorialImages = () => {
  document.querySelectorAll<HTMLImageElement>('img[src*="d2xsxph8kpxj0f.cloudfront.net"]').forEach((img) => {
    const filename = img.src.split("/").pop();
    const replacement = filename ? legacyEditorialReplacements[filename] : undefined;
    if (replacement && img.getAttribute("src") !== replacement) {
      img.setAttribute("src", replacement);
    }
  });
};

const legacyImageObserver = new MutationObserver(replaceLegacyEditorialImages);
legacyImageObserver.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("load", replaceLegacyEditorialImages);

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={({ error }) => <SentryFallback error={error as Error} />}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </Sentry.ErrorBoundary>
);

queueMicrotask(replaceLegacyEditorialImages);
