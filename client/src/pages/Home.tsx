import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const HOME_IMAGES = {
  hero: "/home-v2/hero-window.webp",
  styleCardDark: "/manus-storage/meetha-style-card-134_08616de7.jpg",
  styleCardWarm: "/manus-storage/meetha-style-card-133_9a86196c.jpg",
  worldMorning: "/manus-storage/gallery_hands_coffee_b7861070.webp",
  worldMotion: "/manus-storage/gallery_street_lights_8c7a051f.jpg",
  worldDinner: "/manus-storage/meetha-gallery-restaurant_33c494d6.webp",
  worldNight: "/manus-storage/meetha-gallery-sofa_84cbf7ec.webp",
  identityWindow: "/home-v2/identity-window.webp",
  identityCurvy: "/home-v2/identity-curvy.webp",
  identityParis: "/home-v2/identity-paris.webp",
  identitySilver: "/home-v2/identity-silver.webp",
} as const;

if (import.meta.env.DEV) {
  const paths = Object.values(HOME_IMAGES);
  if (new Set(paths).size !== paths.length) {
    console.error("Meetha homepage image inventory contains a duplicate asset.");
  }
}

const OUTCOMES = [
  {
    number: "01",
    title: "Dress with clarity",
    text: "Stop buying pieces that look beautiful on someone else but never quite become you.",
  },
  {
    number: "02",
    title: "Brief the people helping you",
    text: "Take your image and Style Card to a stylist, photographer, makeup artist, or hairdresser.",
  },
  {
    number: "03",
    title: "Build a signature",
    text: "The more clearly you see your visual language, the less you need trends to tell you who to be.",
  },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Upload once",
    text: "Choose a small set of photos. Meetha privately learns your face and features from the photos you choose.",
  },
  {
    number: "02",
    title: "Choose your world",
    text: "Room Service. Paris in Motion. After Dark. Pick the moment. No prompt engineering required.",
  },
  {
    number: "03",
    title: "Receive the image and the direction",
    text: "You get the cinematic result plus a Style Card explaining the palette, metals, makeup, lighting, and presence.",
  },
] as const;

const STORIES = [
  {
    quote: "I brought my images to my stylist and we built my wardrobe around them.",
    outcome: "She used Meetha to shop with a point of view.",
  },
  {
    quote: "I showed my makeup artist my Meetha images and finally knew exactly what I wanted.",
    outcome: "She turned the image into a real beauty brief.",
  },
  {
    quote: "I used my images as inspiration for a photoshoot and finally had a clear creative direction.",
    outcome: "She stopped moodboarding strangers and planned her own shoot.",
  },
] as const;

const FAQS = [
  {
    question: "Will the images actually look like me?",
    answer:
      "Meetha learns your face and features from the photos you upload, then uses that private look profile for your generations. The goal is your face, your proportions, and your presence, not a generic woman wearing your hair.",
  },
  {
    question: "Can other people see the photos I upload?",
    answer:
      "No. Your uploads are stored privately and are not visible to other users. They are used to build your private Meetha look profile.",
  },
  {
    question: "Do I need to know fashion or write prompts?",
    answer:
      "No. You choose the world and the energy. Meetha handles the visual direction, styling language, and prompt structure for you.",
  },
  {
    question: "What happens after my free look?",
    answer:
      "You keep your result and can use the Style Card in real life. Membership is there when you want to keep building your visual world with more generations.",
  },
] as const;

function SectionLabel({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p
      className={`font-sans text-[11px] tracking-[0.24em] uppercase ${
        light ? "text-gold/80" : "text-gold"
      }`}
    >
      {children}
    </p>
  );
}

