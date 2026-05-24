import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const ARCHETYPES = [
  {
    name: "Luxury Minimal",
    tagline: "Less is everything.",
    description: "Clean lines. Intentional silence. The most expensive thing in the room.",
  },
  {
    name: "Soft Power",
    tagline: "People lean in.",
    description: "Emotional magnetism without loudness. Presence that precedes you.",
  },
  {
    name: "Elegant Chaos",
    tagline: "Beautiful contradiction.",
    description: "Bold and soft simultaneously. Impossible to ignore.",
  },
  {
    name: "Dark Feminine",
    tagline: "Depth without explanation.",
    description: "Mystery, quiet power, and a beauty that does not ask for permission.",
  },
  {
    name: "Ethereal",
    tagline: "Otherworldly softness.",
    description: "Light through silk. Sacred and untouchable.",
  },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated && !loading && profileQuery.data !== undefined) {
      if (profileQuery.data?.onboarding_complete) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    }
  }, [isAuthenticated, loading, profileQuery.data, navigate]);

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
        {/* Background texture */}
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
            background:
              "linear-gradient(to top, oklch(72% 0.090 65 / 0.15), transparent)",
          }}
        />

        <div className="relative z-10 max-w-sm mx-auto">
          {/* Eyebrow */}
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-8 animate-fade-in opacity-0 delay-100">
            Khanundrum Studios
          </p>

          {/* Headline */}
          <h1
            className="font-serif font-light text-charcoal mb-6 animate-fade-up opacity-0 delay-200"
            style={{ lineHeight: 1.05 }}
          >
            Cinematic social content without filming.
          </h1>

          {/* Divider */}
          <div className="divider-editorial animate-fade-in opacity-0 delay-300" />

          {/* Subheadline */}
          <p className="font-sans font-light text-base text-charcoal-soft leading-relaxed mb-10 animate-fade-up opacity-0 delay-300">
            Meetha helps creators generate aesthetic luxury lifestyle images, hooks, and captions in seconds.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 animate-fade-up opacity-0 delay-400">
            <button onClick={handleCTA} className="btn-luxury w-full max-w-xs">
              Start Creating
            </button>
            <p className="font-sans text-xs text-charcoal-soft tracking-wide">
              Built for creators who are tired of complicated AI tools.
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in opacity-0 delay-500">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-gold/60" />
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section className="py-20 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto text-center">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
            The Philosophy
          </p>
          <h2 className="font-serif font-light text-charcoal mb-4">
            Your aesthetic, amplified.
          </h2>
          <div className="divider-editorial" />
          <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
            Meetha does not replace your creativity. It matches your taste and removes creative exhaustion.
          </p>
        </div>

        <div className="max-w-sm mx-auto mt-14 space-y-10">
          {[
            {
              label: "No Prompts",
              text: "Select your aesthetic. We handle everything else.",
            },
            {
              label: "Female-Gaze Aesthetics",
              text: "Warm, cinematic, editorial visuals designed to feel elevated online.",
            },
            {
              label: "Taste Aggregation",
              text: "Meetha understands your aesthetic identity so you stop overthinking every post.",
            },
          ].map((item, i) => (
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

      {/* ── Archetypes ── */}
      <section className="py-20 px-6 bg-cream">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-12">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
              Your Aesthetic Identity
            </p>
            <h2 className="font-serif font-light text-charcoal mb-4">
              Five archetypes. One is yours.
            </h2>
            <div className="divider-editorial" />
          </div>

          <div className="space-y-6">
            {ARCHETYPES.map((a, i) => (
              <div
                key={i}
                className="p-6 border border-sand bg-warm-white/60 hover:bg-warm-white transition-colors duration-300 cursor-default"
              >
                <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold mb-2">
                  {a.tagline}
                </p>
                <h3 className="font-serif text-xl text-charcoal mb-2">{a.name}</h3>
                <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                  {a.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-6 bg-charcoal">
        <div className="max-w-sm mx-auto text-center">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
            Simple Pricing
          </p>
          <h2 className="font-serif font-light text-cream mb-4">
            Start free. Scale when ready.
          </h2>
          <div className="divider-editorial" />

          <div className="mt-12 space-y-6">
            {/* Free */}
            <div className="p-8 border border-sand/20 text-left">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-sand-dark mb-4">
                Free
              </p>
              <p className="font-serif text-4xl text-cream mb-1">$0</p>
              <p className="font-sans text-xs text-sand-dark mb-6">5 generations to start</p>
              <ul className="space-y-2">
                {["5 free generations", "All 5 archetypes", "Hook + caption generation", "Download ready assets"].map((f) => (
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
                <p className="font-sans text-xs tracking-widest uppercase text-warm-white">
                  Popular
                </p>
              </div>
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold mb-4">
                Starter
              </p>
              <p className="font-serif text-4xl text-cream mb-1">$19</p>
              <p className="font-sans text-xs text-sand-dark mb-6">per month</p>
              <ul className="space-y-2">
                {["30 generations per month", "All 5 archetypes", "Hook + caption generation", "Download ready assets"].map((f) => (
                  <li key={f} className="font-sans text-xs text-sand-dark flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="p-8 border border-sand/20 text-left">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-sand-dark mb-4">
                Pro
              </p>
              <p className="font-serif text-4xl text-cream mb-1">$39</p>
              <p className="font-sans text-xs text-sand-dark mb-6">per month</p>
              <ul className="space-y-2">
                {["75 generations per month", "All 5 archetypes", "Priority generation", "Hook + caption generation", "Download ready assets"].map((f) => (
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
            <button onClick={handleCTA} className="w-full py-3 font-sans text-xs tracking-widest uppercase text-sand-dark/60 hover:text-sand-dark transition-colors">
              Start free instead
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 bg-charcoal border-t border-sand/10 text-center">
        <p className="font-serif text-lg text-cream/60 mb-2">MEETHA</p>
        <p className="font-sans text-xs text-sand-dark/50 tracking-wide">
          A Khanundrum Studios product
        </p>
      </footer>
    </div>
  );
}
