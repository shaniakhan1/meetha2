import { useEffect, useState } from "react";
import { useLocation } from "wouter";

/**
 * Dev-only preview mode.
 * Calls /api/auth/preview to create a real session without magic link,
 * then redirects to the generate screen with unlimited credits.
 * Also lets you simulate Free / Starter / Pro tier views.
 */

type Tier = "free" | "starter" | "pro";

// Store the simulated tier in sessionStorage so Generate/Dashboard can read it
export function getPreviewTier(): Tier | null {
  try {
    return (sessionStorage.getItem("meetha_preview_tier") as Tier) || null;
  } catch {
    return null;
  }
}

export function setPreviewTier(tier: Tier) {
  try {
    sessionStorage.setItem("meetha_preview_tier", tier);
  } catch {}
}

export function clearPreviewTier() {
  try {
    sessionStorage.removeItem("meetha_preview_tier");
  } catch {}
}

export default function Preview() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [selectedTier, setSelectedTier] = useState<Tier>("free");
  const [destination, setDestination] = useState<"/generate" | "/dashboard" | "/onboarding">("/generate");

  const handleEnter = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/preview", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Preview auth failed");
      }
      setPreviewTier(selectedTier);
      setStatus("done");
      // Small delay so the user sees the success state
      setTimeout(() => navigate(destination), 600);
    } catch (err: unknown) {
      console.error("[Preview]", err);
      setStatus("error");
    }
  };

  const tiers: { value: Tier; label: string; description: string }[] = [
    { value: "free", label: "Free", description: "5 credits, stills only, upgrade gate visible" },
    { value: "starter", label: "Starter ($19)", description: "30 credits, animated preview unlocked" },
    { value: "pro", label: "Pro ($39)", description: "75 credits, real video generation unlocked" },
  ];

  const destinations: { value: typeof destination; label: string }[] = [
    { value: "/generate", label: "Generate Screen" },
    { value: "/dashboard", label: "Dashboard" },
    { value: "/onboarding", label: "Onboarding" },
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-3">
            Dev Mode
          </p>
          <h1 className="font-serif font-light text-3xl text-charcoal mb-3">
            Preview Meetha
          </h1>
          <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
            Skip sign-in and test any tier without Stripe.
            <br />
            Only available in development.
          </p>
        </div>

        {/* Tier selector */}
        <div className="mb-8">
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal mb-4">
            Simulate Tier
          </p>
          <div className="space-y-2">
            {tiers.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedTier(t.value)}
                className={`w-full text-left p-4 border transition-all duration-200 ${
                  selectedTier === t.value
                    ? "border-gold bg-gold/10 text-charcoal"
                    : "border-sand/60 bg-warm-white/60 text-charcoal hover:border-gold/40"
                }`}
              >
                <p className="font-sans text-xs tracking-[0.1em] uppercase mb-1">{t.label}</p>
                <p className="font-sans font-light text-xs text-charcoal-soft">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Destination selector */}
        <div className="mb-10">
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal mb-4">
            Go To
          </p>
          <div className="grid grid-cols-3 gap-2">
            {destinations.map((d) => (
              <button
                key={d.value}
                onClick={() => setDestination(d.value)}
                className={`py-3 px-2 text-center border transition-all duration-200 ${
                  destination === d.value
                    ? "border-gold bg-gold/10 text-charcoal"
                    : "border-sand/60 bg-warm-white/60 text-charcoal hover:border-gold/40"
                }`}
              >
                <p className="font-sans text-xs tracking-[0.08em] uppercase">{d.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        {status === "error" && (
          <div className="mb-4 p-3 border border-red-200 bg-red-50 text-center">
            <p className="font-sans text-xs text-red-600">
              Preview auth failed. Make sure you are in development mode.
            </p>
          </div>
        )}

        <button
          onClick={handleEnter}
          disabled={status === "loading" || status === "done"}
          className="btn-luxury w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading"
            ? "Signing in..."
            : status === "done"
            ? "Redirecting..."
            : "Enter Preview"}
        </button>

        <p className="mt-6 text-center font-sans text-xs text-charcoal-soft">
          This page is not visible in production.
        </p>
      </div>
    </div>
  );
}
