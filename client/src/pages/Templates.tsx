import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const TEMPLATES = [
  {
    slug: "paparazzi_flash",
    number: "Template No. 01",
    title: "Caught Looking\nExpensive",
    subtitle:
      "Flash photography. Blurry background. Someone caught you mid-moment looking effortlessly stunning. The image looks real. Your friends repost it.",
    hooks: [
      "vanished softly",
      "peace changed my face",
      "she got quieter",
      "seen briefly",
      "out past my bedtime",
      "summer looked good on her",
      "she already knew",
      "calm women move differently",
    ],
    hooksLabel: "Caption overlays",
    whyItSpreads: [
      ["Hides the AI", "Harsh flash and film grain read as paparazzi motion, not AI artifacts."],
      ["Flatters without trying", "Candid energy. She looks incredible without posing."],
      ["Creates the moment", "Her friends see it. The guy she likes sees it. She posts it."],
    ],
    locations: [
      "blurry restaurant exit",
      "back seat of a taxi",
      "hotel elevator mirror",
      "late-night diner booth",
      "airport terminal gate",
      "convenience store exit",
    ],
    locationsLabel: "Where she was seen",
    sampleImage: "/manus-storage/template-paparazzi-flash_24688a24.jpg",
    gradient:
      "radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.08) 0%, transparent 60%), linear-gradient(160deg, #2C1810 0%, #1a0f09 60%, #2C1810 100%)",
    hasFlash: true,
  },
  {
    slug: "digital_diary",
    number: "Template No. 02",
    title: "Digital Diary",
    subtitle:
      "Taped polaroid. Handwritten note. Dried flower. Analog layering that feels like a page from a real woman's private journal.",
    hooks: [
      "wrote it down",
      "saved this one",
      "she kept it",
      "not for everyone",
      "private collection",
      "she remembered",
      "tucked away",
    ],
    hooksLabel: "Caption overlays",
    whyItSpreads: [
      ["Highly saveable", "Pinterest, TikTok, Stories. Analog layering reads as intentional, not AI."],
      ["Feels private", "The intimacy of a personal journal makes people want to share it."],
      ["Different aesthetic", "Warm and tactile where Caught Looking Expensive is dark and electric."],
    ],
    locations: null,
    locationsLabel: null,
    sampleImage: "/manus-storage/template-digital-diary_11ffb1d8.jpg",
    gradient: "linear-gradient(160deg, #2C1810 0%, #1a0f09 60%, #2C1810 100%)",
    hasFlash: false,
  },
  {
    slug: "bill_please",
    number: "Template No. 03",
    title: "Bill, Please",
    subtitle:
      "She reaches for the check. Calm, unbothered, final. No argument. No waiting. The gesture says everything the caption does not.",
    hooks: [
      "i stopped arguing",
      "the bill was cheaper than the lesson",
      "she paid and left",
      "quietly covered it",
      "check, please",
      "i leave quietly now",
      "the table was hers",
    ],
    hooksLabel: "Caption overlays",
    whyItSpreads: [
      ["Emotionally loaded", "Paying the check is a power move. Everyone who has been there knows it."],
      ["Detached and devastating", "The hook lands because it says nothing and everything at once."],
      ["Universally relatable", "Every woman has had this moment. That is why it spreads."],
    ],
    locations: [
      "candlelit fine dining",
      "rooftop restaurant",
      "hotel bar",
      "private dining room",
      "wine bar counter",
      "business lunch table",
    ],
    locationsLabel: "Where she was sitting",
    sampleImage: "/manus-storage/template-bill-please_7eacca04.jpg",
    gradient: "linear-gradient(160deg, #1a0a06 0%, #2C1810 50%, #1a0a06 100%)",
    hasFlash: false,
  },
  {
    slug: "silk_robe_room_service",
    number: "Template No. 04",
    title: "Silk Robe\nRoom Service",
    subtitle:
      "Hotel suite. Silk robe. Morning light. Room service tray. Ordered for one. The luxury of an unhurried morning that belongs entirely to her.",
    hooks: [
      "ordered for one",
      "room service and silence",
      "this is the life",
      "no one else in the frame",
      "mornings like this",
      "room to herself",
      "the good kind of alone",
    ],
    hooksLabel: "Caption overlays",
    whyItSpreads: [
      ["Rich Grandma Energy", "Quiet luxury, no performance. The fantasy of solitude as the ultimate flex."],
      ["Aspirational and intimate", "Hotel suite morning light hits different. Everyone wants to be her."],
      ["Saves and reposts", "Warm tones and soft light are the most saved aesthetic on Pinterest and Stories."],
    ],
    locations: [
      "luxury hotel suite",
      "boutique hotel window",
      "penthouse morning",
      "resort balcony",
      "villa bedroom",
      "city view suite",
    ],
    locationsLabel: "Where she woke up",
    sampleImage: "/manus-storage/template-silk-robe_705e049a.jpg",
    gradient: "linear-gradient(160deg, #2C1810 0%, #3d1f0e 50%, #2C1810 100%)",
    hasFlash: false,
  },
];

