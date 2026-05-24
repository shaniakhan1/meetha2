import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ARCHETYPE_LABELS,
  ARCHETYPE_DESCRIPTIONS,
  MOOD_LABELS,
  MOOD_DESCRIPTIONS,
  type Archetype,
  type Mood,
} from "@shared/types";

type Step = "archetype" | "insight" | "mood" | "complete";

const ARCHETYPE_TAGLINES: Record<Archetype, string> = {
  luxury_minimal: "Less is everything.",
  elegant_chaos: "Beautiful contradiction.",
  soft_power: "People lean in.",
  dark_feminine: "Depth without explanation.",
  ethereal: "Otherworldly softness.",
};

const MOOD_TAGLINES: Record<Mood, string> = {
  soft: "Quiet and intimate.",
  magnetic: "Irresistible presence.",
  grounded: "Rooted confidence.",
  untamed: "Wild elegance.",
};

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("archetype");
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const profileQuery = trpc.profile.get.useQuery();
  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Redirect if already onboarded
  useEffect(() => {
    if (profileQuery.data?.onboarding_complete) {
      navigate("/dashboard");
    }
  }, [profileQuery.data, navigate]);

  const handleArchetypeSelect = (archetype: Archetype) => {
    setSelectedArchetype(archetype);
    setStep("insight");
  };

  const handleInsightContinue = () => {
    setStep("mood");
  };

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    setStep("complete");
  };

  const handleComplete = () => {
    if (!selectedArchetype || !selectedMood) return;
    upsertProfile.mutate({
      archetype: selectedArchetype,
      mood: selectedMood,
      onboardingComplete: true,
    });
  };

  const archetypes = Object.keys(ARCHETYPE_LABELS) as Archetype[];
  const moods = Object.keys(MOOD_LABELS) as Mood[];

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <span className="font-serif text-lg tracking-widest text-charcoal">MEETHA</span>
        <div className="flex gap-1.5">
          {(["archetype", "insight", "mood", "complete"] as Step[]).map((s, i) => (
            <div
              key={s}
              className="h-0.5 w-6 transition-all duration-500"
              style={{
                backgroundColor:
                  ["archetype", "insight", "mood", "complete"].indexOf(step) >= i
                    ? "oklch(72% 0.090 65)"
                    : "oklch(88% 0.025 70)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Step: Archetype */}
      {step === "archetype" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
          <div className="mb-10">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Step 1 of 2
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              What is your aesthetic identity?
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft">
              Choose the archetype that feels most like you. This shapes everything Meetha creates for you.
            </p>
          </div>

          <div className="space-y-3 flex-1">
            {archetypes.map((archetype) => (
              <button
                key={archetype}
                onClick={() => handleArchetypeSelect(archetype)}
                className="w-full text-left p-5 border border-sand bg-warm-white/60 hover:bg-warm-white hover:border-gold/50 transition-all duration-250 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-sans text-xs tracking-[0.12em] uppercase text-gold mb-1.5">
                      {ARCHETYPE_TAGLINES[archetype]}
                    </p>
                    <p className="font-serif text-lg text-charcoal group-hover:text-charcoal transition-colors">
                      {ARCHETYPE_LABELS[archetype]}
                    </p>
                    <p className="font-sans font-light text-xs text-charcoal-soft mt-1.5 leading-relaxed">
                      {ARCHETYPE_DESCRIPTIONS[archetype]}
                    </p>
                  </div>
                  <div className="w-5 h-5 border border-sand group-hover:border-gold rounded-full flex items-center justify-center ml-4 mt-1 flex-shrink-0 transition-colors duration-200">
                    <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-gold transition-colors duration-200" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Insight */}
      {step === "insight" && selectedArchetype && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center animate-fade-up opacity-0">
          <div className="max-w-xs mx-auto">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-8">
              Your Aesthetic Intelligence
            </p>

            <div
              className="w-16 h-16 rounded-full mx-auto mb-8 flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle, oklch(88% 0.025 70), oklch(72% 0.090 65 / 0.2))",
              }}
            >
              <div className="w-2 h-2 rounded-full bg-gold" />
            </div>

            <h2 className="font-serif font-light text-charcoal mb-6">
              {ARCHETYPE_LABELS[selectedArchetype]}
            </h2>

            <div className="divider-editorial" />

            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mt-6 mb-10">
              {ARCHETYPE_DESCRIPTIONS[selectedArchetype]}
            </p>

            <button onClick={handleInsightContinue} className="btn-luxury w-full">
              This is me. Continue.
            </button>
          </div>
        </div>
      )}

      {/* Step: Mood */}
      {step === "mood" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
          <div className="mb-10">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Step 2 of 2
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              What is your creative mood?
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft">
              Your mood sets the emotional tone of every piece of content Meetha creates.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => handleMoodSelect(mood)}
                className="text-left p-5 border border-sand bg-warm-white/60 hover:bg-warm-white hover:border-gold/50 transition-all duration-250 group"
              >
                <p className="font-sans text-xs tracking-[0.12em] uppercase text-gold mb-2">
                  {MOOD_TAGLINES[mood]}
                </p>
                <p className="font-serif text-lg text-charcoal mb-2">
                  {MOOD_LABELS[mood]}
                </p>
                <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                  {MOOD_DESCRIPTIONS[mood]}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === "complete" && selectedArchetype && selectedMood && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center animate-fade-up opacity-0">
          <div className="max-w-xs mx-auto">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-8">
              Your Identity is Set
            </p>

            <h2 className="font-serif font-light text-charcoal mb-6">
              You are ready.
            </h2>

            <div className="divider-editorial" />

            <div className="mt-8 mb-10 space-y-4">
              <div className="flex items-center justify-between p-4 border border-sand bg-warm-white/60">
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                  Archetype
                </p>
                <p className="font-serif text-base text-charcoal">
                  {ARCHETYPE_LABELS[selectedArchetype]}
                </p>
              </div>
              <div className="flex items-center justify-between p-4 border border-sand bg-warm-white/60">
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                  Mood
                </p>
                <p className="font-serif text-base text-charcoal">
                  {MOOD_LABELS[selectedMood]}
                </p>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={upsertProfile.isPending}
              className="btn-luxury w-full"
            >
              {upsertProfile.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                  Setting up your space...
                </span>
              ) : (
                "Enter Meetha"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
