import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

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
    "1 look training",
    "1 cinematic generation",
    "Share card export",
    "Watermarked downloads",
  ],
  membership: [
    "25 cinematic generations monthly",
    "HD exports",
    "Share cards — no watermark",
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
        <div className="text-center mb-10">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">Pricing</p>
          <h2 className="font-serif font-light text-cream mb-4">Two ways in.</h2>
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
            <ul className="space-y-1.5 mb-5">
              {FEATURES.free.map((f) => (
                <li key={f} className="font-sans text-xs text-sand-dark/70 flex gap-2">
                  <span className="text-gold/60">—</span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={handleCTA} className="w-full py-3 border border-sand/30 font-sans text-xs tracking-[0.15em] uppercase text-cream/70 hover:text-cream transition-colors">
              Begin
            </button>
          </div>

          {/* Membership */}
          <div className="p-5 border border-gold/40 bg-white/5">
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-serif text-lg text-cream">Membership</p>
              <p className="font-sans text-xs text-sand-dark">{annual ? "$182 / year" : "$19 / mo"}</p>
            </div>
            <ul className="space-y-1.5 mb-5">
              {FEATURES.membership.map((f) => (
                <li key={f} className="font-sans text-xs text-sand-dark/70 flex gap-2">
                  <span className="text-gold/60">—</span>
                  {f}
                </li>
              ))}
            </ul>
            {starterLink ? (
              <a href={starterLink} target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-gold/90 hover:bg-gold text-center font-sans text-xs tracking-[0.15em] uppercase text-charcoal transition-colors">
                Become Her
              </a>
            ) : (
              <button onClick={handleCTA} className="w-full py-3 bg-gold/90 hover:bg-gold font-sans text-xs tracking-[0.15em] uppercase text-charcoal transition-colors">
                Become Her
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

        <div className="relative z-10 w-full" style={{ maxWidth: "480px" }}>
          <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold mb-6 animate-fade-up opacity-0 delay-100">
            The art of becoming visually unforgettable.
          </p>

          <h1
            className="font-serif font-light text-charcoal mb-8 animate-fade-up opacity-0 delay-200"
            style={{ lineHeight: 1.0, fontSize: "clamp(2.8rem, 10vw, 4.5rem)" }}
          >
            See yourself<br />
            the way a stylist<br />
            would.
          </h1>

          {/* ── Immediate image proof ── */}
          <div className="w-full mb-8 animate-fade-up opacity-0 delay-300">
            {/* Hero portrait */}
            <div className="w-full aspect-[3/4] overflow-hidden mb-1">
              <img
                src="/manus-storage/meetha-59-v2_acb77051.jpg"
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
              The shift
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3" style={{ lineHeight: 1.1 }}>
              Your features, styled<br />with intention.
            </h2>
            <div className="divider-editorial" />
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
              Not a better version of you. The most aligned version of you. Drag to see the difference.
            </p>
          </div>

          {/* Interactive drag slider */}
          <div className="mb-3">
            <BeforeAfterSlider
              beforeSrc="/manus-storage/shania-before_bb452c9e.webp"
              afterSrc="/manus-storage/homepage-after-white_6a966c1e.jpg"
              beforeLabel="undefined"
              afterLabel="aligned"
              initialPosition={42}
              className="aspect-[3/4] w-full"
            />
          </div>
          <p className="font-sans text-[11px] text-charcoal-soft/60 text-center tracking-wide mb-6">
            Drag the handle to reveal
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
              title: "Choose your world",
              text: "Rooftop Dinner. Airport Lounge. Mediterranean Morning. Bill, Please. Choose the styling world. Meetha handles the rest.",
            },
            {
              step: "03",
              title: "See yourself",
              text: "A cinematic image that looks like you — your face, your proportions, your presence — styled for the moment you chose. Plus your Color Analysis: palette, metals, makeup, lighting.",
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

      {/* ── Output Example — Real Style Cards ── */}
      <section className="py-16 px-6 bg-cream">
        <div className="max-w-sm mx-auto text-center mb-8">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
            What you get
          </p>
          <h2 className="font-serif font-light text-charcoal mb-3">
            A campaign brief for your future self.
          </h2>
          <div className="divider-editorial" />
          <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-4">
            Every card is a real output from Meetha. Real faces. Real identities.
          </p>
        </div>

        {/* Card 1 — peace changed my face */}
        <div className="max-w-sm mx-auto mb-6">
          <div className="border border-sand bg-warm-white overflow-hidden">
            <div className="relative w-full overflow-hidden" style={{ height: "340px" }}>
              <img
                src="/manus-storage/meetha-style-card-134_08616de7.jpg"
                alt="Meetha style card — peace changed my face"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="p-5 space-y-3">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold">
                Your Identity Brief
              </p>
              <div className="space-y-2">
                {[
                  ["Palette", "Deep noir, oxblood, and midnight blue dominate, punctuated by flashes of molten gold or stark ivory."],
                  ["Metals", "Heavy, sculptural gold and blackened silver pieces, often layered, command attention with their raw, untamed finish."],
                  ["Makeup", "A sharp, smoked-out cat eye or a deep, matte berry lip creates a singular focal point."],
                  ["Lighting", "Harsh, direct flash from multiple angles captures every glint and shadow, emphasizing dramatic contours."],
                  ["Presence", "She is a magnetic force, her raw allure amplified by the sudden, intrusive glare of the cameras."],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <span className="font-sans text-xs text-gold/70 w-16 flex-shrink-0">{label}</span>
                    <span className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 — warm light and gold */}
        <div className="max-w-sm mx-auto">
          <div className="border border-sand bg-warm-white overflow-hidden">
            <div className="relative w-full overflow-hidden" style={{ height: "340px" }}>
              <img
                src="/manus-storage/meetha-style-card-133_9a86196c.jpg"
                alt="Meetha style card — warm light and gold"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="p-5 space-y-3">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold">
                Your Identity Brief
              </p>
              <div className="space-y-2">
                {[
                  ["Palette", "Warm earth tones, creamy ivories, and rich browns define her color story, enhanced by soft shadows."],
                  ["Metals", "Layered gold bracelets and rings, substantial in weight, highlight warm metal hardware."],
                  ["Makeup", "A deep, precise lip is the focal point, complemented by a warm, sculpted eye and glowing skin."],
                  ["Lighting", "Golden hour light transitions to intimate candlelight, casting long, dramatic shadows."],
                  ["Presence", "She commands the frame with a grounded poise, her gaze direct and captivating."],
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

      {/* ── Editorial Gallery ── */}
      {/* Row A: full-bleed cinematic header */}
      <section className="bg-charcoal overflow-hidden">
        <div className="text-center pt-16 pb-8 px-6">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">Every identity is different</p>
          <h2 className="font-serif font-light text-cream mb-3" style={{ lineHeight: 1.1 }}>
            Your features, styled<br />with intention.
          </h2>
          <div className="divider-editorial" />
          <p className="font-sans font-light text-sm text-cream/60 leading-relaxed mt-4 max-w-xs mx-auto">
            Meetha reveals your visual language. It does not replace it.
          </p>
        </div>

        {/* Gallery container — capped at 520px on desktop so images don't go wall-to-wall */}
        <div className="mx-auto w-full" style={{ maxWidth: "520px" }}>

          {/* Full portrait */}
          <div className="w-full aspect-[3/4] overflow-hidden">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/editorial-01-window-4Ex7ySDHERfgQxSGrLgiqH.webp"
              alt="Editorial portrait — window light"
              className="w-full h-full object-cover object-top"
            />
          </div>

          {/* Two-column: existing gallery + new full-body */}
          <div className="grid grid-cols-2 gap-0.5 mt-0.5">
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src="/manus-storage/meetha-17_05094910.jpg"
                alt="Meetha styling — car window portrait"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/editorial-02-fullbody-cRGwTXz2gHjynX9ahHDVXB.webp"
                alt="Editorial — full body golden hour"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          {/* Offset text break */}
          <div className="px-6 py-10 flex items-end justify-between gap-4">
            <p className="font-serif font-light text-cream/40" style={{ fontSize: "clamp(2.5rem, 10vw, 4rem)", lineHeight: 1.0 }}>
              every<br />body.
            </p>
            <p className="font-sans text-xs text-cream/40 text-right leading-relaxed max-w-[140px]">
              Different skin tones.<br />Different shapes.<br />One visual language.
            </p>
          </div>

          {/* Curvy silhouette — full portrait, golden hour hotel suite */}
          <div className="w-full aspect-[9/16] overflow-hidden">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/curvy-silhouette-test-T6AYZCEqwSqBi8tbjG4HV2.webp"
              alt="Meetha styling — curvy silhouette, golden hour"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Wide cinematic strip — 16:9 keeps it compact */}
          <div className="w-full aspect-[16/9] overflow-hidden mt-0.5">
            <img
              src="/manus-storage/meetha-gallery-street-back_d0e260dd.webp"
              alt="Meetha styling — street"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Three-column tight grid */}
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src="/manus-storage/meetha-gallery-restaurant_33c494d6.webp"
                alt="Meetha styling — restaurant"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/editorial-03-restaurant-JxCbUv26xaboJFEWHABv6g.webp"
                alt="Editorial — candlelit restaurant"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src="/manus-storage/meetha-gallery-sofa_84cbf7ec.webp"
                alt="Meetha styling — sofa"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          {/* Jewelry close-up — changed to 16:9 so it doesn't tower */}
          <div className="w-full aspect-[4/3] overflow-hidden mt-0.5">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/editorial-05-jewelry-E7PHF69YfVpDeTTDRyXXDd.webp"
              alt="Editorial — gold jewelry close-up"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Two-column: motion + soft light */}
          <div className="grid grid-cols-2 gap-0.5 mt-0.5">
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/editorial-04-motion-PdCsKveuYL5VJ73Dzk4AZe.webp"
                alt="Editorial — motion street"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/editorial-06-softlight-X9utC7yPfkFCBqUYhBXkqQ.webp"
                alt="Editorial — soft morning light"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          {/* Existing gallery images — hands coffee + car window */}
          <div className="grid grid-cols-2 gap-0.5 mt-0.5">
            <div className="aspect-square overflow-hidden">
              <img
                src="/manus-storage/meetha-gallery-hands-coffee_2b4e9461.webp"
                alt="Meetha styling — hands coffee"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="aspect-square overflow-hidden">
              <img
                src="/manus-storage/meetha-gallery-car-window_beac299e.webp"
                alt="Meetha styling — car window"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

        </div>{/* end gallery container */}

        <p className="font-sans text-xs text-cream/25 text-center py-8 tracking-[0.2em] uppercase">
          undefined &rarr; aligned
        </p>
      </section>

      {/* ── Pricing ── */}
      <PricingSection handleCTA={handleCTA} />

      {/* ── Final CTA ── */}
      <section
        className="relative px-6 py-24 text-center overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1a0a05 0%, #2C1810 40%, #1a0f09 100%)" }}
      >
        {/* Film grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />
        {/* Ambient light bloom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(139,105,20,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-sm mx-auto">
          <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold/70 mb-6">
            Your visual identity
          </p>
          <h2
            className="font-serif font-light text-cream mb-6"
            style={{ lineHeight: 1.0, fontSize: 'clamp(2.8rem, 10vw, 4.5rem)' }}
          >
            Become Her.
          </h2>
          <div className="divider-editorial mb-6" />
          <p className="font-sans font-light text-sm text-sand-dark/80 leading-relaxed mb-10 max-w-xs mx-auto">
            Train your look once.
            <br />
            Meetha turns your photos into cinematic, socially believable moments that feel photographed, not generated.
          </p>
          <button onClick={handleCTA} className="btn-luxury btn-gold w-full max-w-xs mx-auto block">
            Train Your Look
          </button>
          <p className="font-sans text-xs text-sand-dark/30 text-center mt-4">
            Free to start. No credit card required.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 bg-cream border-t border-sand/30">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <span className="font-serif text-sm tracking-widest text-charcoal">MEETHA</span>
          <div className="flex gap-4">
            <a href="/privacy" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">Privacy</a>
            <a href="/terms" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">Terms</a>
            <a href="mailto:hello@frequencyplanner.com" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">Help</a>
          </div>
          <p className="font-sans text-xs text-charcoal-soft/50">
            © {new Date().getFullYear()} Meetha
          </p>
        </div>
      </footer>
    </div>
  );
}