export default function Templates() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [hoveredHooks, setHoveredHooks] = useState<Record<string, string | null>>({});

  const handleMakeMine = (slug: string) => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    navigate(`/generate?template=${slug}`);
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-sand">
        <button
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors"
        >
          {user ? "Dashboard" : "Back"}
        </button>
        <span className="font-serif text-base tracking-widest text-charcoal">Templates</span>
        {!user ? (
          <a
            href={getLoginUrl()}
            className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors"
          >
            Sign In
          </a>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Template cards */}
      <div className="flex-1 flex flex-col">
        {TEMPLATES.map((template, idx) => (
          <div key={template.slug} className={idx > 0 ? "border-t border-sand" : ""}>
            {/* Hero card */}
            <div className="relative overflow-hidden" style={{ minHeight: "60vh" }}>
              {/* Sample image */}
              <img
                src={template.sampleImage}
                alt={template.title.replace("\n", " ")}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: "center top" }}
              />
              {/* Dark overlay for text legibility */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(26,15,9,0.55) 0%, rgba(26,15,9,0.25) 40%, rgba(26,15,9,0.75) 100%)",
                }}
              />
              {/* Grain overlay */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
                  backgroundSize: "128px 128px",
                }}
              />
              {template.hasFlash && (
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
              )}

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-end px-6 pb-12 pt-16 text-center min-h-[60vh]">
                <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold/80 mb-4">
                  {template.number}
                </p>
                <h2 className="font-serif text-4xl font-light text-cream leading-tight mb-4 whitespace-pre-line">
                  {template.title}
                </h2>
                <p className="font-sans font-light text-sm text-cream/70 leading-relaxed max-w-xs mb-8">
                  {template.subtitle}
                </p>

                {/* Hook chips */}
                <div className="mb-8 w-full max-w-xs">
                  <p className="font-sans text-xs tracking-[0.15em] uppercase text-cream/30 mb-3">
                    {template.hooksLabel}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {template.hooks.map((hook) => (
                      <span
                        key={hook}
                        onMouseEnter={() =>
                          setHoveredHooks((prev) => ({ ...prev, [template.slug]: hook }))
                        }
                        onMouseLeave={() =>
                          setHoveredHooks((prev) => ({ ...prev, [template.slug]: null }))
                        }
                        className={`font-serif text-xs px-3 py-1.5 border transition-all duration-200 cursor-default ${
                          hoveredHooks[template.slug] === hook
                            ? "border-gold/60 text-gold bg-gold/5"
                            : "border-cream/20 text-cream/50"
                        }`}
                      >
                        {hook}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleMakeMine(template.slug)}
                  className="w-full max-w-xs py-4 bg-cream text-charcoal font-sans text-xs tracking-[0.2em] uppercase hover:bg-gold hover:text-charcoal transition-all duration-200 active:scale-[0.97]"
                >
                  Make Mine
                </button>
                <p className="mt-3 font-sans text-xs text-cream/40">
                  {user ? "1 credit" : "Free to try. No credit card."}
                </p>
              </div>
            </div>

            {/* Locations */}
            {template.locations && (
              <div className="px-6 py-10 border-t border-sand">
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-charcoal-soft mb-5 text-center">
                  {template.locationsLabel}
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                  {template.locations.map((loc) => (
                    <div key={loc} className="px-3 py-2 border border-sand text-center">
                      <p className="font-sans text-xs text-charcoal-soft">{loc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why it spreads */}
            <div className="px-6 py-10 border-t border-sand max-w-sm mx-auto w-full">
              <p className="font-sans text-xs tracking-[0.2em] uppercase text-charcoal-soft mb-6 text-center">
                Why it spreads
              </p>
              <div className="space-y-4">
                {template.whyItSpreads.map(([title, desc]) => (
                  <div key={title} className="flex gap-3">
                    <div className="w-1 h-1 rounded-full bg-gold mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-sans text-xs text-charcoal mb-0.5">{title}</p>
                      <p className="font-sans text-xs text-charcoal-soft leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="px-6 pb-12 pt-4 max-w-xs mx-auto w-full">
              <button
                onClick={() => handleMakeMine(template.slug)}
                className="w-full py-4 bg-cream text-charcoal font-sans text-xs tracking-[0.2em] uppercase hover:bg-gold hover:text-charcoal transition-all duration-200 active:scale-[0.97]"
              >
                Make Mine
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