function PrimaryButton({
  onClick,
  children,
  light = false,
}: {
  onClick: () => void;
  children: string;
  light?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 px-7 py-3.5 font-sans text-xs tracking-[0.16em] uppercase transition-all duration-200 ${
        light ? "bg-cream text-charcoal hover:bg-white" : "bg-charcoal text-cream hover:bg-[#2b2521]"
      }`}
    >
      {children}
    </button>
  );
}

function PricingSection({
  handleCTA,
  isAuthenticated,
  onMembershipCheckout,
  checkoutPending,
}: {
  handleCTA: () => void;
  isAuthenticated: boolean;
  onMembershipCheckout: (annual: boolean) => void;
  checkoutPending: boolean;
}) {
  const [annual, setAnnual] = useState(true);

  const starterLink = annual
    ? import.meta.env.VITE_STRIPE_STARTER_ANNUAL_LINK
    : import.meta.env.VITE_STRIPE_STARTER_LINK;

  const handleMembershipClick = () => {
    if (isAuthenticated) {
      onMembershipCheckout(annual);
    } else if (starterLink) {
      window.open(starterLink, "_blank");
    } else {
      handleCTA();
    }
  };

  return (
    <section id="pricing" className="scroll-mt-24 bg-[#241a15] px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <SectionLabel light>Pricing</SectionLabel>
          <h2 className="mt-5 font-serif text-4xl font-light leading-[1.02] text-cream md:text-6xl">
            Start with one look. Stay when you want a world.
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-sans text-sm font-light leading-7 text-cream/60 md:text-base">
            The free experience lets you see the product before making a subscription decision.
          </p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`font-sans text-xs tracking-[0.14em] uppercase ${annual ? "text-cream/40" : "text-cream"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-label="Toggle annual billing"
            onClick={() => setAnnual((value) => !value)}
            className="relative h-6 w-12 rounded-full border border-cream/20 bg-white/10"
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-gold transition-all ${
                annual ? "left-7" : "left-1"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`font-sans text-xs tracking-[0.14em] uppercase ${annual ? "text-cream" : "text-cream/40"}`}
          >
            Annual
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex min-h-[390px] flex-col border border-cream/15 bg-white/[0.03] p-7 md:p-9">
            <SectionLabel light>First Look</SectionLabel>
            <div className="mt-5 flex items-end justify-between gap-4">
              <h3 className="font-serif text-3xl font-light text-cream">Free</h3>
              <p className="font-sans text-sm text-cream/50">$0</p>
            </div>
            <p className="mt-4 font-sans text-sm font-light leading-7 text-cream/60">
              For the woman who needs to see it before she believes it.
            </p>
            <ul className="mt-8 space-y-3 font-sans text-sm font-light text-cream/75">
              <li>One Train Your Look setup</li>
              <li>One cinematic generation</li>
              <li>One shareable Style Card</li>
              <li>No credit card required</li>
            </ul>
            <div className="mt-auto pt-10">
              <PrimaryButton onClick={handleCTA} light>
                Train My Look
              </PrimaryButton>
            </div>
          </div>

          <div className="relative flex min-h-[390px] flex-col border border-gold/60 bg-[#33241c] p-7 md:p-9">
            <span className="absolute right-5 top-5 border border-gold/40 px-3 py-1 font-sans text-[10px] tracking-[0.16em] uppercase text-gold">
              Build the world
            </span>
            <SectionLabel light>Membership</SectionLabel>
            <div className="mt-5 flex items-end justify-between gap-4">
              <h3 className="font-serif text-3xl font-light text-cream">{annual ? "$152" : "$19"}</h3>
              <p className="font-sans text-sm text-cream/50">{annual ? "per year" : "per month"}</p>
            </div>
            <p className="mt-4 font-sans text-sm font-light leading-7 text-cream/60">
              For building a recognizable visual identity across more moments, outfits, and seasons.
            </p>
            <ul className="mt-8 space-y-3 font-sans text-sm font-light text-cream/75">
              <li>25 cinematic generations each month</li>
              <li>High-resolution exports</li>
              <li>Share cards without a watermark</li>
              <li>Access to every styling world</li>
            </ul>
            <div className="mt-auto pt-10">
              <button
                type="button"
                onClick={handleMembershipClick}
                disabled={checkoutPending}
                className="min-h-12 bg-gold px-7 py-3.5 font-sans text-xs tracking-[0.16em] uppercase text-charcoal transition-opacity disabled:opacity-60"
              >
                {checkoutPending ? "Opening checkout..." : "Become a member"}
              </button>
            </div>
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (profileQuery.isLoading || profileQuery.isFetching) return;

    const profile = profileQuery.data;
    if (profile?.onboarding_complete || profile?.lora_status === "ready") {
      navigate("/dashboard");
    } else if (profile !== undefined) {
      navigate("/onboarding");
    }
  }, [isAuthenticated, loading, navigate, profileQuery.data, profileQuery.isFetching, profileQuery.isLoading]);

  const handleCTA = () => {
    navigate(isAuthenticated ? "/dashboard" : "/sign-in");
  };

  const subscriptionCheckoutMutation = trpc.profile.createSubscriptionCheckout.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank"),
    onError: () => navigate("/sign-in"),
  });

  const handleMembershipCheckout = (annual: boolean) => {
    const MONTHLY_PRICE = "price_1TafvrPMV5P3vLteuAss2HQB";
    const ANNUAL_PRICE = "price_1TbNCKPMV5P3vLterPzVZXdJ6";

    subscriptionCheckoutMutation.mutate({
      origin: window.location.origin,
      priceId: annual ? ANNUAL_PRICE : MONTHLY_PRICE,
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-charcoal">
      <nav className="sticky top-0 z-50 border-b border-charcoal/10 bg-cream/95 px-5 py-4 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="font-serif text-xl tracking-[0.22em] text-charcoal md:text-2xl"
          >
            MEETHA
          </button>

          <div className="hidden items-center gap-7 md:flex">
            <a href="#results" className="font-sans text-xs tracking-[0.12em] uppercase text-charcoal/60 hover:text-charcoal">
              What you get
            </a>
            <a href="#how-it-works" className="font-sans text-xs tracking-[0.12em] uppercase text-charcoal/60 hover:text-charcoal">
              How it works
            </a>
            <a href="#pricing" className="font-sans text-xs tracking-[0.12em] uppercase text-charcoal/60 hover:text-charcoal">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleCTA}
              className="font-sans text-xs tracking-[0.14em] uppercase text-charcoal/70 hover:text-charcoal"
            >
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={handleCTA}
              className="min-h-11 bg-charcoal px-3 font-sans text-[10px] tracking-[0.12em] uppercase text-cream sm:px-5 sm:text-[11px]"
            >
              Train Your Look
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_25%,rgba(196,163,103,0.19),transparent_34%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="max-w-xl">
              <SectionLabel>Personal styling software, trained on you</SectionLabel>
              <h1 className="mt-6 font-serif text-[clamp(3.4rem,8vw,7.3rem)] font-light leading-[0.9] tracking-[-0.035em] text-charcoal">
                See yourself the way a stylist would.
              </h1>
              <p className="mt-7 max-w-lg font-sans text-base font-light leading-8 text-charcoal-soft md:text-lg">
                Train Your Look once. Meetha learns your face, coloring, and proportions, then creates cinematic looks and a Style Card you can take into real life.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <PrimaryButton onClick={handleCTA}>Train My Look</PrimaryButton>
                <p className="font-sans text-xs text-charcoal/45">1 free generation. No credit card.</p>
              </div>
              <div className="mt-9 grid gap-3 border-t border-charcoal/10 pt-6 sm:grid-cols-3">
                {["Private photos", "Your proportions preserved", "Style direction included"].map((item) => (
                  <p key={item} className="font-sans text-xs leading-5 text-charcoal/55">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl pb-8 md:pb-12">
              <div className="relative ml-auto w-[88%] overflow-hidden bg-sand md:w-[82%]">
                <img
                  src={HOME_IMAGES.hero}
                  alt="A cinematic Meetha styling portrait in warm window light"
                  width={1086}
                  height={1448}
                  fetchPriority="high"
                  decoding="async"
                  className="h-auto w-full object-cover"
                />
              </div>

              <div className="promise-home-brief relative mt--6 w-[88%] border border-charcoal/10 bg-warm-white p-5 shadow-[0_24px_60px_rgba(45,32,24,0.15)] md:absolute md:bottom-0 md:left-0 md:mt-0 md:w-[58%] md:p-7">
                <div className="flex items-center justify-between gap-4">
                  <SectionLabel>Your Identity Brief</SectionLabel>
                  <span className="font-serif text-lg text-gold">M</span>
                </div>
                <h2 className="mt-4 font-serif text-2xl font-light leading-tight text-charcoal md:text-3xl">
                  Warm light. Strong gold. Quiet command.
                </h2>
                <div className="mt-5 flex gap-2">
                  {["#2F4630", "#C59B67", "#4A2F2E", "#F0DFC6", "#B74714"].map((color) => (
                    <span key={color} className="h-7 flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <dl className="mt-5 grid gap-3 font-sans text-xs leading-5 text-charcoal/60">
                  <div className="grid grid-cols-[64px_1fr] gap-3">
                    <dt className="uppercase tracking-[0.12em] text-gold">Metals</dt>
                    <dd>Yellow gold and warm bronze</dd>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-3">
                    <dt className="uppercase tracking-[0.12em] text-gold">Light</dt>
                    <dd>Late afternoon and candlelight</dd>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-3">
                    <dt className="uppercase tracking-[0.12em] text-gold">Presence</dt>
                    <dd>Grounded, magnetic, unhurried</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-charcoal/10 bg-warm-white px-5 py-7 md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <p className="font-serif text-xl font-light text-charcoal md:text-2xl">
              Women have used Meetha to plan wardrobes, makeup, and photoshoots.
            </p>
            <p className="max-w-md font-sans text-xs leading-5 text-charcoal/50">
              The image is not the end product. The clarity you take back into your life is.
            </p>
          </div>
        </section>

        <section className="px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
              <div>
                <SectionLabel>The real problem</SectionLabel>
                <h2 className="mt-5 font-serif text-4xl font-light leading-[1.04] md:text-6xl">
                  Most women do not need more inspiration.
                </h2>
              </div>
              <div className="md:pt-10">
                <p className="font-serif text-3xl font-light leading-tight text-charcoal md:text-5xl">
                  They need a point of view.
                </p>
                <p className="mt-6 max-w-2xl font-sans text-base font-light leading-8 text-charcoal-soft">
                  A saved folder full of other women cannot tell you what belongs on your body, in your light, with your face. Meetha turns inspiration into a visual direction that is actually yours.
                </p>
              </div>
            </div>

            <div className="mt-14 grid border-y border-charcoal/10 md:grid-cols-3">
              {OUTCOMES.map((item, index) => (
                <article
                  key={item.number}
                  className={p-6 md:p-8 ${
                    index < NQ5TCOMES.length - 1 ? "border-b border-charcoal/10 md:border-b