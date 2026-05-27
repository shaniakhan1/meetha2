import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

const TEMPLATES = [
  {
    slug: "paparazzi_flash",
    number: "No. 01",
    title: "Caught Looking\nExpensive",
    fantasy: "She was seen.",
    subtitle:
      "Flash photography. Blurry background. Someone caught her mid-moment looking effortlessly stunning.",
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
    whyItSpreads: [
      ["Hides the AI", "Harsh flash and film grain read as paparazzi motion, not AI artifacts."],
      ["Candid energy", "She looks incredible without posing. Her friends repost it."],
    ],
    sampleImage: "/manus-storage/template-paparazzi-flash_24688a24.jpg",
    gradient:
      "radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.08) 0%, transparent 60%), linear-gradient(160deg, #2C1810 0%, #1a0f09 60%, #2C1810 100%)",
    hasFlash: true,
  },
  {
    slug: "digital_diary",
    number: "No. 02",
    title: "Digital Diary",
    fantasy: "She keeps parts of herself private.",
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
    whyItSpreads: [
      ["Highly saveable", "Pinterest, TikTok, Stories. Analog layering reads as intentional, not AI."],
      ["Feels private", "The intimacy of a personal journal makes people want to share it."],
    ],
    sampleImage: "/manus-storage/template-digital-diary_11ffb1d8.jpg",
    gradient: "linear-gradient(160deg, #2C1810 0%, #1a0f09 60%, #2C1810 100%)",
    hasFlash: false,
  },
  {
    slug: "bill_please",
    number: "No. 03",
    title: "Bill, Please",
    fantasy: "She paid and left.",
    subtitle:
      "She reaches for the check. Calm, unbothered, final. The gesture says everything the caption does not.",
    hooks: [
      "i stopped arguing",
      "the bill was cheaper than the lesson",
      "she paid and left",
      "quietly covered it",
      "check, please",
      "i leave quietly now",
      "the table was hers",
    ],
    whyItSpreads: [
      ["Emotionally loaded", "Paying the check is a power move. Everyone who has been there knows it."],
      ["Detached and devastating", "The hook lands because it says nothing and everything at once."],
    ],
    sampleImage: "/manus-storage/template-bill-please_7eacca04.jpg",
    gradient: "linear-gradient(160deg, #1a0a06 0%, #2C1810 50%, #1a0a06 100%)",
    hasFlash: false,
  },
  {
    slug: "silk_robe_room_service",
    number: "No. 04",
    title: "Silk Robe\nRoom Service",
    fantasy: "She ordered for one.",
    subtitle:
      "Hotel suite. Silk robe. Morning light. Room service tray. The luxury of an unhurried morning that belongs entirely to her.",
    hooks: [
      "ordered for one",
      "room service and silence",
      "this is the life",
      "no one else in the frame",
      "mornings like this",
      "room to herself",
      "the good kind of alone",
    ],
    whyItSpreads: [
      ["Rich Grandma Energy", "Quiet luxury, no performance. The fantasy of solitude as the ultimate flex."],
      ["Most saved aesthetic", "Warm tones and soft light. Pinterest and Stories save this forever."],
    ],
    sampleImage: "/manus-storage/template-silk-robe_705e049a.jpg",
    gradient: "linear-gradient(160deg, #2C1810 0%, #3d1f0e 50%, #2C1810 100%)",
    hasFlash: false,
  },
  {
    slug: "irish_goodbye",
    number: "No. 05",
    title: "The\nGoodbye",
    fantasy: "She left without explaining herself.",
    subtitle:
      "Seen from behind. Mid-stride. Not looking back. The crowd is blurred. She is already somewhere else in her head.",
    hooks: [
      "she left without saying goodbye",
      "i stopped explaining my exits",
      "left the way i arrived",
      "no announcement",
      "she was already gone",
      "the door closed quietly",
    ],
    whyItSpreads: [
      ["The exit is the statement", "Walking away without explaining yourself is the most powerful thing a woman can do."],
      ["Cinematic without trying", "Motion blur, night light, a woman in motion. It looks like a movie still."],
    ],
    sampleImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-irish-goodbye-ktzNEA3LBpMXoScC2CgPoj.webp",
    gradient: "linear-gradient(160deg, #1a0f09 0%, #2C1810 50%, #1a0f09 100%)",
    hasFlash: false,
  },
  {
    slug: "cleopatra_principle",
    number: "No. 06",
    title: "The Cleopatra\nPrinciple",
    fantasy: "She already decided.",
    subtitle:
      "Velvet chaise. Direct eye contact. No smile, no performance. The stillness of someone who has already decided everything.",
    hooks: [
      "she already decided",
      "the room adjusted to her",
      "she did not ask",
      "presence is a full-time job",
      "calm is a power move",
      "the decision was already made",
    ],
    whyItSpreads: [
      ["Presence without performance", "No smile, no pose. Just a woman who knows. That stillness is more powerful than any caption."],
      ["The gaze does the work", "Direct eye contact into the lens. The most commanding shot in editorial photography."],
    ],
    sampleImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-cleopatra-RNkWpwxV5GeWZwStmYqiQx.webp",
    gradient: "linear-gradient(160deg, #1a0a06 0%, #2C1810 50%, #1a0a06 100%)",
    hasFlash: false,
  },
  {
    slug: "silk_robe_retaliation",
    number: "No. 07",
    title: "The Robe\nReset",
    fantasy: "She chose herself. Again.",
    subtitle:
      "Floor-to-ceiling windows. Silk robe. Golden hour. Seen from behind. The energy of someone who does not need to explain her peace.",
    hooks: [
      "my isolation is a luxury maintenance ritual",
      "she chose herself again",
      "ordered for one",
      "rich grandma energy, activated",
      "no one earned access to this morning",
      "the robe stays on",
    ],
    whyItSpreads: [
      ["Rich Grandma Energy", "Silk robe, no one else in the frame. The fantasy of choosing yourself completely."],
      ["The retaliation is the peace", "She is not angry. She is not sad. She just chose this."],
    ],
    sampleImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-silk-robe-retaliation-MJXwGjfHhTjt3ENoPKdG8s.webp",
    gradient: "linear-gradient(160deg, #2C1810 0%, #3d1f0e 50%, #2C1810 100%)",
    hasFlash: false,
  },
  {
    slug: "motion_blur",
    number: "No. 08",
    title: "The\nBlur",
    fantasy: "She became the moment.",
    subtitle:
      "Photographed through taxi glass at night. City light reflections. Her silhouette barely visible. The image feels accidentally captured mid-life.",
    hooks: [
      "she was always somewhere interesting",
      "the world blurred around her",
      "in motion",
      "she never stood still long enough to be ordinary",
      "the blur is the point",
      "she was already gone",
    ],
    whyItSpreads: [
      ["Accidentally beautiful", "It looks like a real photo taken through a taxi window. The blur is the aesthetic."],
      ["Night energy", "Neon, amber, wet glass. The most cinematic template in the collection."],
    ],
    sampleImage: null,
    gradient: "linear-gradient(160deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)",
    hasFlash: false,
  },
];

