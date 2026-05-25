import { useState, useRef, useEffect } from "react";
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

type Step = "archetype" | "insight" | "mood" | "niche" | "aesthetic" | "complete";

const ARCHETYPE_TAGLINES: Record<Archetype, string> = {
  luxury_minimal: "Stillness as power.",
  elegant_chaos: "High voltage, soft landing.",
  soft_power: "Warmth with edges.",
  dark_feminine: "Depth that cannot be measured.",
  ethereal: "Light moving through silk.",
};

const MOOD_TAGLINES: Record<Mood, string> = {
  soft: "Slow and intimate.",
  magnetic: "Clear signal, no static.",
  grounded: "Already decided.",
  untamed: "Wildness with taste.",
};

const NICHES = [
  { value: "lifestyle", label: "Lifestyle", description: "Daily life, home, routines, aesthetics" },
  { value: "business and brand", label: "Business & Brand", description: "Entrepreneurship, offers, thought leadership" },
  { value: "travel", label: "Travel", description: "Destinations, experiences, culture" },
  { value: "wellness", label: "Wellness", description: "Mind, body, rituals, self-care" },
  { value: "fashion and beauty", label: "Fashion & Beauty", description: "Style, beauty, personal expression" },
];

const AUDIENCES = [
  { value: "my community", label: "My Community", description: "People who already follow and love my world" },
  { value: "potential clients", label: "Potential Clients", description: "People who might hire or buy from me" },
  { value: "brands and collaborators", label: "Brands & Collaborators", description: "Companies and creators I want to work with" },
  { value: "everyone", label: "Everyone", description: "Building reach and discovery" },
];

