import { useState, useEffect } from "react";
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
    label: "Your fabric frequency",
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
    "Your Visual Transformation Card (after 2nd generation)",
    "Personal styling brief, saved to your profile",
    "Hook and caption generation",
    "Download without watermark",
    "Retrain anytime for $19",
  ],
  pro: [
    "25 generations per month",
    "Your Visual Transformation Card (after 1st generation)",
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
    <section className="py-16 px-6" style={{ background: "#2C1810" }}>
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">Pricing</p>
          <h2 className="font-serif font-light text-cream mb-4">Start free. Scale when ready.</h2>
          <div className="divider-editorial" />
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setAnnual(false)}
            className={`font-sans text-xs tracking-[0.15em] uppercase transition-colors ${
              !annual ? "text-cream" : "text-sand-dark/50"
            }`}
          >
            Monthly
          </button>
          <div
            className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
            style={{ background: annual ? "#8B6914" : "rgba(255,255,255,0.15)" }}
            onClick={() => setAnnual(!annual)}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-cream transition-all"
              style={{ left: annual ? "calc(100% - 18px)" : "2px" }}
            />
          </div>
          <button
            onClick={() => setAnnual(true)}
            className={`font-sans text-xs tracking-[0.15em] uppercase transition-colors ${
              annual ? "text-cream" : "text-sand-dark/50"
            }`}
          >
            Annual
            <span className="ml-2 text-gold">Save 40%</span>
          </button>
        </div>

        {/* Tiers */}
        <div className="space-y-4">
          {/* Free */}
          <div className="p-5 border border-sand/20 bg-white/5">
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-serif text-lg text-cream">Free</p>
              <p className="font-sans text-xs text-sand-dark">$0</p>
            </div>
            <ul className="space-y-1.5 mb-4">
              {FEATURES.free.map((f) => (
                <li key={f} className="font-sans text-xs text-sand-dark/70 flex gap-2">
                  <span className="text-gold/60">—</span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={handleCTA} className="w-full py-3 border border-sand/30 font-sans text-xs tracking-[0.15em] uppercase text-cream/70 hover:text-cream transition-colors">
              Get started
            </button>
          </div>

          {/* Starter */}
          <div className="p-5 border border-gold/40 bg-white/5">
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-serif text-lg text-cream">Starter</p>
              <p className="font-sans text-xs text-sand-dark">{annual ? "$12.67/mo" : "$19/mo"}</p>
            </div>
            <ul className="space-y-1.5 mb-4">
              {FEATURES.starter.map((f) => (
                <li key={f} className="font-sans text-xs text-sand-dark/70 flex gap-2">
                  <span className="text-gold/60">—</span>
                  {f}
                </li>
              ))}
            </ul>
            {starterLink ? (
              <a href={starterLink} target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-gold/90 hover:bg-gold text-center font-sans text-xs tracking-[0.15em] uppercase text-charcoal transition-colors">
                Start Starter
              </a>
            ) : (
              <button onClick={handleCTA} className="w-full py-3 bg-gold/90 hover:bg-gold font-sans text-xs tracking-[0.15em] uppercase text-charcoal transition-colors">
                Start Starter
              </button>
            )}
          </div>

          {/* Pro */}
          <div className="p-5 border border-sand/20 bg-white/5">
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-serif text-lg text-cream">Pro</p>
              <p className="font-sans text-xs text-sand-dark">{annual ? "$21/mo" : "$39/mo"}</p>
            </div>
            <ul className="space-y-1.5 mb-4">
              {FEATURES.pro.map((f) => (
                <li key={f} className="font-sans text-xs text-sand-dark/70 flex gap-2">
                  <span className="text-gold/60">—</span>
                  {f}
                </li>
              ))}
            </ul>
            {proLink ? (
              <a href={proLink} target="_blank" rel="noopener noreferrer" className="block w-full py-3 border border-gold/40 text-center font-sans text-xs tracking-[0.15em] uppercase text-cream/70 hover:text-cream transition-colors">
                Start Pro
              </a>
            ) : (
              <button onClick={handleCTA} className="w-full py-3 border border-gold/40 font-sans text-xs tracking-[0.15em] uppercase text-cream/70 hover:text-cream transition-colors">
                Start Pro
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
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
            Your visual identity system
          </p>

          <h1
            className="font-serif font-light text-charcoal mb-8 animate-fade-up opacity-0 delay-200"
            style={{ lineHeight: 1.0, fontSize: "clamp(2.8rem, 10vw, 4.5rem)" }}
          >
            The first AI that designs<br />
            your visual identity.
          </h1>

          {/* ── Immediate image proof ── */}
          <div className="w-full mb-8 animate-fade-up opacity-0 delay-300">
            {/* Hero portrait */}
            <div className="w-full aspect-[3/4] overflow-hidden mb-1">
              <img
                src="/manus-storage/meetha-59_1803b502.jpg"
                alt="Meetha styling result"
                className="w-full h-full object-cover object-center"
              />
            </div>
            {/* Two-column row */}
            <div className="grid grid-cols-2 gap-1">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src="/manus-storage/gallery_street_lights_8c7a051f.jpg"
                  alt="Meetha styling result"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src="/manus-storage/gallery_hands_coffee_b7861070.webp"
                  alt="Meetha styling result"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="divider-editorial animate-fade-in opacity-0 delay-400" />

          <p className="font-sans font-light text-base text-charcoal-soft leading-relaxed mb-8 animate-fade-up opacity-0 delay-400">
            Upload your photos. Meetha reads your coloring, energy, and aesthetic — then shows you exactly who you are visually, and how to show up that way every time.
          </p>

          <div className="flex flex-col items-center gap-4 pb-16 animate-fade-up opacity-0 delay-500">
            <button onClick={handleCTA} className="btn-luxury w-full max-w-xs">
              Discover your visual identity
            </button>
            <p className="font-sans text-xs text-charcoal-soft tracking-wide">
              1 free generation. No credit card.
            </p>
          </div>
        </div>
      </section>

      {/* ── Before / After Coherence ── */}
      <section className="py-16 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-10">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              The transformation
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3" style={{ lineHeight: 1.1 }}>
              She finally looks aligned.
            </h2>
            <div className="divider-editorial" />
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
              Not better. Not hotter. Most like herself. That is the shift Meetha makes.
            </p>
          </div>

          {/* Side by side */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div className="relative">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src="/manus-storage/shania-before_bb452c9e.webp"
                  alt="Before — unaligned styling"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="absolute top-3 left-3">
                <span className="font-sans text-[10px] tracking-[0.2em] uppercase bg-cream/90 text-charcoal px-2 py-1">
                  Before
                </span>
              </div>
              <p className="font-sans text-xs text-charcoal-soft/70 text-center mt-2 tracking-wide">
                trend-following
              </p>
            </div>
            <div className="relative">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src="/manus-storage/meetha-59_1803b502.jpg"
                  alt="After — identity-aligned"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <div className="absolute top-3 left-3">
                <span className="font-sans text-[10px] tracking-[0.2em] uppercase bg-charcoal/80 text-cream px-2 py-1">
                  After
                </span>
              </div>
              <p className="font-sans text-xs text-charcoal-soft/70 text-center mt-2 tracking-wide">
                identity-based
              </p>
            </div>
          </div>

          {/* Identity brief cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Color palette", text: "Warm ivory, deep camel, amber gold. No cool tones." },
              { label: "Jewelry direction", text: "Bold yet refined gold. Quality over quantity. Timeless." },
              { label: "Makeup energy", text: "Sculpted, warm, luminous. Bold lip. The mouth is your focal point." },
              { label: "Your presence", text: "Confident. Refined. Magnetic. You don't follow trends. You set the tone." },
            ].map((card) => (
              <div key={card.label} className="p-3 border border-sand bg-cream/60">
                <p className="font-sans text-[9px] tracking-[0.15em] uppercase text-gold mb-1.5">
                  {card.label}
                </p>
                <p className="font-sans font-light text-[11px] text-charcoal-soft leading-relaxed">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Transformation Card Sign-up Hook ── */}
      <section className="py-16 px-6 bg-charcoal">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              You get this when you sign up
            </p>
            <h2 className="font-serif font-light text-cream mb-3" style={{ lineHeight: 1.1 }}>
              Your personal<br />Transformation Card.
            </h2>
            <div className="divider-editorial" />
            <p className="font-sans font-light text-sm text-cream/70 leading-relaxed mt-4">
              It's simple: upload your photos, generate your first AI look, and Meetha makes you a card. Your real photo on the left. Your elevated look on the right. Plus your exact color palette, style direction, and makeup brief — so you can recreate it in real life.
            </p>
          </div>

          {/* Card preview mockup */}
          <div className="border border-gold/30 bg-warm-white overflow-hidden mb-6" style={{boxShadow: '0 8px 40px rgba(0,0,0,0.4)'}}>
            {/* Mini before/after */}
            <div className="grid grid-cols-2 gap-0.5 bg-charcoal">
              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src="/manus-storage/shania-before_bb452c9e.webp"
                    alt="Before"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <span className="absolute top-2 left-2 font-sans text-[9px] tracking-[0.15em] uppercase bg-cream/90 text-charcoal px-1.5 py-0.5">
                  Before
                </span>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src="/manus-storage/meetha-59_1803b502.jpg"
                    alt="After"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <span className="absolute top-2 left-2 font-sans text-[9px] tracking-[0.15em] uppercase bg-charcoal/80 text-cream px-1.5 py-0.5">
                  After
                </span>
              </div>
            </div>
            {/* Brief preview */}
            <div className="bg-charcoal p-4 grid grid-cols-2 gap-3">
              {[
                { label: "Color Palette", text: "Warm ivory, camel, amber gold" },
                { label: "Style Direction", text: "Elevated essentials, luxurious textures" },
                { label: "Makeup Energy", text: "Sculpted, warm, bold lip" },
                { label: "Your Energy", text: "CONFIDENT · REFINED · MAGNETIC" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-sans text-[9px] tracking-[0.15em] uppercase text-gold/80 mb-0.5">{item.label}</p>
                  <p className="font-sans font-light text-[10px] text-cream/70 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Simple 3-step explanation */}
          <div className="space-y-3 mb-8">
            {[
              { num: "1", text: "Sign up and upload your photos" },
              { num: "2", text: "Generate your first AI look" },
              { num: "3", text: "Get your Transformation Card — yours to keep and share" },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-4">
                <span className="w-7 h-7 rounded-full border border-gold/40 flex items-center justify-center font-sans text-xs text-gold flex-shrink-0">
                  {step.num}
                </span>
                <p className="font-sans text-sm text-cream/80">{step.text}</p>
              </div>
            ))}
          </div>

          <button onClick={handleCTA} className="btn-luxury btn-gold w-full">
            Get my Transformation Card
          </button>
          <p className="font-sans text-xs text-cream/40 text-center mt-3">
            Free plan: 1 generation to try &nbsp;·&nbsp; Paid plan: get your card after your 2nd generation
          </p>
        </div>
      </section>

      {/* ── What You Learn ── */}
      <section className="py-16 px-6 bg-cream">
        <div className="max-w-sm mx-auto text-center">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
            Your identity brief
          </p>
          <h2 className="font-serif font-light text-charcoal mb-3">
            Not just images.<br />A brief for your real life.
          </h2>
          <div className="divider-editorial" />
          <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
            After every generation, Meetha tells you exactly what it chose and why, so you can recreate it in real life.
          </p>
        </div>

        <div className="max-w-sm mx-auto mt-10 space-y-8">
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
      <section className="py-16 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto text-center mb-8">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
            How it works
          </p>
          <h2 className="font-serif font-light text-charcoal mb-3">
            Three steps. Under 60 seconds.
          </h2>
          <div className="divider-editorial" />
        </div>

        <div className="max-w-sm mx-auto space-y-4">
          {[
            {
              step: "01",
              title: "Upload your photos",
              text: "Meetha trains a personal model on your face. Every image it creates will actually look like you, in any scene, any outfit, any lighting.",
            },
            {
              step: "02",
              title: "Choose your scene",
              text: "Caught Looking Expensive. The Goodbye. Room Service. The Cleopatra Principle. Pick the scene. Meetha handles the rest.",
            },
            {
              step: "03",
              title: "Get your identity brief",
              text: "A cinematic image of you, a caption ready to post, and a complete identity brief: your colors, your metals, your makeup direction, your lighting. Yours to keep.",
            },
          ].map((item) => (
            <div key={item.step} className="p-5 border border-sand bg-cream/60">
              <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-2">
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
      <section className="py-16 px-6 bg-cream">
        <div className="max-w-sm mx-auto text-center mb-8">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
            What you get
          </p>
          <h2 className="font-serif font-light text-charcoal mb-3">
            A campaign brief for your future self.
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
                Your Identity Brief
              </p>
              <div className="space-y-2">
                {[
                  ["Palette", "Warm ivory, deep camel, amber gold. No cool tones."],
                  ["Metals", "Warm yellow gold only. Stack it."],
                  ["Makeup", "Bold lip, strong brow, minimal eye. The mouth is your focal point."],
                  ["Lighting", "Late afternoon window, light source left or right. Never straight on."],
                  ["Presence", "Your presence sharpens through contrast, softness, and restraint."],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <span className="font-sans text-xs text-gold/70 w-16 flex-shrink-0">{label}</span>
                    <span className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="font-sans text-xs text-charcoal-soft text-center mt-4 tracking-wide">
            Generated in under 30 seconds. Styled to you.
          </p>
        </div>
      </section>

      {/* ── The Difference ── */}
      <section className="py-16 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Identity crystallization
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              Stop second-guessing<br />how you present.
            </h2>
            <div className="divider-editorial" />
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
              Most people think they want better photos. What they actually want is to feel recognizable to themselves. To become visually coherent. To look more like the person they feel inside. That is what Meetha gives you.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { label: "It trains on your face", text: "Every image actually looks like you. Not a generic model. You." },
              { label: "It reads your aesthetic", text: "Tell Meetha your references once. Every scene is shaped around your visual frequency." },
              { label: "It gives you a brief", text: "Not just an image. A complete identity direction you can take to a shoot, a store, or a hairdresser." },
              { label: "It builds your signature", text: "The more you create, the more refined your brief becomes. You stop following trends. You start setting them." },
            ].map((item, i) => (
              <div key={i} className="p-4 border border-sand bg-cream/60">
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
      <section className="py-16 px-6 bg-cream">
        <div className="max-w-2xl mx-auto">
          <div className="divider-editorial mb-12" />
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Testimonial 1 */}
            <div className="text-center">
              <blockquote className="font-serif font-light text-charcoal leading-snug mb-5" style={{ fontSize: "clamp(1.3rem, 5vw, 1.75rem)" }}>
                "It showed me my colors, my jewelry, my makeup. It gave me ideas to improve my content I never would have thought of."
              </blockquote>
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
                Meetha user
              </p>
            </div>
            {/* Testimonial 2 */}
            <div className="text-center">
              <blockquote className="font-serif font-light text-charcoal leading-snug mb-5" style={{ fontSize: "clamp(1.3rem, 5vw, 1.75rem)" }}>
                "I showed these to my photographer and we had the most amazing styling ideas for my shoot. It completely changed how we planned the whole session."
              </blockquote>
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
                Meetha user &mdash; content creator
              </p>
            </div>
          </div>
          <div className="divider-editorial mt-12" />
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection handleCTA={handleCTA} />

      {/* ── Final CTA ── */}
      <section
        className="px-6 py-16 text-center"
        style={{ background: "linear-gradient(160deg, #2C1810 0%, #1a0f09 100%)" }}
      >
        <div className="max-w-sm mx-auto">
          <h2 className="font-serif font-light text-cream mb-4" style={{ lineHeight: 1.1 }}>
            Become recognizable<br />to yourself.
          </h2>
          <p className="font-sans font-light text-sm text-sand-dark leading-relaxed mb-8">
            Upload your photos. Discover the colors, styling, and visual atmosphere that make you look most like yourself.
          </p>
          <button onClick={handleCTA} className="btn-luxury btn-gold w-full max-w-xs mx-auto block">
            Discover your visual identity
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 bg-cream border-t border-sand/30">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <span className="font-serif text-sm tracking-widest text-charcoal">MEETHA</span>
          <div className="flex gap-4">
            <a href="/privacy" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">Privacy</a>
            <a href="/terms" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">Terms</a>
          </div>
          <p className="font-sans text-xs text-charcoal-soft/50">
            © {new Date().getFullYear()} Meetha
          </p>
        </div>
      </footer>
    </div>
  );
}
