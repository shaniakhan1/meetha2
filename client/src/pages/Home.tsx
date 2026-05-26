import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const WHAT_YOU_LEARN = [
  {
    label: "Your color palette",
    text: "The exact warm ivories, deep ambers, and metals that belong in your frame. The cool tones that fight your skin.",
  },
  {
    label: "Your jewelry direction",
    text: "Which metals suit your frequency. How to stack. What to reach for before a shoot or a dinner.",
  },
  {
    label: "Your makeup register",
    text: "Bold lip or skin-forward. Strong brow or soft. The one move that makes every image unmistakably yours.",
  },
  {
    label: "Your lighting brief",
    text: "Late afternoon window. Hard directional. How to recreate the exact light in your generated images, at home, with your phone.",
  },
  {
    label:     "Your fabric frequency",
    text: "Silk, cashmere, heavyweight jersey, crepe. Anything that catches light. Nothing synthetic. Your wardrobe anchor piece.",
  },
];

const FEATURES = {
  free: [
    "1 generation to start",
    "Personal styling brief after each generation",
    "Hook and caption generation",
    "1 free LoRA training (your face)",
    "Watermarked downloads",
  ],
  starter: [
    "10 generations per month",
    "Personal styling brief, saved to your profile",
    "Hook and caption generation",
    "Download without watermark",
    "Retrain anytime for $19",
  ],
  pro: [
    "25 generations per month",
    "Personal styling brief, saved to your profile",
    "Hook and caption generation",
    "Download without watermark",
    "Retrain anytime for $19",
    "Priority generation queue",
  ],
};