const ALL_STEPS: Step[] = ["archetype", "insight", "mood", "niche", "aesthetic", "complete"];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("archetype");
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileQuery = trpc.profile.get.useQuery();
  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const analyzeAesthetic = trpc.aesthetic.analyzeAndSave.useMutation();

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
    setStep("niche");
  };

  const handleNicheContinue = () => {
    setStep("aesthetic");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - referenceImages.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setReferenceImages((prev) => [...prev, dataUrl].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAestheticContinue = async () => {
    if (referenceImages.length > 0) {
      setIsAnalyzing(true);
      try {
        await analyzeAesthetic.mutateAsync({ images: referenceImages });
      } catch {
        // Non-blocking — continue even if analysis fails
      } finally {
        setIsAnalyzing(false);
      }
    }
    setStep("complete");
  };

  const handleComplete = () => {
    if (!selectedArchetype || !selectedMood) return;
    upsertProfile.mutate({
      archetype: selectedArchetype,
      mood: selectedMood,
      onboardingComplete: true,
      niche: selectedNiche,
      audience: selectedAudience,
    });
  };

  const archetypes = Object.keys(ARCHETYPE_LABELS) as Archetype[];
  const moods = Object.keys(MOOD_LABELS) as Mood[];
  const stepIndex = ALL_STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <span className="font-serif text-lg tracking-widest text-charcoal">MEETHA</span>
        <div className="flex gap-1.5">
          {ALL_STEPS.map((s, i) => (
            <div
              key={s}
              className="h-0.5 w-5 transition-all duration-500"
              style={{
                backgroundColor:
                  stepIndex >= i
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
              Step 1 of 4
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              What is your frequency?
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft">
              Choose the frequency that feels most like you. This calibrates everything Meetha creates.
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
              Your Frequency
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
              Step 2 of 4
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              What is your current energy?
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft">
              Your energy attunes the emotional tone of everything Meetha generates for you.
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

      {/* Step: Niche + Audience */}
      {step === "niche" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0 overflow-y-auto">
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Step 3 of 4
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              Tell Meetha your world.
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
              Two quick questions. Your answers make every generation feel native to your actual life, not generic luxury content.
            </p>
          </div>

          {/* Niche */}
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-3">
              What do you create content about?
            </p>
            <div className="space-y-2">
              {NICHES.map((n) => (
                <button
                  key={n.value}
                  onClick={() => setSelectedNiche(selectedNiche === n.value ? null : n.value)}
                  className={`w-full text-left px-4 py-3.5 border transition-all duration-200 flex items-center justify-between group ${
                    selectedNiche === n.value
                      ? "border-gold bg-gold/5"
                      : "border-sand bg-warm-white/60 hover:border-gold/40 hover:bg-warm-white"
                  }`}
                >
                  <div>
                    <p className="font-sans text-sm text-charcoal">{n.label}</p>
                    <p className="font-sans text-xs text-charcoal-soft mt-0.5">{n.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex-shrink-0 ml-4 transition-all duration-200 ${
                      selectedNiche === n.value ? "border-gold bg-gold" : "border-sand"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-3">
              Who are you speaking to?
            </p>
            <div className="space-y-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setSelectedAudience(selectedAudience === a.value ? null : a.value)}
                  className={`w-full text-left px-4 py-3.5 border transition-all duration-200 flex items-center justify-between group ${
                    selectedAudience === a.value
                      ? "border-gold bg-gold/5"
                      : "border-sand bg-warm-white/60 hover:border-gold/40 hover:bg-warm-white"
                  }`}
                >
                  <div>
                    <p className="font-sans text-sm text-charcoal">{a.label}</p>
                    <p className="font-sans text-xs text-charcoal-soft mt-0.5">{a.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex-shrink-0 ml-4 transition-all duration-200 ${
                      selectedAudience === a.value ? "border-gold bg-gold" : "border-sand"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button
              onClick={handleNicheContinue}
              className="btn-luxury w-full"
            >
              {selectedNiche || selectedAudience ? "Continue" : "Skip for now"}
            </button>
            {!selectedNiche && !selectedAudience && (
              <p className="font-sans text-xs text-charcoal-soft text-center">
                You can update this anytime from your profile.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step: Aesthetic Calibration Upload */}
      {step === "aesthetic" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Step 4 of 4 — Optional
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              Teach Meetha your frequency
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
              Upload 3-5 images that feel like your world. Meetha reads your colors, your light, your warmth, your skin tone, not faces, so every generation is tuned to you specifically.
            </p>
          </div>

          {/* Upload grid */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {referenceImages.map((img, i) => (
              <div
                key={i}
                className="aspect-square relative overflow-hidden border border-sand"
              >
                <img
                  src={img}
                  alt={`Reference ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() =>
                    setReferenceImages((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute top-1 right-1 w-5 h-5 bg-charcoal/70 text-cream rounded-full text-xs flex items-center justify-center hover:bg-charcoal transition-colors"
                >
                  x
                </button>
              </div>
            ))}
            {referenceImages.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border border-dashed border-sand bg-warm-white/40 hover:bg-warm-white hover:border-gold/50 transition-all duration-250 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-gold text-lg leading-none">+</span>
                <span className="font-sans text-xs text-charcoal-soft">Add image</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="mt-auto space-y-3">
            <button
              onClick={handleAestheticContinue}
              disabled={isAnalyzing}
              className="btn-luxury w-full"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                  Reading your aesthetic...
                </span>
              ) : referenceImages.length > 0 ? (
                "Calibrate and continue"
              ) : (
                "Skip for now"
              )}
            </button>
            {referenceImages.length === 0 && (
              <p className="font-sans text-xs text-charcoal-soft text-center">
                You can add reference images later from your profile.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === "complete" && selectedArchetype && selectedMood && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center animate-fade-up opacity-0">
          <div className="max-w-xs mx-auto">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-8">
              Your Frequency is Calibrated
            </p>

            <h2 className="font-serif font-light text-charcoal mb-6">
              Meetha knows your world.
            </h2>

            <div className="divider-editorial" />

            <div className="mt-8 mb-10 space-y-3">
              <div className="flex items-center justify-between p-4 border border-sand bg-warm-white/60">
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                  Frequency
                </p>
                <p className="font-serif text-base text-charcoal">
                  {ARCHETYPE_LABELS[selectedArchetype]}
                </p>
              </div>
              <div className="flex items-center justify-between p-4 border border-sand bg-warm-white/60">
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                  Energy
                </p>
                <p className="font-serif text-base text-charcoal">
                  {MOOD_LABELS[selectedMood]}
                </p>
              </div>
              {selectedNiche && (
                <div className="flex items-center justify-between p-4 border border-sand bg-warm-white/60">
                  <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                    World
                  </p>
                  <p className="font-serif text-base text-charcoal capitalize">
                    {selectedNiche}
                  </p>
                </div>
              )}
              {referenceImages.length > 0 && (
                <div className="flex items-center justify-between p-4 border border-sand bg-warm-white/60">
                  <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                    Aesthetic
                  </p>
                  <p className="font-serif text-base text-charcoal">
                    Calibrated
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleComplete}
              disabled={upsertProfile.isPending}
              className="btn-luxury w-full"
            >
              {upsertProfile.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                  Setting your frequency...
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
