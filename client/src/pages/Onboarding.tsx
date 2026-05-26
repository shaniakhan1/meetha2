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

type Step = "archetype" | "insight" | "mood" | "niche" | "voice" | "lora" | "aesthetic" | "complete";

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

const ALL_STEPS: Step[] = ["archetype", "insight", "mood", "niche", "voice", "lora", "aesthetic", "complete"];

type VoiceTone = "casual" | "polished";
type VoiceHumor = "funny" | "serious";
type VoiceLength = "short" | "storytelling";

const VOICE_TONE_OPTIONS: { value: VoiceTone; label: string; description: string }[] = [
  { value: "casual", label: "Casual", description: "Conversational, like texting a friend" },
  { value: "polished", label: "Polished", description: "Elevated, intentional, editorial" },
];

const VOICE_HUMOR_OPTIONS: { value: VoiceHumor; label: string; description: string }[] = [
  { value: "funny", label: "Funny", description: "Wit, irony, a raised eyebrow" },
  { value: "serious", label: "Serious", description: "Direct, no jokes, full presence" },
];

const VOICE_LENGTH_OPTIONS: { value: VoiceLength; label: string; description: string }[] = [
  { value: "short", label: "Short", description: "One or two sentences. Done." },
  { value: "storytelling", label: "Storytelling", description: "A little context, a little arc" },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("archetype");
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceTone, setVoiceTone] = useState<VoiceTone | null>(null);
  const [voiceHumor, setVoiceHumor] = useState<VoiceHumor | null>(null);
  const [voiceLength, setVoiceLength] = useState<VoiceLength | null>(null);
  // LoRA step state
  const [loraFiles, setLoraFiles] = useState<File[]>([]);
  const [loraPreviews, setLoraPreviews] = useState<string[]>([]);
  const [loraConsent, setLoraConsent] = useState(false);
  const [loraUploading, setLoraUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loraFileInputRef = useRef<HTMLInputElement>(null);

  const profileQuery = trpc.profile.get.useQuery(undefined, {
    retry: 3,
    retryDelay: 500,
  });
  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const analyzeAesthetic = trpc.aesthetic.analyzeAndSave.useMutation();

  // Redirect if already onboarded — wait for the query to finish before deciding
  useEffect(() => {
    if (profileQuery.isLoading || profileQuery.isFetching) return;
    if (profileQuery.data?.onboarding_complete) {
      navigate("/dashboard");
    }
  }, [profileQuery.isLoading, profileQuery.isFetching, profileQuery.data, navigate]);

  // Show a minimal loading screen while we check onboarding status
  // This prevents the onboarding UI from flashing for already-onboarded users
  if (profileQuery.isLoading || profileQuery.isFetching) {
    return (
      <div className="min-h-screen bg-[#1a0f09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="font-serif text-2xl font-light text-cream">Meetha</p>
          <div className="w-px h-8 bg-gold/40 animate-pulse" />
        </div>
      </div>
    );
  }

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
    setStep("voice");
  };

  const handleVoiceContinue = () => {
    setStep("lora");
  };

  const handleLoraFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 15 - loraFiles.length);
    const newFiles = [...loraFiles, ...files].slice(0, 15);
    setLoraFiles(newFiles);
    // Generate previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setLoraPreviews((prev) => [...prev, dataUrl].slice(0, 15));
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same files can be re-selected
    e.target.value = "";
  };

  const handleLoraRemove = (index: number) => {
    setLoraFiles((prev) => prev.filter((_, i) => i !== index));
    setLoraPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLoraContinue = async () => {
    if (loraFiles.length >= 10 && loraConsent) {
      setLoraUploading(true);
      try {
        const formData = new FormData();
        loraFiles.forEach((file) => formData.append("photos", file));
        const res = await fetch("/api/lora/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          toast.error(err.error || "Photo upload failed. You can try again from your profile.");
        } else {
          toast.success("Photos uploaded. Training starts in the background.");
        }
      } catch {
        toast.error("Upload failed. You can train your look from your profile anytime.");
      } finally {
        setLoraUploading(false);
      }
    }
    setStep("aesthetic");
  };

  const handleLoraSkip = () => {
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
        // Non-blocking -- continue even if analysis fails
      } finally {
        setIsAnalyzing(false);
      }
    }
    setStep("complete");
  };

  const handleComplete = () => {
    if (!selectedArchetype || !selectedMood) return;
    // Build voice style string from selections
    const voiceStyle = [voiceTone, voiceHumor, voiceLength].filter(Boolean).join(", ");
    upsertProfile.mutate({
      archetype: selectedArchetype,
      mood: selectedMood,
      onboardingComplete: true,
      niche: selectedNiche,
      audience: selectedAudience,
      voiceStyle: voiceStyle || undefined,
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
              Step 1 of 6
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
              Step 2 of 6
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
              Step 3 of 6
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

          <div className="mt-auto">
            <button
              onClick={handleNicheContinue}
              className="btn-luxury w-full"
            >
              {selectedNiche || selectedAudience ? "Continue" : "Skip for now"}
            </button>
          </div>
        </div>
      )}

      {/* Step: Voice Calibration */}
      {step === "voice" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0 overflow-y-auto">
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Step 4 of 6
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              How do you sound?
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
              Meetha writes your captions in your voice. Tell it your style and it will match your tone every time.
            </p>
          </div>

          {/* Tone */}
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-3">
              Your tone
            </p>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVoiceTone(voiceTone === opt.value ? null : opt.value)}
                  className={`text-left px-4 py-3.5 border transition-all duration-200 ${
                    voiceTone === opt.value
                      ? "border-gold bg-gold/5"
                      : "border-sand bg-warm-white/60 hover:border-gold/40 hover:bg-warm-white"
                  }`}
                >
                  <p className="font-sans text-sm text-charcoal">{opt.label}</p>
                  <p className="font-sans text-xs text-charcoal-soft mt-0.5 leading-snug">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Humor */}
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-3">
              Your energy
            </p>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_HUMOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVoiceHumor(voiceHumor === opt.value ? null : opt.value)}
                  className={`text-left px-4 py-3.5 border transition-all duration-200 ${
                    voiceHumor === opt.value
                      ? "border-gold bg-gold/5"
                      : "border-sand bg-warm-white/60 hover:border-gold/40 hover:bg-warm-white"
                  }`}
                >
                  <p className="font-sans text-sm text-charcoal">{opt.label}</p>
                  <p className="font-sans text-xs text-charcoal-soft mt-0.5 leading-snug">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-3">
              Your captions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_LENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVoiceLength(voiceLength === opt.value ? null : opt.value)}
                  className={`text-left px-4 py-3.5 border transition-all duration-200 ${
                    voiceLength === opt.value
                      ? "border-gold bg-gold/5"
                      : "border-sand bg-warm-white/60 hover:border-gold/40 hover:bg-warm-white"
                  }`}
                >
                  <p className="font-sans text-sm text-charcoal">{opt.label}</p>
                  <p className="font-sans text-xs text-charcoal-soft mt-0.5 leading-snug">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button
              onClick={handleVoiceContinue}
              className="btn-luxury w-full"
            >
              {voiceTone || voiceHumor || voiceLength ? "Continue" : "Skip for now"}
            </button>
            {!voiceTone && !voiceHumor && !voiceLength && (
              <p className="font-sans text-xs text-charcoal-soft text-center">
                You can update your voice style anytime from your profile.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step: LoRA Portrait Upload */}
      {step === "lora" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0 overflow-y-auto">
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Step 5 of 6
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              Make the images look like you.
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed mb-4">
              Without this step, your images will be beautiful but they won't be you. Upload 10 to 15 selfies and Meetha trains a personal model on your face. Every image it generates will actually look like you.
            </p>
            <div className="p-4 border border-gold/30 bg-gold/5 mb-2">
              <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                <span className="font-medium text-charcoal">What to upload:</span> Clear, well-lit selfies. Different angles. No heavy filters. No sunglasses. Training takes about 20 minutes in the background.
              </p>
            </div>
          </div>

          {/* Biometric consent checkbox -- must be accepted before photos can be added */}
          <div className="mb-6 p-4 border border-sand bg-warm-white/60">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={loraConsent}
                  onChange={(e) => setLoraConsent(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 border transition-all duration-200 flex items-center justify-center ${
                    loraConsent ? "border-gold bg-gold" : "border-sand bg-warm-white"
                  }`}
                >
                  {loraConsent && (
                    <svg className="w-2.5 h-2.5 text-cream" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                I consent to Meetha processing my facial images to train a personal AI model. My photos are used only for this purpose and are not shared with third parties. I can delete my model data at any time from my profile.
              </p>
            </label>
          </div>

          {/* Photo grid -- only shown after consent */}
          {loraConsent && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            {loraPreviews.map((preview, i) => (
              <div
                key={i}
                className="aspect-square relative overflow-hidden border border-sand"
              >
                <img
                  src={preview}
                  alt={`Selfie ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleLoraRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-charcoal/70 text-cream rounded-full text-xs flex items-center justify-center hover:bg-charcoal transition-colors"
                >
                  x
                </button>
              </div>
            ))}
            {loraPreviews.length < 15 && (
              <button
                onClick={() => loraFileInputRef.current?.click()}
                className="aspect-square border border-dashed border-sand bg-warm-white/40 hover:bg-warm-white hover:border-gold/50 transition-all duration-250 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-gold text-lg leading-none">+</span>
                <span className="font-sans text-[10px] text-charcoal-soft text-center leading-tight">Add selfie</span>
              </button>
            )}
          </div>
          )}

          <input
            ref={loraFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleLoraFileSelect}
          />

          {/* Photo count indicator */}
          {loraConsent && (
          <div className="flex items-center justify-between mb-6">
            <p className="font-sans text-xs text-charcoal-soft">
              {loraPreviews.length} of 15 photos added
            </p>
            {loraPreviews.length > 0 && loraPreviews.length < 10 && (
              <p className="font-sans text-xs text-gold">
                Need at least 10 to train
              </p>
            )}
            {loraPreviews.length >= 10 && (
              <p className="font-sans text-xs text-charcoal-soft">
                Ready to train
              </p>
            )}
          </div>
          )}

          <div className="mt-auto space-y-3">
            {loraPreviews.length >= 10 && loraConsent ? (
              <button
                onClick={handleLoraContinue}
                disabled={loraUploading}
                className="btn-luxury w-full"
              >
                {loraUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                    Uploading photos...
                  </span>
                ) : (
                  "Train my look and continue"
                )}
              </button>
            ) : loraPreviews.length >= 10 && !loraConsent ? (
              <button
                disabled
                className="btn-luxury w-full opacity-50 cursor-not-allowed"
              >
                Check the consent box to continue
              </button>
            ) : (
              <button
                onClick={handleLoraContinue}
                className="btn-luxury w-full"
              >
                {loraPreviews.length > 0 ? "Add more photos to train" : "Continue without training"}
              </button>
            )}
            <button
              onClick={handleLoraSkip}
              className="w-full py-3 font-sans text-xs text-charcoal-soft hover:text-charcoal transition-colors text-center"
            >
              Skip for now (images won't look like me)
            </button>
          </div>
        </div>
      )}

      {/* Step: Aesthetic Calibration Upload */}
      {step === "aesthetic" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Step 6 of 6
            </p>
            <h2 className="font-serif font-light text-charcoal mb-3">
              This is what makes it yours.
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
              Upload 3 to 5 images that feel like your world. Meetha reads your colors, your light, your warmth, your skin tone -- not faces -- so every generation is calibrated to you specifically, not a generic template.
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
                "I'll add photos later"
              )}
            </button>
            {referenceImages.length === 0 && (
              <p className="font-sans text-xs text-charcoal-soft text-center">
                Without photos, Meetha uses a default aesthetic. You can calibrate anytime from your profile.
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
              {loraPreviews.length >= 10 && (
                <div className="flex items-center justify-between p-4 border border-sand bg-warm-white/60">
                  <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                    Your Look
                  </p>
                  <p className="font-serif text-base text-charcoal">
                    Training
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
