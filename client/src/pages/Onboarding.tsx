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

type Step = "archetype" | "mood" | "body" | "photos" | "training" | "complete";

const ARCHETYPE_SYMBOL: Record<Archetype, string> = {
  luxury_minimal: "◻",
  elegant_chaos: "⚡",
  soft_power: "✦",
  dark_feminine: "◆",
  ethereal: "○",
};

// What images actually look like for each frequency
const ARCHETYPE_VISUAL_HINT: Record<Archetype, string> = {
  luxury_minimal: "Images will be: cream tones, empty space, one deliberate object, architectural stillness.",
  elegant_chaos: "Images will be: layered textures, silk against stone, bold shadow and warm light in tension.",
  soft_power: "Images will be: warm amber light, soft intimate framing, close and emotional, the feeling of being seen.",
  dark_feminine: "Images will be: deep shadows, jewel tones, dramatic candlelit moods, mystery without explanation.",
  ethereal: "Images will be: gossamer light, translucent fabric, soft lens flare, dreamlike and luminous.",
};

const MOOD_SYMBOL: Record<Mood, string> = {
  soft: "◌",
  magnetic: "✦",
  grounded: "◼",
  untamed: "〜",
};

// What the energy actually does to images
const MOOD_VISUAL_HINT: Record<Mood, string> = {
  soft: "Gentle bokeh, warm amber light, intimate close framing.",
  magnetic: "Strong centered framing, rich saturation, commanding eye contact.",
  grounded: "Earthy tones, stable compositions, linen and wood textures, unhurried.",
  untamed: "Dynamic movement, windswept textures, raw beauty with editorial restraint.",
};

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("archetype");
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedBodyType, setSelectedBodyType] = useState<"slim" | "athletic" | "curvy" | null>(null);

  const setBodyTypeMutation = trpc.profile.setBodyType.useMutation();

  // LoRA photo upload state
  const [loraFiles, setLoraFiles] = useState<File[]>([]);
  const [loraPreviews, setLoraPreviews] = useState<string[]>([]);
  const [loraConsent, setLoraConsent] = useState(false);
  const [loraUploading, setLoraUploading] = useState(false);
  const loraFileInputRef = useRef<HTMLInputElement>(null);

  const profileQuery = trpc.profile.get.useQuery(undefined, {
    retry: 3,
    retryDelay: 500,
    // Poll every 8s while on the training step
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      if (d.lora_status === "training" || ((d.uploaded_photo_count ?? 0) > 0 && d.lora_status !== "ready")) return 8_000;
      return false;
    },
  });

  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => navigate("/dashboard"),
    onError: (err) => toast.error(err.message),
  });

  // Redirect if already onboarded
  useEffect(() => {
    if (profileQuery.isLoading || profileQuery.isFetching) return;
    if (profileQuery.data?.onboarding_complete) navigate("/dashboard");
  }, [profileQuery.isLoading, profileQuery.isFetching, profileQuery.data, navigate]);

  // Auto-advance from training step when model is ready
  useEffect(() => {
    if (step !== "training") return;
    if (profileQuery.data?.lora_status === "ready") {
      setStep("complete");
    }
  }, [step, profileQuery.data?.lora_status]);

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

  const archetypes = Object.keys(ARCHETYPE_LABELS) as Archetype[];
  const moods = Object.keys(MOOD_LABELS) as Mood[];
  const STEPS: Step[] = ["archetype", "mood", "body", "photos"]; // "training" and "complete" are not progress-dot steps
  const stepIndex = STEPS.indexOf(step);

  const handleLoraFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    // Accept all image types including HEIC/HEIF from iPhone
    const valid = incoming.filter(
      (f) => f.type.startsWith("image/") || /\.(heic|heif|jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name)
    );
    if (valid.length < incoming.length) {
      toast.error("Some files were skipped. Please use photos from your camera roll.");
    }
    const newFiles = [...loraFiles, ...valid].slice(0, 20);
    setLoraFiles(newFiles);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLoraPreviews((prev) => [...prev, ev.target?.result as string].slice(0, 20));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleLoraRemove = (index: number) => {
    setLoraFiles((prev) => prev.filter((_, i) => i !== index));
    setLoraPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotosNext = async () => {
    if (loraFiles.length < 10 || !loraConsent) return;
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
        toast.error(err.error || "Upload failed. Please try again.");
        setLoraUploading(false);
        return;
      }
      // Upload succeeded — move to training waiting screen
      setStep("training");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setLoraUploading(false);
    }
  };

  const handleComplete = () => {
    if (!selectedArchetype || !selectedMood) return;
    upsertProfile.mutate({
      archetype: selectedArchetype,
      mood: selectedMood,
      onboardingComplete: true,
    });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-sand/30">
        <span className="font-serif text-xl tracking-[0.15em] text-charcoal">MEETHA</span>
        {/* Progress dots - only show for the 3 main steps */}
        {step !== "complete" && (
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className="rounded-full transition-all duration-400"
                style={{
                  width: stepIndex > i ? "20px" : "6px",
                  height: "6px",
                  backgroundColor:
                    stepIndex >= i ? "oklch(72% 0.090 65)" : "oklch(88% 0.025 70)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Step 1: Archetype ─── */}
      {step === "archetype" && (
        <div className="flex-1 flex flex-col px-5 py-8 animate-fade-up opacity-0">
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold mb-3">Step 1 of 4</p>
            <h1 className="font-serif text-4xl font-light text-charcoal leading-tight mb-3">
              What is your<br />frequency?
            </h1>
            <p className="font-sans text-sm text-charcoal-soft leading-relaxed">
              Pick the one that feels most like you. This shapes every image and caption Meetha creates.
            </p>
          </div>

          <div className="space-y-3 flex-1">
            {archetypes.map((archetype) => (
              <button
                key={archetype}
                onClick={() => {
                  setSelectedArchetype(archetype);
                  setTimeout(() => setStep("mood"), 150);
                }}
                className="w-full text-left p-5 border-2 border-sand bg-warm-white hover:border-gold hover:bg-warm-white active:scale-[0.99] transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-serif text-xl text-charcoal mb-1">
                      {ARCHETYPE_LABELS[archetype]}
                    </p>
                    <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                      {ARCHETYPE_DESCRIPTIONS[archetype]}
                    </p>
                    <p className="font-sans text-[10px] text-gold/70 leading-relaxed mt-1.5 italic">
                      {ARCHETYPE_VISUAL_HINT[archetype]}
                    </p>
                  </div>
                  <span className="text-gold text-xl mt-0.5 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                    {ARCHETYPE_SYMBOL[archetype]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Step 2: Mood ─── */}
      {step === "mood" && (
        <div className="flex-1 flex flex-col px-5 py-8 animate-fade-up opacity-0">
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold mb-3">Step 2 of 4</p>
            <h1 className="font-serif text-4xl font-light text-charcoal leading-tight mb-3">
              What is your<br />energy right now?
            </h1>
            <p className="font-sans text-sm text-charcoal-soft leading-relaxed">
              This sets the emotional tone of your content. You can change it anytime.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => {
                  setSelectedMood(mood);
                  setTimeout(() => setStep("body"), 150);
                }}
                className="text-left p-5 border-2 border-sand bg-warm-white hover:border-gold hover:bg-warm-white active:scale-[0.99] transition-all duration-200 group flex flex-col justify-between min-h-[140px]"
              >
                <span className="text-2xl text-gold/50 group-hover:text-gold transition-colors">
                  {MOOD_SYMBOL[mood]}
                </span>
                <div>
                  <p className="font-serif text-xl text-charcoal mb-1">
                    {MOOD_LABELS[mood]}
                  </p>
                  <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                    {MOOD_DESCRIPTIONS[mood]}
                  </p>
                  <p className="font-sans text-[10px] text-gold/70 leading-relaxed mt-1.5 italic">
                    {MOOD_VISUAL_HINT[mood]}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep("archetype")}
            className="mt-6 font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors text-center"
          >
            ← Back
          </button>
        </div>
      )}

      {/* ─── Step 3: Your Silhouette ─── */}
      {step === "body" && (
        <div className="flex-1 flex flex-col px-5 py-8 animate-fade-up opacity-0">
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold mb-3">Step 3 of 4</p>
            <h1 className="font-serif text-4xl font-light text-charcoal leading-tight mb-3">
              Your<br />Silhouette
            </h1>
            <p className="font-sans text-sm text-charcoal-soft leading-relaxed">
              This helps Meetha style cuts, tailoring, and proportions more accurately for you.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {([
              { value: "slim" as const, label: "Slim", sub: "Elongated, fashion-forward cuts with clean lines" },
              { value: "athletic" as const, label: "Athletic", sub: "Strong, structured tailoring with confident proportions" },
              { value: "curvy" as const, label: "Curvy", sub: "Elegant silhouette with soft waist emphasis and luxury proportions" },
            ]).map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setSelectedBodyType(value)}
                className={`w-full text-left p-5 border-2 transition-all duration-200 ${
                  selectedBodyType === value
                    ? "border-gold bg-gold/10 text-charcoal"
                    : "border-sand/60 bg-warm-white/60 text-charcoal hover:border-gold/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-serif text-xl text-charcoal mb-0.5">{label}</p>
                    <p className="font-sans text-xs text-charcoal-soft">{sub}</p>
                  </div>
                  {selectedBodyType === value && (
                    <div className="w-5 h-5 rounded-full border-2 border-gold bg-gold flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-cream" />
                    </div>
                  )}
                  {selectedBodyType !== value && (
                    <div className="w-5 h-5 rounded-full border-2 border-sand/60 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (selectedBodyType) {
                setBodyTypeMutation.mutate({ bodyType: selectedBodyType });
              }
              setStep("photos");
            }}
            disabled={!selectedBodyType}
            className="btn-luxury w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <button
            onClick={() => setStep("mood")}
            className="mt-4 font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors text-center"
          >
            ← Back
          </button>
        </div>
      )}

      {/* ─── Step 4: Photos (optional) ─── */}
      {step === "photos" && (
        <div className="flex-1 flex flex-col px-5 py-8 animate-fade-up opacity-0 overflow-y-auto">
          <div className="mb-6">
            <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold mb-3">
              Step 4 of 4 (Optional)
            </p>
            <h1 className="font-serif text-4xl font-light text-charcoal leading-tight mb-3">
              Make images<br />look like you.
            </h1>
            <p className="font-sans text-sm text-charcoal-soft leading-relaxed">
              Upload 10–20 selfies and Meetha trains a personal AI model on your face. Every image it creates will actually look like you, in any scene, any outfit.
            </p>
          </div>

          {/* What works */}
          <div className="mb-5 p-4 bg-charcoal text-cream">
            <p className="font-sans text-xs font-semibold tracking-[0.12em] uppercase mb-3">What works best</p>
            <ul className="space-y-2">
              {[
                "Solo photos only. No group shots",
                "Face clearly visible. No sunglasses, hats, or heavy filters",
                "Good lighting. Natural or well-lit indoor shots",
                "Variety. Different angles, outfits, and settings",
                "Recent photos. Taken in the last year or two",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 font-sans text-xs text-cream/80 leading-relaxed">
                  <span className="text-gold mt-0.5 flex-shrink-0">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
            <p className="font-sans text-xs text-cream/40 mt-3">
              Training takes about 20 minutes in the background. We'll email you when it's ready.
            </p>
          </div>

          {/* Consent */}
          <div className="mb-5 p-4 border border-sand bg-warm-white/60">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={loraConsent}
                  onChange={(e) => setLoraConsent(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 border-2 transition-all duration-200 flex items-center justify-center ${
                    loraConsent ? "border-charcoal bg-charcoal" : "border-sand bg-warm-white"
                  }`}
                >
                  {loraConsent && (
                    <svg className="w-3 h-3 text-cream" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M1.5 5L4 7.5L8.5 2.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                I confirm that I am 18 or older, I own or have the right to use all photos I am uploading, all people depicted are adults who have consented to this use, and I agree to Meetha processing these photos to train a personal AI model solely for my use. I can delete my model anytime from my profile.
              </p>
            </label>
          </div>

          {/* Photo grid - only after consent */}
          {loraConsent && (
            <>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {loraPreviews.map((preview, i) => (
                  <div key={i} className="aspect-square relative overflow-hidden border border-sand">
                    <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleLoraRemove(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-charcoal/80 text-cream rounded-full text-xs flex items-center justify-center hover:bg-charcoal transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {loraPreviews.length < 20 && (
                  <button
                    onClick={() => loraFileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-sand bg-warm-white/40 hover:bg-warm-white hover:border-gold/60 transition-all duration-200 flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-gold text-2xl leading-none">+</span>
                    <span className="font-sans text-[10px] text-charcoal-soft text-center leading-tight">
                      Add photo
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-5">
                <p className="font-sans text-xs text-charcoal-soft">
                  {loraPreviews.length} photo{loraPreviews.length !== 1 ? "s" : ""} added
                </p>
                {loraPreviews.length > 0 && loraPreviews.length < 10 && (
                  <p className="font-sans text-xs text-gold">
                    Add {10 - loraPreviews.length} more to train
                  </p>
                )}
                {loraPreviews.length >= 10 && (
                  <p className="font-sans text-xs text-charcoal-soft">✓ Ready to train</p>
                )}
              </div>
            </>
          )}

          <input
            ref={loraFileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleLoraFileSelect}
          />

          {/* CTA */}
          {loraConsent && loraPreviews.length >= 10 ? (
            <button
              onClick={handlePhotosNext}
              disabled={loraUploading}
              className="btn-luxury w-full mt-auto"
            >
              {loraUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  Uploading your photos...
                </span>
              ) : (
                "Train my look and continue"
              )}
            </button>
          ) : loraConsent && loraPreviews.length > 0 ? (
            <button
              onClick={() => loraFileInputRef.current?.click()}
              className="btn-luxury w-full mt-auto"
            >
              Add more photos ({loraPreviews.length}/10 minimum)
            </button>
          ) : !loraConsent ? (
            <button
              disabled
              className="btn-luxury w-full mt-auto opacity-40 cursor-not-allowed"
            >
              Check the box above to add photos
            </button>
          ) : null}

          <button
            onClick={() => setStep("body")}
            className="mt-4 font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors text-center"
          >
            ← Back
          </button>
        </div>
      )}

      {/* ─── Training Waiting ─── */}
      {step === "training" && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center animate-fade-up opacity-0">
          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-gold mb-8">Visual Identity Model</p>
          <h1 className="font-serif text-4xl font-light text-charcoal leading-tight mb-5">
            Your model is<br />being trained.
          </h1>
          <div className="w-12 h-px bg-gold/40 mb-6" />
          <p className="font-sans text-sm font-light text-charcoal-soft leading-relaxed mb-4 max-w-xs">
            Meetha is learning your face, your coloring, and your visual essence.
          </p>
          <p className="font-sans text-sm font-light text-charcoal-soft leading-relaxed mb-10 max-w-xs">
            This usually takes 10–20 minutes. We'll send you an email when it's ready.
          </p>
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border border-gold/40 border-t-gold rounded-full animate-spin" />
            <p className="font-sans text-xs text-charcoal-soft/40 tracking-widest uppercase">Training in progress</p>
          </div>
          <p className="mt-12 font-sans text-xs text-charcoal-soft/30 leading-relaxed max-w-xs">
            You can close this window. Your model will be ready when you return.
          </p>
        </div>
      )}

      {/* ─── Complete ─── */}
      {step === "complete" && selectedArchetype && selectedMood && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 text-center animate-fade-up opacity-0">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-10">
              <p className="font-sans text-xs tracking-[0.25em] uppercase text-gold mb-6">
                You're all set
              </p>
              <h1 className="font-serif text-5xl font-light text-charcoal leading-tight mb-4">
                Meetha knows<br />your world.
              </h1>
              <div className="w-8 h-px bg-gold mx-auto my-6" />
            </div>

            {/* Summary */}
            <div className="space-y-2 mb-10 text-left">
              <div className="flex items-center justify-between p-4 bg-warm-white border border-sand">
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                  Frequency
                </p>
                <p className="font-serif text-base text-charcoal">
                  {ARCHETYPE_LABELS[selectedArchetype]}
                </p>
              </div>
              <div className="flex items-center justify-between p-4 bg-warm-white border border-sand">
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                  Energy
                </p>
                <p className="font-serif text-base text-charcoal">
                  {MOOD_LABELS[selectedMood]}
                </p>
              </div>
              {loraPreviews.length >= 10 && (
                <div className="flex items-center justify-between p-4 bg-warm-white border border-sand">
                  <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                    Your Look
                  </p>
                  <p className="font-serif text-base text-charcoal">Training (~20 min)</p>
                </div>
              )}
            </div>

            {/* Auto-trigger profile save when reaching complete step */}
            {!upsertProfile.isSuccess && !upsertProfile.isPending && (
              <button
                onClick={handleComplete}
                disabled={upsertProfile.isPending}
                className="btn-luxury w-full py-5 text-base tracking-[0.2em]"
              >
                Start Creating
              </button>
            )}
            {upsertProfile.isPending && (
              <button disabled className="btn-luxury w-full py-5 text-base tracking-[0.2em] opacity-70">
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  Setting up your account...
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
