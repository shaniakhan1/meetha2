import type { Dispatch, SetStateAction } from "react";
import { FAQS, HOME_IMAGES, STORIES } from "./homeData";
import { PricingSection, PrimaryButton, SectionLabel } from "./HomePrimitives";

type HomeBottomSectionsProps = {
  handleCTA: () => void;
  isAuthenticated: boolean;
  handleMembershipCheckout: (annual: boolean) => void;
  checkoutPending: boolean;
  openFaq: number | null;
  setOpenFaq: Dispatch<SetStateAction<number | null>>;
};

export function HomeBottomSections({
  handleCTA,
  isAuthenticated,
  handleMembershipCheckout,
  checkoutPending,
  openFaq,
  setOpenFaq,
}: HomeBottomSectionsProps) {
  return (
    <>
      <section className="bg-charcoal px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <SectionLabel light>Choose your world</SectionLabel>
              <h2 className="mt-5 font-serif text-4xl font-light leading-[1.02] text-cream md:text-6xl">The same woman. A different chapter.</h2>
            </div>
            <p className="max-w-sm font-sans text-sm font-light leading-7 text-cream/55">
              Meetha gives you a world to step into, then styles your visual language inside it.
            </p>
          </div>

          <div className="mt-12 grid auto-rows-[240px] gap-1 sm:grid-cols-2 md:auto-rows-[310px] lg:grid-cols-4">
            {[
              { src: HOME_IMAGES.worldMorning, title: "Room Service", position: "object-center", width: 1200, height: 1200 },
              { src: HOME_IMAGES.worldMotion, title: "The Blur", position: "object-center", width: 1200, height: 1600 },
              { src: HOME_IMAGES.worldDinner, title: "After Dark", position: "object-center", width: 1200, height: 1600 },
              { src: HOME_IMAGES.worldNight, title: "Caught Looking Expensive", position: "object-center", width: 1200, height: 1600 },
            ].map((item) => (
              <figure key={item.title} className="group relative overflow-hidden">
                <img
                  src={item.src}
                  alt={`Meetha world: ${item.title}`}
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] ${item.position}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <figcaption className="absolute bottom-5 left-5 font-serif text-2xl font-light text-white">{item.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Every identity is different</SectionLabel>
            <h2 className="mt-5 font-serif text-4xl font-light leading-[1.02] md:text-6xl">
              Meetha is not trying to turn every woman into the same woman.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl font-sans text-base font-light leading-8 text-charcoal-soft">
              Different ages. Different shapes. Different skin tones. The work is to make each woman more visually herself.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-1 md:grid-cols-4">
            {[
              { src: HOME_IMAGES.identityWindow, alt: "South Asian woman in warm window light" },
              { src: HOME_IMAGES.identityCurvy, alt: "Curvy Black woman in a black satin dress" },
              { src: HOME_IMAGES.identityParis, alt: "East Asian woman in a tailored look on a Paris street" },
              { src: HOME_IMAGES.identitySilver, alt: "Woman in soft editorial light" },
            ].map((image, index) => (
              <div key={image.src} className={`overflow-hidden ${index % 2 === 1 ? "md:translate-y-10" : ""}`}>
                <img
                  src={image.src}
                  alt={image.alt}
                  width={1086}
                  height={1448}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[3/4] h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-warm-white px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <div>
              <SectionLabel>What happened next</SectionLabel>
              <h2 className="mt-5 font-serif text-4xl font-light leading-[1.03] md:text-6xl">The proof is what women did after the image.</h2>
            </div>
            <div className="divide-y divide-charcoal/10 border-y border-charcoal/10">
              {STORIES.map((story) => (
                <blockquote key={story.quote} className="py-8">
                  <p className="font-serif text-2xl font-light leading-snug text-charcoal md:text-3xl">“{story.quote}”</p>
                  <footer className="mt-4 font-sans text-xs tracking-[0.08em] text-charcoal/45">{story.outcome}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PricingSection
        handleCTA={handleCTA}
        isAuthenticated={isAuthenticated}
        onMembershipCheckout={handleMembershipCheckout}
        checkoutPending={checkoutPending}
      />

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl border-y border-charcoal/10 py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.72fr_1.28fr] md:items-start md:gap-16">
            <div>
              <SectionLabel>From the founder</SectionLabel>
              <p className="mt-8 font-sans text-xs tracking-[0.18em] uppercase text-charcoal/50">Shania Khan</p>
              <div className="mt-7 overflow-hidden bg-sand">
                <img
                  src="/manus-storage/founder-photo_b6c41300.webp"
                  alt="Shania Khan, founder of Meetha"
                  width={900}
                  height={1200}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[3/4] h-auto w-full object-cover object-top"
                />
              </div>
            </div>
            <div className="md:pt-2">
              <h2 className="font-serif text-4xl font-light leading-[1.04] md:text-6xl">I did not build Meetha so women could make more content.</h2>
              <p className="mt-7 font-serif text-2xl font-light leading-relaxed text-charcoal md:text-3xl">
                I built it because most women have never seen themselves through the eyes of a stylist, photographer, and creative director at the same time.
              </p>
              <p className="mt-6 max-w-3xl font-sans text-sm font-light leading-7 text-charcoal-soft md:text-base">
                When you can finally see the visual version of the woman you feel becoming, dressing her stops feeling like a guessing game. The image gives you evidence. The brief gives you a way to repeat it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-charcoal/10 bg-cream px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
          <div>
            <SectionLabel>Questions</SectionLabel>
            <h2 className="mt-5 font-serif text-4xl font-light leading-[1.04] md:text-6xl">Before you upload anything.</h2>
          </div>
          <div className="divide-y divide-charcoal/10 border-y border-charcoal/10">
            {FAQS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-serif text-xl font-light text-charcoal md:text-2xl">{item.question}</span>
                    <span className="font-sans text-2xl font-light text-gold">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen ? (
                    <p className="max-w-2xl pb-7 font-sans text-sm font-light leading-7 text-charcoal-soft md:text-base">{item.answer}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#2b1f18] px-5 py-24 text-center md:px-8 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(201,163,99,0.28),transparent_45%)]" />
        <div className="relative mx-auto max-w-4xl">
          <SectionLabel light>Your first look is free</SectionLabel>
          <h2 className="mt-6 font-serif text-[clamp(3.5rem,9vw,7.5rem)] font-light leading-[0.9] tracking-[-0.035em] text-cream">
            Stop collecting versions of other women.
          </h2>
          <p className="mx-auto mt-7 max-w-xl font-sans text-base font-light leading-8 text-cream/60">
            See your own face, body, coloring, and presence inside the life you have been trying to describe.
          </p>
          <div className="mt-9">
            <PrimaryButton onClick={handleCTA} light>
              Train My Look
            </PrimaryButton>
          </div>
          <p className="mt-4 font-sans text-xs text-cream/35">No credit card. One free generation.</p>
        </div>
      </section>
    </>
  );
}

export function HomeFooter() {
  return (
    <footer className="border-t border-charcoal/10 bg-cream px-5 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
        <span className="font-serif text-sm tracking-[0.2em] text-charcoal">MEETHA</span>
        <div className="flex items-center gap-5">
          <a href="/privacy" className="font-sans text-xs text-charcoal/45 hover:text-charcoal">Privacy</a>
          <a href="/terms" className="font-sans text-xs text-charcoal/45 hover:text-charcoal">Terms</a>
          <a href="mailto:hello@meetha.studio" className="font-sans text-xs text-charcoal/45 hover:text-charcoal">Help</a>
        </div>
        <p className="font-sans text-xs text-charcoal/40">© {new Date().getFullYear()} Meetha</p>
      </div>
    </footer>
  );
}
