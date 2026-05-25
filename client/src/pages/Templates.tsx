import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const DIGITAL_DIARY_HOOKS = [
  "wrote it down",
  "saved this one",
  "she kept it",
  "not for everyone",
  "private collection",
  "she remembered",
  "tucked away",
];

const PAPARAZZI_HOOKS = [
  "vanished softly",
  "peace changed my face",
  "she got quieter",
  "seen briefly",
  "out past my bedtime",
  "summer looked good on her",
  "she already knew",
  "calm women move differently",
];

const LOCATIONS = [
  "blurry restaurant exit",
  "back seat of a taxi",
  "hotel elevator mirror",
  "late-night diner booth",
  "airport terminal gate",
  "convenience store exit",
];

export default function Templates() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [hoveredHook, setHoveredHook] = useState<string | null>(null);

  const [hoveredDiaryHook, setHoveredDiaryHook] = useState<string | null>(null);

  const handleMakeMine = () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    navigate("/generate?template=paparazzi_flash");
  };

  const handleMakeDiary = () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    navigate("/generate?template=digital_diary");
  };

  return (
    <div className="min-h-screen bg-charcoal text-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <button
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="font-sans text-xs tracking-widest uppercase text-cream/50 hover:text-cream transition-colors"
        >
          {user ? "Dashboard" : "Back"}
        </button>
        <span className="font-serif text-base tracking-widest text-cream/80">Templates</span>
        {!user ? (
          <a
            href={getLoginUrl()}
            className="font-sans text-xs tracking-widest uppercase text-gold hover:text-cream transition-colors"
          >
            Sign In
          </a>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col">
        {/* Template card */}
        <div className="relative overflow-hidden" style={{ minHeight: "60vh" }}>
          {/* Background: dark gradient simulating flash photography atmosphere */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.06) 0%, transparent 60%), linear-gradient(160deg, #1a1714 0%, #0d0b09 60%, #1a1410 100%)",
            }}
          />
          {/* Grain overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
              backgroundSize: "128px 128px",
            }}
          />
          {/* Flash burst */}
          <div
            className="absolute"
            style={{
              top: "15%",
              left: "20%",
              width: "180px",
              height: "180px",
              background:
                "radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 py-16 text-center min-h-[60vh]">
            {/* Template label */}
            <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold/70 mb-6">
              Template No. 01
            </p>

            {/* Title */}
            <h1 className="font-serif text-4xl font-light text-cream leading-tight mb-4">
              Caught Looking
              <br />
              Expensive
            </h1>

            {/* Subtitle */}
            <p className="font-sans font-light text-sm text-cream/60 leading-relaxed max-w-xs mb-10">
              Flash photography. Blurry background. Someone caught you mid-moment looking effortlessly stunning.
              The image looks real. Your friends repost it.
            </p>

            {/* Hook preview — rotating subtle overlays */}
            <div className="mb-10 space-y-2 w-full max-w-xs">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-cream/30 mb-3">
                Caption overlays
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {PAPARAZZI_HOOKS.map((hook) => (
                  <span
                    key={hook}
                    onMouseEnter={() => setHoveredHook(hook)}
                    onMouseLeave={() => setHoveredHook(null)}
                    className={`font-serif text-xs px-3 py-1.5 border transition-all duration-200 cursor-default ${
                      hoveredHook === hook
                        ? "border-gold/60 text-gold bg-gold/5"
                        : "border-white/10 text-cream/50"
                    }`}
                  >
                    {hook}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleMakeMine}
              className="w-full max-w-xs py-4 bg-cream text-charcoal font-sans text-xs tracking-[0.2em] uppercase hover:bg-gold hover:text-charcoal transition-all duration-200 active:scale-[0.97]"
            >
              Make Mine
            </button>
            <p className="mt-3 font-sans text-xs text-cream/30">
              {user ? "1 credit" : "Free to try. No credit card."}
            </p>
          </div>
        </div>

        {/* Locations */}
        <div className="px-6 py-10 border-t border-white/8">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-cream/30 mb-5 text-center">
            Where she was seen
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
            {LOCATIONS.map((loc) => (
              <div key={loc} className="px-3 py-2 border border-white/8 text-center">
                <p className="font-sans text-xs text-cream/50">{loc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why it works */}
        <div className="px-6 py-10 border-t border-white/8 max-w-sm mx-auto w-full">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-cream/30 mb-6 text-center">
            Why it spreads
          </p>
          <div className="space-y-4">
            {[
              ["Hides the AI", "Harsh flash and film grain read as paparazzi motion, not AI artifacts."],
              ["Flatters without trying", "Candid energy. She looks incredible without posing."],
              ["Creates the moment", "Her friends see it. The guy she likes sees it. She posts it."],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1 h-1 rounded-full bg-gold mt-2 flex-shrink-0" />
                <div>
                  <p className="font-sans text-xs text-cream/80 mb-0.5">{title}</p>
                  <p className="font-sans text-xs text-cream/40 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="px-6 pb-12 pt-4 max-w-xs mx-auto w-full">
          <button
            onClick={handleMakeMine}
            className="w-full py-4 bg-cream text-charcoal font-sans text-xs tracking-[0.2em] uppercase hover:bg-gold hover:text-charcoal transition-all duration-200 active:scale-[0.97]"
          >
            Make Mine
          </button>
        </div>

        {/* ── Template No. 02: Digital Diary ── */}
        <div className="border-t border-white/15">
          {/* Hero card */}
          <div
            className="relative overflow-hidden"
            style={{ minHeight: "55vh" }}
          >
            {/* Background: warm analog cream */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, #1c1710 0%, #0f0d09 60%, #1a1510 100%)",
              }}
            />
            {/* Subtle warm grain */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
                backgroundSize: "128px 128px",
              }}
            />
            {/* Warm light glow */}
            <div
              className="absolute"
              style={{
                top: "20%",
                right: "15%",
                width: "200px",
                height: "200px",
                background:
                  "radial-gradient(ellipse, rgba(212,175,100,0.08) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />
            <div className="relative z-10 flex flex-col items-center justify-center px-6 py-16 text-center min-h-[55vh]">
              <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold/60 mb-6">
                Template No. 02
              </p>
              <h2 className="font-serif text-4xl font-light text-cream leading-tight mb-4">
                Digital Diary
              </h2>
              <p className="font-sans font-light text-sm text-cream/60 leading-relaxed max-w-xs mb-10">
                Taped polaroid. Handwritten note. Dried flower. Analog layering that feels like a page from a real woman's private journal.
              </p>
              {/* Hook chips */}
              <div className="mb-10 space-y-2 w-full max-w-xs">
                <p className="font-sans text-xs tracking-[0.15em] uppercase text-cream/30 mb-3">
                  Caption overlays
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {DIGITAL_DIARY_HOOKS.map((hook) => (
                    <span
                      key={hook}
                      onMouseEnter={() => setHoveredDiaryHook(hook)}
                      onMouseLeave={() => setHoveredDiaryHook(null)}
                      className={`font-serif text-xs px-3 py-1.5 border transition-all duration-200 cursor-default ${
                        hoveredDiaryHook === hook
                          ? "border-gold/60 text-gold bg-gold/5"
                          : "border-white/10 text-cream/50"
                      }`}
                    >
                      {hook}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={handleMakeDiary}
                className="w-full max-w-xs py-4 bg-cream text-charcoal font-sans text-xs tracking-[0.2em] uppercase hover:bg-gold hover:text-charcoal transition-all duration-200 active:scale-[0.97]"
              >
                Make Mine
              </button>
              <p className="mt-3 font-sans text-xs text-cream/30">
                {user ? "1 credit" : "Free to try. No credit card."}
              </p>
            </div>
          </div>

          {/* Why it works */}
          <div className="px-6 py-10 border-t border-white/8 max-w-sm mx-auto w-full">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-cream/30 mb-6 text-center">
              Why it spreads
            </p>
            <div className="space-y-4">
              {[
                ["Highly saveable", "Pinterest, TikTok, Stories. Analog layering reads as intentional, not AI."],
                ["Feels private", "The intimacy of a personal journal makes people want to share it."],
                ["Different aesthetic", "Warm and tactile where Caught Looking Expensive is dark and electric."],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3">
                  <div className="w-1 h-1 rounded-full bg-gold mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-sans text-xs text-cream/80 mb-0.5">{title}</p>
                    <p className="font-sans text-xs text-cream/40 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="px-6 pb-16 pt-4 max-w-xs mx-auto w-full">
            <button
              onClick={handleMakeDiary}
              className="w-full py-4 bg-cream text-charcoal font-sans text-xs tracking-[0.2em] uppercase hover:bg-gold hover:text-charcoal transition-all duration-200 active:scale-[0.97]"
            >
              Make Mine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
