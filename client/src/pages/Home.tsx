import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const WHAT_YOU_LEARN = [
  {
    label: "Your color palette",
    text: "The exact warm ivories, deep ambers, and metals that belong in your frame — and the cool tones that fight your skin.",
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
    text: "Late afternoon window. Hard directional. How to recreate the exact light in your generated images — at home, with your phone.",
  },
  {
    label: "Your fabric frequency",
    text: "Silk, satin, heavyweight jersey. Anything that catches light. Nothing synthetic. Your wardrobe anchor piece.",
  },
];

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
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, oklch(88% 0.025 70 / 0.6) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-64 opacity-20"
          style={{
            background: "linear-gradient(to top, oklch(72% 0.090 65 / 0.15), transparent)",
          }}
        />

        <div className="relative z-10 max-w-sm mx-auto">
          <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold mb-6 animate-fade-up opacity-0 delay-100">
            Aesthetic intelligence for women
          </p>

          <h1
            className="font-serif font-light text-charcoal mb-6 animate-fade-up opacity-0 delay-200"
            style={{ lineHeight: 1.05 }}
          >
            Upload your photos.<br />
            See yourself the way a stylist would.
          </h1>

          <div className="divider-editorial animate-fade-in opacity-0 delay-300" />

          <p className="font-sans font-light text-base text-charcoal-soft leading-relaxed mb-10 animate-fade-up opacity-0 delay-300">
            Meetha learns your aesthetic and tells you what to wear, what jewelry to reach for, and how to light your next shoot. Then it generates cinematic images that look like you — in any scene.
          </p>

          <div className="flex flex-col items-center gap-4 animate-fade-up opacity-0 delay-400">
            <button onClick={handleCTA} className="btn-luxury w-full max-w-xs">
              Get your aesthetic read
            </button>
            <p className="font-sans text-xs text-charcoal-soft tracking-wide">
              3 free generations. No credit card.
            </p>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in opacity-0 delay-500">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-gold/60" />
        </div>
      </section>

      {/* ── What You Learn ── */}
      <section className="py-20 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto text-center">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
            Your styling brief
          </p>
          <h2 className="font-serif font-light text-charcoal mb-4">
            Not just images.<br />A brief for your real life.
          </h2>
          <div className="divider-editorial" />
          <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
            After every generation, Meetha tells you exactly what it chose and why — so you can recreate it in real life.
          </p>
        </div>

        <div className="max-w-sm mx-auto mt-14 space-y-10">
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
      <section className="py-20 px-6 bg-cream">
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
              text: "Meetha trains a personal AI model on your face. Every image it creates will actually look like you — in any scene, any outfit, any lighting.",
            },
            {
              step: "02",
              title: "Choose your scene",
              text: "Hotel suite morning. Caught looking expensive. Irish goodbye. Ordered everything. Pick the energy. Meetha handles the rest.",
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
      <section className="py-20 px-6 bg-cream">
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
                src="/manus-storage/shania-hero_9923f04f.png"
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
                  ["Palette", "Warm ivory, deep camel, amber gold — no cool tones"],
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
      <section className="py-20 px-6 bg-warm-white">
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
              Tezza sells presets for your real photos. Meetha generates the life itself — and then tells you how to bring it into your real wardrobe, your real shoots, your real self.
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
      <section className="py-20 px-6 bg-cream">
        <div className="max-w-sm mx-auto text-center">
          <div className="divider-editorial mb-10" />
          <blockquote className="font-serif font-light text-2xl text-charcoal leading-snug mb-6">
            "It showed me my colors, my jewelry, my makeup. It gave me ideas to improve my content I never would have thought of."
          </blockquote>
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
            Meetha user
          </p>
          <div className="divider-editorial mt-10" />
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-6" style={{ background: "#2C1810" }}>
        <div className="max-w-sm mx-auto text-center">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
            Simple pricing
          </p>
          <h2 className="font-serif font-light text-cream mb-4">
            Start free. Scale when ready.
          </h2>
          <div className="divider-editorial" />

          <div className="mt-12 space-y-6">
            {/* Free */}
            <div className="p-8 border border-sand/20 text-left">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-sand-dark mb-4">Free</p>
              <p className="font-serif text-4xl text-cream mb-1">$0</p>
              <p className="font-sans text-xs text-sand-dark mb-6">3 intentional generations to start</p>
              <ul className="space-y-2">
                {[
                  "3 free generations",
                  "Full styling brief after each generation",
                  "Hook + caption generation",
                  "1 free LoRA training (your face)",
                  "Download ready assets",
                ].map((f) => (
                  <li key={f} className="font-sans text-xs text-sand-dark flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Starter */}
            <div className="p-8 border border-gold/40 text-left relative">
              <div className="absolute -top-3 left-6 bg-gold px-3 py-1">
                <p className="font-sans text-xs tracking-widest uppercase text-warm-white">Popular</p>
              </div>
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold mb-4">Starter</p>
              <p className="font-serif text-4xl text-cream mb-1">$19</p>
              <p className="font-sans text-xs text-sand-dark mb-6">per month</p>
              <ul className="space-y-2">
                {[
                  "30 generations per month",
                  "Full styling brief — saved to your profile",
                  "Hook + caption generation",
                  "Download without watermark",
                  "Retrain anytime for $19",
                ].map((f) => (
                  <li key={f} className="font-sans text-xs text-sand-dark flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="p-8 border border-sand/20 text-left">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-sand-dark mb-4">Pro</p>
              <p className="font-serif text-4xl text-cream mb-1">$39</p>
              <p className="font-sans text-xs text-sand-dark mb-6">per month</p>
              <ul className="space-y-2">
                {[
                  "75 generations per month",
                  "Full styling brief — saved to your profile",
                  "Hook + caption generation",
                  "Download without watermark",
                  "Retrain anytime for $19",
                  "Priority generation queue",
                ].map((f) => (
                  <li key={f} className="font-sans text-xs text-sand-dark flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            <a
              href={import.meta.env.VITE_STRIPE_STARTER_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-luxury btn-gold w-full text-center block"
            >
              Start with Starter — $19 / mo
            </a>
            <a
              href={import.meta.env.VITE_STRIPE_PRO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-luxury btn-luxury-outline w-full text-center block"
              style={{ color: "oklch(97% 0.012 80)", borderColor: "oklch(88% 0.025 70 / 0.4)" }}
            >
              Go Pro — $39 / mo
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