// Short nav labels for horizontal pill navigation
const NAV_LABELS: Record<string, string> = {
  paparazzi_flash: "Caught",
  digital_diary: "Diary",
  bill_please: "Bill",
  silk_robe_room_service: "Room Service",
  irish_goodbye: "Goodbye",
  cleopatra_principle: "Cleopatra",
  silk_robe_retaliation: "Robe Reset",
  motion_blur: "The Blur",
};

export default function Templates() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [hoveredHooks, setHoveredHooks] = useState<Record<string, string | null>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: templateCounts } = trpc.generations.templateCounts.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const handleMakeMine = (slug: string) => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    navigate(`/generate?template=${slug}`);
  };

  const scrollToTemplate = (slug: string) => {
    const el = cardRefs.current[slug];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
        <span className="font-serif text-base tracking-widest text-charcoal">Styling Worlds</span>
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

      {/* Horizontal pill navigation */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-sand">
        <div className="flex overflow-x-auto gap-0 scrollbar-hide">
          {TEMPLATES.map((t) => (
            <button
              key={t.slug}
              onClick={() => scrollToTemplate(t.slug)}
              className="flex-shrink-0 px-5 py-3.5 font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft hover:text-charcoal hover:bg-sand/40 transition-all duration-150 whitespace-nowrap border-r border-sand last:border-r-0"
            >
              {NAV_LABELS[t.slug]}
            </button>
          ))}
        </div>
      </div>

      {/* Template cards */}
      <div className="flex-1 flex flex-col">
        {TEMPLATES.map((template, idx) => (
          <div
            key={template.slug}
            ref={(el) => { cardRefs.current[template.slug] = el; }}
            className={idx > 0 ? "border-t border-sand" : ""}
          >
            {/* Hero card */}
            <div className="relative" style={{ minHeight: "65vh" }}>
              {/* Sample image or gradient fallback */}
              {template.sampleImage && !imgErrors[template.slug] ? (
                <img
                  src={template.sampleImage}
                  alt={template.title.replace("\n", " ")}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "center top" }}
                  onError={() => setImgErrors((prev) => ({ ...prev, [template.slug]: true }))}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: template.gradient }}
                />
              )}

              {/* Dark overlay for text legibility */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(26,15,9,0.45) 0%, rgba(26,15,9,0.15) 35%, rgba(26,15,9,0.80) 100%)",
                }}
              />

              {/* Grain overlay */}
              <div
                className="absolute inset-0 opacity-[0.18]"
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
              <div
                className="relative z-10 flex flex-col items-center justify-end px-6 pb-12 pt-16 text-center"
                style={{ minHeight: "65vh" }}
              >
                <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold/70 mb-3">
                  {template.number}
                </p>
                <h2 className="font-serif text-4xl font-light text-cream leading-tight mb-3 whitespace-pre-line">
                  {template.title}
                </h2>
                {/* Emotional fantasy — the one-line hook */}
                <p className="font-serif text-sm italic text-gold/90 mb-4 tracking-wide">
                  {template.fantasy}
                </p>
                <p className="font-sans font-light text-xs text-cream/60 leading-relaxed max-w-xs mb-8">
                  {template.subtitle}
                </p>

                {/* Hook chips */}
                <div className="mb-8 w-full max-w-xs">
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
                            : "border-cream/20 text-cream/40"
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
                {!user && (
                  <p className="mt-3 font-sans text-xs text-cream/35">
                    Free to try. No credit card.
                  </p>
                )}
              </div>
            </div>

            {/* Why it spreads */}
            <div className="px-6 py-8 border-t border-sand max-w-sm mx-auto w-full">
              <p className="font-sans text-xs tracking-[0.2em] uppercase text-charcoal-soft mb-5 text-center">
                Why it spreads
              </p>
              <div className="space-y-3">
                {template.whyItSpreads.map(([title, desc]) => (
                  <div key={title} className="flex gap-3">
                    <div className="w-1 h-1 rounded-full bg-gold mt-[7px] flex-shrink-0" />
                    <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                      <span className="text-charcoal font-medium">{title}. </span>
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="px-6 pb-10 pt-2 max-w-xs mx-auto w-full">
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
