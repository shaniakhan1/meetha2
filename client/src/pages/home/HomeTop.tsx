import { HOME_IMAGES, OUTCOMES, STEPS } from "./homeData";
import { PrimaryButton, SectionLabel } from "./HomePrimitives";

type NavigationProps = {
  handleCTA: () => void;
  isAuthenticated: boolean;
  navigate: (path: string) => void;
};

export function HomeNavigation({ handleCTA, isAuthenticated, navigate }: NavigationProps) {
  return (
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

        <div className="flex items-center gap-4">
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
            className="min-h-10 bg-charcoal px-3 font-sans text-[10px] tracking-[0.12em] uppercase text-cream sm:min-h-11 sm:px-5 sm:text-[11px] sm:tracking-[0.14em]"
          >
            Train Your Look
          </button>
        </div>
      </div>
    </nav>
  );
}

type HomeTopSectionsProps = {
  handleCTA: () => void;
};

export function HomeTopSections({ handleCTA }: HomeTopSectionsProps) {
  return (
    <>
      <section className="relative overflow-hidden px-5 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_25%,rgba(196,163,103,0.19),transparent_34%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="max-w-xl">
            <SectionLabel>Personal styling software, trained on you</SectionLabel>
            <h1 className="mt-6 font-serif text-[clamp(3.4rem,8vw,7.3rem)] font-light leading-[0.9] tracking-[-0.035em] text-charcoal">
              See yourself the way a stylist would.
            </h1>
            <p className="mt-7 max-w-lg font-sans text-base font-light leading-8 text-charcoal-soft md:text-lg">
              Upload your photos once. Meetha learns your face, coloring, and proportions, then creates cinematic looks and a Style Card you can take into real life.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <PrimaryButton onClick={handleCTA}>Train My Look</PrimaryButton>
              <p className="font-sans text-xs text-charcoal/45">1 free generation. No credit card.</p>
            </div>
            <div className="mt-9 grid gap-3 border-t border-charcoal/10 pt-6 sm:grid-cols-3">
              {["Private photo training", "Your proportions preserved", "Style direction included"].map((item) => (
                <p key={item} className="font-sans text-xs leading-5 text-charcoal/55">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl pb-0 md:pb-12">
            <div className="relative ml-auto w-full overflow-hidden bg-sand md:w-[82%]">
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

            <div className="relative z-10 -mt-10 w-[92%] border border-charcoal/10 bg-warm-white p-5 shadow-[0_24px_60px_rgba(45,32,24,0.15)] md:absolute md:bottom-0 md:left-0 md:mt-0 md:w-[58%] md:p-7">
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
              <p className="font-serif text-3xl font-light leading-tight text-charcoal md:text-5xl">They need a point of view.</p>
              <p className="mt-6 max-w-2xl font-sans text-base font-light leading-8 text-charcoal-soft">
                A saved folder full of other women cannot tell you what belongs on your body, in your light, with your face. Meetha turns inspiration into a visual direction that is actually yours.
              </p>
            </div>
          </div>

          <div className="mt-14 grid border-y border-charcoal/10 md:grid-cols-3">
            {OUTCOMES.map((item, index) => (
              <article
                key={item.number}
                className={`p-6 md:p-8 ${index < OUTCOMES.length - 1 ? "border-b border-charcoal/10 md:border-b-0 md:border-r" : ""}`}
              >
                <p className="font-sans text-xs tracking-[0.2em] text-gold">{item.number}</p>
                <h3 className="mt-7 font-serif text-2xl font-light text-charcoal">{item.title}</h3>
                <p className="mt-4 font-sans text-sm font-light leading-7 text-charcoal-soft">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="results" className="scroll-mt-24 bg-[#e9dfd1] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="overflow-hidden bg-cream shadow-[0_24px_70px_rgba(53,37,27,0.12)] sm:translate-y-8">
              <img
                src={HOME_IMAGES.styleCardDark}
                alt="A dark cinematic Meetha Style Card with identity direction"
                width={1080}
                height={1350}
                loading="lazy"
                decoding="async"
                className="h-auto w-full"
              />
            </div>
            <div className="overflow-hidden bg-cream shadow-[0_24px_70px_rgba(53,37,27,0.12)]">
              <img
                src={HOME_IMAGES.styleCardWarm}
                alt="A warm editorial Meetha Style Card with identity direction"
                width={1080}
                height={1350}
                loading="lazy"
                decoding="async"
                className="h-auto w-full"
              />
            </div>
          </div>

          <div className="max-w-xl">
            <SectionLabel>What you receive</SectionLabel>
            <h2 className="mt-5 font-serif text-4xl font-light leading-[1.02] md:text-6xl">A beautiful image is the beginning.</h2>
            <p className="mt-6 font-sans text-base font-light leading-8 text-charcoal-soft">
              Every generation comes with the visual logic behind it, so you can recreate the feeling outside the app instead of leaving it trapped on a screen.
            </p>
            <div className="mt-9 divide-y divide-charcoal/10 border-y border-charcoal/10">
              {[
                ["Cinematic portrait", "A socially believable image built around your face and proportions."],
                ["Style Card", "A shareable creative brief for the exact look Meetha created."],
                ["Color and lighting direction", "The palette, metals, makeup, and light that make the image work."],
                ["Real-world translation", "A direction you can take shopping, to a salon, or into a photoshoot."],
              ].map(([title, text]) => (
                <div key={title} className="grid gap-2 py-5 sm:grid-cols-[160px_1fr] sm:gap-6">
                  <h3 className="font-serif text-xl font-light text-charcoal">{title}</h3>
                  <p className="font-sans text-sm font-light leading-7 text-charcoal-soft">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <PrimaryButton onClick={handleCTA}>Train My Look</PrimaryButton>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-5 font-serif text-4xl font-light leading-[1.02] md:text-6xl">Three decisions. Then you see her.</h2>
            <p className="mt-5 font-sans text-sm font-light leading-7 text-charcoal-soft md:text-base">
              No moodboard spiral. No writing a perfect prompt. No trying to explain your face to a generic photo app.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((step) => (
              <article key={step.number} className="min-h-[290px] border border-charcoal/10 bg-warm-white p-7">
                <p className="font-serif text-5xl font-light text-gold/45">{step.number}</p>
                <h3 className="mt-10 font-serif text-2xl font-light text-charcoal">{step.title}</h3>
                <p className="mt-4 font-sans text-sm font-light leading-7 text-charcoal-soft">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
