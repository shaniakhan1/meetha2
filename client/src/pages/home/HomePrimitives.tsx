import { useState } from "react";

export function SectionLabel({ children, light = false }: { children: string; light?: boolean }) {
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

export function PrimaryButton({
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

export function PricingSection({
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
              className={`absolute top-1 h-4 w-4 rounded-full bg-gold transition-all ${annual ? "left-7" : "left-1"}`}
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