function PricingSection({ handleCTA }: { handleCTA: () => void }) {
  const [annual, setAnnual] = useState(false);

  const starterLink = annual
    ? import.meta.env.VITE_STRIPE_STARTER_ANNUAL_LINK
    : import.meta.env.VITE_STRIPE_STARTER_LINK;
  const proLink = annual
    ? import.meta.env.VITE_STRIPE_PRO_ANNUAL_LINK
    : import.meta.env.VITE_STRIPE_PRO_LINK;

  return (
    <section className="py-20 px-6" style={{ background: "#2C1810" }}>
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">Pricing</p>
          <h2 className="font-serif font-light text-cream mb-4">Start free. Scale when ready.</h2>
          <div className="divider-editorial" />
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <button
            onClick={() => setAnnual(false)}
            className={`font-sans text-xs tracking-[0.15em] uppercase transition-colors ${
              !annual ? "text-cream" : "text-sand-dark/50"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-10 h-5 flex-shrink-0"
            aria-label="Toggle billing period"
          >
            <span
              className="absolute inset-0 border transition-colors"
              style={{ borderColor: annual ? "oklch(78% 0.09 75)" : "oklch(88% 0.025 70 / 0.3)" }}
            />
            <span
              className="absolute top-0.5 w-4 h-4 transition-all duration-200"
              style={{
                left: annual ? "calc(100% - 1.125rem)" : "0.125rem",
                background: annual ? "oklch(78% 0.09 75)" : "oklch(88% 0.025 70 / 0.4)",
              }}
            />
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`font-sans text-xs tracking-[0.15em] uppercase transition-colors ${
              annual ? "text-cream" : "text-sand-dark/50"
            }`}
          >
            Annual
          </button>
          {annual && (
            <span
              className="font-sans text-xs tracking-wide px-2 py-0.5"
              style={{ color: "oklch(78% 0.09 75)", border: "1px solid oklch(78% 0.09 75 / 0.4)" }}
            >
              Save up to 40%
            </span>
          )}
        </div>

        {/* Tier cards */}
        <div className="space-y-5">
          {/* Free */}
          <div className="p-7 border border-sand/20 text-left">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-sand-dark mb-4">Free</p>
            <p className="font-serif text-4xl text-cream mb-1">$0</p>
            <p className="font-sans text-xs text-sand-dark/60 mb-6">1 generation. No credit card.</p>
            <ul className="space-y-2">
              {FEATURES.free.map((f) => (
                <li key={f} className="font-sans text-xs text-sand-dark flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-sand-dark/40 flex-shrink-0 mt-1.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Starter */}
          <div className="p-7 border border-gold/40 text-left relative">
            <div className="absolute -top-px left-0 right-0 h-px" style={{ background: "oklch(78% 0.09 75)" }} />
            <div className="flex items-start justify-between mb-4">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold">Starter</p>
              <span className="font-sans text-xs text-gold/60 tracking-wide">Most popular</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <p className="font-serif text-4xl text-cream">
                {annual ? "$12.67" : "$19"}
              </p>
              <p className="font-sans text-xs text-sand-dark/60">/ mo</p>
            </div>
            {annual ? (
              <p className="font-sans text-xs text-sand-dark/60 mb-6">$152 billed annually. Save $76.</p>
            ) : (
              <p className="font-sans text-xs text-sand-dark/60 mb-6">10 generations / month</p>
            )}
            <ul className="space-y-2">
              {FEATURES.starter.map((f) => (
                <li key={f} className="font-sans text-xs text-sand-dark flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-gold flex-shrink-0 mt-1.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="p-7 border border-sand/20 text-left">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-sand-dark mb-4">Pro</p>
            <div className="flex items-baseline gap-2 mb-1">
              <p className="font-serif text-4xl text-cream">
                {annual ? "$21" : "$35"}
              </p>
              <p className="font-sans text-xs text-sand-dark/60">/ mo</p>
            </div>
            {annual ? (
              <p className="font-sans text-xs text-sand-dark/60 mb-6">$252 billed annually. Save $168.</p>
            ) : (
              <p className="font-sans text-xs text-sand-dark/60 mb-6">25 generations / month</p>
            )}
            <ul className="space-y-2">
              {FEATURES.pro.map((f) => (
                <li key={f} className="font-sans text-xs text-sand-dark flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-sand-dark/40 flex-shrink-0 mt-1.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 space-y-3">
          <a
            href={starterLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxury btn-gold w-full text-center block"
          >
            {annual ? "Starter ($152 / year)" : "Starter ($19 / month)"}
          </a>
          <a
            href={proLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxury btn-luxury-outline w-full text-center block"
            style={{ color: "oklch(97% 0.012 80)", borderColor: "oklch(88% 0.025 70 / 0.4)" }}
          >
            {annual ? "Pro ($252 / year)" : "Pro ($35 / month)"}
          </a>
          <button
            onClick={handleCTA}
            className="w-full py-3 font-sans text-xs tracking-widest uppercase text-sand-dark/60 hover:text-sand-dark transition-colors"
          >
            Start free instead
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 3,
    retryDelay: 500,
  });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (profileQuery.isLoading || profileQuery.isFetching) return;
    if (profileQuery.data?.onboarding_complete) {
      navigate("/dashboard");
    } else if (profileQuery.data !== undefined) {
      navigate("/onboarding");
    }
  }, [isAuthenticated, loading, profileQuery.isLoading, profileQuery.isFetching, profileQuery.data, navigate]);

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/sign-in");
    }
  };

  return (
    <div className="min-h-screen bg-cream overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 bg-cream/90 backdrop-blur-sm">
        <span
          className="font-serif text-xl tracking-widest text-charcoal cursor-pointer"
          onClick={() => navigate("/")}
        >
          MEETHA
        </span>
        <button
          onClick={handleCTA}
          className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors duration-200"
        >
          {isAuthenticated ? "Dashboard" : "Sign In"}
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center px-6 pt-28 pb-0 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, oklch(88% 0.025 70 / 0.6) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-sm mx-auto w-full">
          <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold mb-6 animate-fade-up opacity-0 delay-100">
            Aesthetic intelligence for women
          </p>

          <h1
            className="font-serif font-light text-charcoal mb-8 animate-fade-up opacity-0 delay-200"
            style={{ lineHeight: 1.0, fontSize: "clamp(2.8rem, 10vw, 4.5rem)" }}
          >
            Upload your photos.<br />
            See yourself<br />
            the way a stylist<br />
            would.
          </h1>

          {/* ── Immediate image proof ── */}
          <div className="w-full mb-8 animate-fade-up opacity-0 delay-300">
            {/* Hero portrait */}
            <div className="w-full aspect-[3/4] overflow-hidden mb-1">
              <img
                src="/manus-storage/meetha-59_1803b502.jpg"
                alt="Meetha AI styling result"
                className="w-full h-full object-cover object-center"
              />
            </div>
            {/* Two-column row */}
            <div className="grid grid-cols-2 gap-1">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src="/manus-storage/gallery_street_lights_8c7a051f.jpg"
                  alt="Meetha AI styling result"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src="/manus-storage/gallery_hands_coffee_b7861070.webp"
                  alt="Meetha AI styling result"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="divider-editorial animate-fade-in opacity-0 delay-400" />

          <p className="font-sans font-light text-base text-charcoal-soft leading-relaxed mb-10 animate-fade-up opacity-0 delay-400">
            Meetha learns your aesthetic and tells you what to wear, what jewelry to reach for, and how to light your next shoot. Then it generates cinematic images that look like you, in any scene.
          </p>

          <div className="flex flex-col items-center gap-4 pb-20 animate-fade-up opacity-0 delay-500">
            <button onClick={handleCTA} className="btn-luxury w-full max-w-xs">
              Get your aesthetic read
            </button>
            <p className="font-sans text-xs text-charcoal-soft tracking-wide">
              1 free generation. No credit card.
            </p>
          </div>
        </div>
      </section>

      {/* ── What You Learn ── */}
      <section className="py-28 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto text-center">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
            Your styling brief
          </p>
          <h2 className="font-serif font-light text-charcoal mb-4">
            Not just images.<br />A brief for your real life.
          </h2>
          <div className="divider-editorial" />
          <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
            After every generation, Meetha tells you exactly what it chose and why, so you can recreate it in real life.
          </p>
        </div>

        <div className="max-w-sm mx-auto mt-16 space-y-12">
          {WHAT_YOU_LEARN.map((item, i) => (
            <div key={i} className="flex gap-5 items-start">
              <div className="w-px h-12 bg-gold/40 flex-shrink-0 mt-1" />
              <div>
                <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal mb-2">
                  {item.label}
                </p>
                <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-28 px-6 bg-cream">
        <div className="max-w-sm mx-auto text-center mb-12">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
            How it works
          </p>
          <h2 className="font-serif font-light text-charcoal mb-4">
            Three steps. Under 60 seconds.
          </h2>
          <div className="divider-editorial" />
        </div>

        <div className="max-w-sm mx-auto space-y-6">
          {[
            {
              step: "01",
              title: "Upload your photos",
              text: "Meetha trains a personal AI model on your face. Every image it creates will actually look like you, in any scene, any outfit, any lighting.",
            },
            {
              step: "02",
              title: "Choose your scene",
              text: "Caught Looking Expensive. The Goodbye. Room Service. The Cleopatra Principle. Pick the scene. Meetha handles the rest.",
            },
            {
              step: "03",
              title: "Get your brief",
              text: "A cinematic image of you, a caption ready to post, and a full styling brief: your colors, your metals, your makeup direction, your lighting. Yours to keep.",
            },
          ].map((item) => (
            <div key={item.step} className="p-6 border border-sand bg-warm-white/60">
              <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-3">
                {item.step}
              </p>
              <h3 className="font-serif text-lg text-charcoal mb-2">{item.title}</h3>
              <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Output Example ── */}
      <section className="py-28 px-6 bg-cream">
        <div className="max-w-sm mx-auto text-center mb-10">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
            What you get
          </p>
          <h2 className="font-serif font-light text-charcoal mb-4">
            Meetha styled me.
          </h2>
          <div className="divider-editorial" />
        </div>

        <div className="max-w-sm mx-auto">
          <div className="border border-sand bg-warm-white overflow-hidden">
            <div className="relative w-full overflow-hidden" style={{ height: "320px" }}>
              <img
                src="/manus-storage/hero_sample_f65e4d53.jpg"
                alt="Content example"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}>
                <p className="font-serif text-lg text-white leading-snug">
                  peace changed my face
                </p>
                <p className="font-sans text-xs tracking-widest uppercase text-white/50 mt-1">
                  meetha
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold">
                Your Styling Brief
              </p>
              <div className="space-y-2">
                {[
                  ["Palette", "Warm ivory, deep camel, amber gold. No cool tones"],
                  ["Metals", "Warm yellow gold only. Stack it."],
                  ["Makeup", "Bold lip, strong brow, minimal eye. The mouth is your focal point."],
                  ["Lighting", "Late afternoon window, light source left or right. Never straight on."],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <span className="font-sans text-xs text-gold/70 w-16 flex-shrink-0">{label}</span>
                    <span className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="font-sans text-xs text-charcoal-soft text-center mt-5 tracking-wide">
            Generated in under 30 seconds. Styled to you.
          </p>
        </div>
      </section>

      {/* ── The Difference ── */}
      <section className="py-28 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-12">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
              Not AI slop
            </p>
            <h2 className="font-serif font-light text-charcoal mb-4">
              This is your aesthetic.<br />Not a filter.
            </h2>
            <div className="divider-editorial" />
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
              Meetha generates the life itself. Then it tells you exactly how to bring it into your real wardrobe, your real shoots, your real self.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { label: "It trains on your face", text: "Every image actually looks like you. Not a generic model. You." },
              { label: "It reads your body", text: "Tell Meetha your proportions once. Every scene is shaped around your silhouette." },
              { label: "It gives you a brief", text: "Not just an image. A complete styling direction you can take to a shoot, a store, or a hairdresser." },
              { label: "It learns as you generate", text: "The more you create, the more refined your brief becomes. It remembers what you kept." },
            ].map((item, i) => (
              <div key={i} className="p-5 border border-sand bg-cream/60">
                <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold mb-1.5">
                  {item.label}
                </p>
                <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-28 px-6 bg-cream">
        <div className="max-w-sm mx-auto text-center">
          <div className="divider-editorial mb-12" />
          <blockquote className="font-serif font-light text-charcoal leading-snug mb-6" style={{ fontSize: "clamp(1.5rem, 6vw, 2rem)" }}>
            "It showed me my colors, my jewelry, my makeup. It gave me ideas to improve my content I never would have thought of."
          </blockquote>
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
            Meetha user
          </p>
          <div className="divider-editorial mt-10" />
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection handleCTA={handleCTA} />

      {/* ── Final CTA ── */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: "linear-gradient(160deg, #2C1810 0%, #1a0f09 100%)" }}
      >
        <div className="max-w-sm mx-auto">
          <h2 className="font-serif font-light text-cream mb-4" style={{ lineHeight: 1.1 }}>
            Get your ideal aesthetic.<br />On Meetha.
          </h2>
          <p className="font-sans font-light text-sm text-sand-dark leading-relaxed mb-10">
            Upload your photos. See yourself the way a stylist, a photographer, and a creative director would.
          </p>
          <button onClick={handleCTA} className="btn-luxury btn-gold w-full max-w-xs mx-auto block">
            Get started free
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 bg-cream border-t border-sand/30">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <span className="font-serif text-sm tracking-widest text-charcoal">MEETHA</span>
          <p className="font-sans text-xs text-charcoal-soft/50">
            © {new Date().getFullYear()} Meetha Studio
          </p>
        </div>
      </footer>
    </div>
  );
}
