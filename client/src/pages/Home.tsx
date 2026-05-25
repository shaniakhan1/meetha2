import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const FREQUENCIES = [
  {
    name: "Still Frequency",
    tagline: "Stillness as power.",
    description: "One object. Extreme negative space. The room goes quiet.",
  },
  {
    name: "Magnetic Frequency",
    tagline: "Warmth with edges.",
    description: "People lean in without knowing why. Presence that does not announce itself.",
  },
  {
    name: "Electric Frequency",
    tagline: "High voltage, soft landing.",
    description: "Contradictions that resolve into something true. Feels alive.",
  },
  {
    name: "Deep Frequency",
    tagline: "Depth that cannot be measured.",
    description: "Unhurried, unshaken. Felt before it is seen.",
  },
  {
    name: "Light Frequency",
    tagline: "Light moving through silk.",
    description: "Translucent and luminous. The feeling of something sacred.",
  },
];

const PAIN_POINTS = [
  {
    label: "No filming required",
    text: "Cinematic images generated from your aesthetic profile. No camera, no ring light, no setup.",
  },
  {
    label: "No blank caption box",
    text: "Three hooks, a caption, and hashtags. Ready to copy and post. Every time.",
  },
  {
    label: "No prompting",
    text: "Tell Meetha your frequency once. It handles the creative decisions from there.",
  },
  {
    label: "Looks like you",
    text: "Upload a few selfies. Meetha trains a personal model on your face. Every generation after that is a real-looking photo of you.",
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
            Content creation, simplified
          </p>
          {/* Headline */}
          <h1
            className="font-serif font-light text-charcoal mb-6 animate-fade-up opacity-0 delay-200"
            style={{ lineHeight: 1.05 }}
          >
            Show up online without the work.
          </h1>

          {/* Divider */}
          <div className="divider-editorial animate-fade-in opacity-0 delay-300" />

          {/* Subheadline */}
          <p className="font-sans font-light text-base text-charcoal-soft leading-relaxed mb-10 animate-fade-up opacity-0 delay-300">
            Meetha generates cinematic images, hooks, and captions tuned to your aesthetic. No filming. No blank page. No hour lost.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 animate-fade-up opacity-0 delay-400">
            <button onClick={handleCTA} className="btn-luxury w-full max-w-xs">
              Start for free
            </button>
            <p className="font-sans text-xs text-charcoal-soft tracking-wide">
              5 free generations. No credit card.
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in opacity-0 delay-500">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-gold/60" />
        </div>
      </section>

      {/* ── Pain Points ── */}
      <section className="py-20 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto text-center">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
            Built for busy creators
          </p>
          <h2 className="font-serif font-light text-charcoal mb-4">
            The three things that slow you down. Gone.
          </h2>
          <div className="divider-editorial" />
        </div>

        <div className="max-w-sm mx-auto mt-14 space-y-10">
          {PAIN_POINTS.map((item, i) => (
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
              title: "Calibrate your frequency",
              text: "Choose the aesthetic energy that feels like you. Upload a few reference images so Meetha learns your world.",
            },
            {
              step: "02",
              title: "Pick a scene and format",
              text: "Morning ritual, travel day, quiet wealth, founder energy. Select where it is going: Feed Post, Portrait, or Stories.",
            },
            {
              step: "03",
              title: "Download and post",
              text: "A cinematic image, three hooks, a caption, and hashtags. Ready in seconds. Tuned to you.",
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
            Ready to post. Every time.
          </h2>
          <div className="divider-editorial" />
        </div>

        <div className="max-w-sm mx-auto">
          {/* Mock generated card */}
          <div className="border border-sand bg-warm-white overflow-hidden">
            {/* Real example image */}
            <div className="relative w-full aspect-[9/16] max-h-64 overflow-hidden">
              <img
                src="/manus-storage/shania-hero_9923f04f.png"
                alt="Content example"
                className="w-full h-full object-cover object-top"
              />
              {/* Hook overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}>
                <p className="font-serif text-lg text-white leading-snug">
                  peace changed my face
                </p>
                <p className="font-sans text-xs tracking-widest uppercase text-white/50 mt-1">
                  meetha
                </p>
              </div>
            </div>

            {/* Caption + hashtags */}
            <div className="p-5 space-y-3">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold">
                Caption
              </p>
              <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
                I stopped chasing the version of myself that needed to prove something. This is what that looks like.
              </p>
              <p className="font-sans text-xs text-gold/70 leading-relaxed">
                #intentionalliving #quietluxury #frequencyreset #calmisapower #softlife
              </p>
            </div>
          </div>

          <p className="font-sans text-xs text-charcoal-soft text-center mt-5 tracking-wide">
            Generated in under 30 seconds. Tuned to your frequency.
          </p>
          <p className="font-sans text-xs text-charcoal-soft/60 text-center mt-1.5 tracking-wide">
            Trains to look like you.
          </p>
        </div>
      </section>

      {/* ── Frequencies ── */}
      <section className="py-20 px-6 bg-warm-white">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-12">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-6">
              Your frequency
            </p>
            <h2 className="font-serif font-light text-charcoal mb-4">
              Five frequencies. One is yours.
            </h2>
            <div className="divider-editorial" />
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
              Meetha generates content that matches your specific aesthetic energy, not a generic template.
            </p>
          </div>

          <div className="space-y-4">
            {FREQUENCIES.map((f, i) => (
              <div
                key={i}
                className="p-5 border border-sand bg-cream/60 hover:bg-cream transition-colors duration-300 cursor-default"
              >
                <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold mb-1.5">
                  {f.tagline}
                </p>
                <h3 className="font-serif text-lg text-charcoal mb-1.5">{f.name}</h3>
                <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof Pull Quote ── */}
      <section className="py-20 px-6 bg-cream">
        <div className="max-w-sm mx-auto text-center">
          <div className="divider-editorial mb-10" />
          <blockquote className="font-serif font-light text-2xl text-charcoal leading-snug mb-6">
            "I used to spend an hour on a single post. Now I spend 60 seconds."
          </blockquote>
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
            Creator, 400K followers
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
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-sand-dark mb-4">
                Free
              </p>
              <p className="font-serif text-4xl text-cream mb-1">$0</p>
              <p className="font-sans text-xs text-sand-dark mb-6">5 generations to start</p>
              <ul className="space-y-2">
                {[
                  "5 free generations",
                  "All 5 frequencies",
                  "Hook + caption generation",
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
                {[
                  "30 generations per month",
                  "All 5 frequencies",
                  "Animated cinematic preview",
                  "Hook + caption generation",
                  "Download without watermark",
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
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-sand-dark mb-4">
                Pro
              </p>
              <p className="font-serif text-4xl text-cream mb-1">$39</p>
              <p className="font-sans text-xs text-sand-dark mb-6">per month</p>
              <ul className="space-y-2">
                {[
                  "75 generations per month",
                  "All 5 frequencies",
                  "Real video generation",
                  "Animated cinematic preview",
                  "Hook + caption generation",
                  "Download without watermark",
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
              Start with Starter - $19 / mo
            </a>
            <a
              href={import.meta.env.VITE_STRIPE_PRO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-luxury btn-luxury-outline w-full text-center block"
              style={{ color: "oklch(97% 0.012 80)", borderColor: "oklch(88% 0.025 70 / 0.4)" }}
            >
              Go Pro - $39 / mo
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

      {/* ── Caught Looking Expensive Template Preview ── */}
      <section
        className="px-6 py-16 text-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #2C1810 0%, #1a0f09 60%, #2C1810 100%)",
        }}
      >
        {/* Grain overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
            backgroundSize: "128px 128px",
          }}
        />
        {/* Flash burst */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "10%",
            left: "15%",
            width: "200px",
            height: "200px",
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)",
            filter: "blur(12px)",
          }}
        />
        <div className="relative z-10 max-w-sm mx-auto">
          <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold/60 mb-5">
            Template No. 01
          </p>
          <h2 className="font-serif text-3xl font-light text-cream leading-tight mb-4">
            Caught Looking
            <br />
            Expensive
          </h2>
          <p className="font-sans font-light text-sm text-cream/50 leading-relaxed mb-8">
            Flash photography. Film grain. Someone caught you mid-moment looking effortlessly stunning.
            The image looks real. Your friends repost it.
          </p>
          {/* Hook chips */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {["vanished softly", "peace changed my face", "she got quieter", "seen briefly", "out past my bedtime", "summer looked good on her"].map((hook) => (
              <span
                key={hook}
                className="font-serif text-xs px-3 py-1.5 border border-white/10 text-cream/40"
              >
                {hook}
              </span>
            ))}
          </div>
          <button
            onClick={() => navigate("/templates")}
            className="w-full py-4 bg-cream text-charcoal font-sans text-xs tracking-[0.2em] uppercase hover:bg-gold hover:text-charcoal transition-all duration-200 active:scale-[0.97]"
          >
            See the template
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-sand/10 text-center" style={{ background: "#2C1810" }}>
        <p className="font-serif text-lg text-cream/60 mb-4">MEETHA</p>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <a href="/privacy" className="font-sans text-xs text-sand-dark/50 tracking-wide hover:text-cream/60 transition-colors">
            Privacy Policy
          </a>
          <span className="text-sand-dark/30 text-xs">&middot;</span>
          <a href="/terms" className="font-sans text-xs text-sand-dark/50 tracking-wide hover:text-cream/60 transition-colors">
            Terms of Service
          </a>
          <span className="text-sand-dark/30 text-xs">&middot;</span>
          <a href="mailto:hello@meetha.studio" className="font-sans text-xs text-sand-dark/50 tracking-wide hover:text-cream/60 transition-colors">
            hello@meetha.studio
          </a>
        </div>
        <p className="font-sans text-xs text-sand-dark/30 tracking-wide mt-4">
          &copy; {new Date().getFullYear()} Meetha. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
