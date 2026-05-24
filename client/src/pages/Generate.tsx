import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  PLATFORM_LABELS,
  SCENE_LABELS,
  ARCHETYPE_LABELS,
  MOOD_LABELS,
  type Platform,
  type SceneCategory,
} from "@shared/types";
import CinematicPreview from "@/components/CinematicPreview";
import { getPreviewTier } from "./Preview";

type GenStep = "select" | "generating" | "hooks" | "preview" | "feedback";

interface GenerationResult {
  generation: {
    id: number;
    image_url: string;
    caption: string;
    archetype: string;
    mood: string;
    [key: string]: unknown;
  };
  hooks: string[];
  caption: string;
  hashtags: string[];
  creditsRemaining: number;
}

const GENERATING_PHRASES = [
  "Composing your aesthetic.",
  "Curating the light.",
  "Finding your visual voice.",
  "Calibrating the mood.",
  "Almost ready.",
];

export default function Generate() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<GenStep>("select");
  const [platform, setPlatform] = useState<Platform>("reels");
  const [sceneCategory, setSceneCategory] = useState<SceneCategory | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const previewTier = getPreviewTier(); // null when not in preview mode

  const profileQuery = trpc.profile.get.useQuery();
  const creditsQuery = trpc.credits.get.useQuery();
  const selectHookMutation = trpc.generations.selectHook.useMutation();
  const videoMutation = trpc.video.generate.useMutation({
    onSuccess: (data) => {
      setVideoUrl(data.videoUrl);
      setIsGeneratingVideo(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsGeneratingVideo(false);
    },
  });
  const feedbackMutation = trpc.feedback.savePostability.useMutation();
  const utils = trpc.useUtils();

  const generateMutation = trpc.generate.content.useMutation({
    onSuccess: (data) => {
      setResult(data as GenerationResult);
      setStep("hooks");
      utils.credits.get.invalidate();
      utils.generations.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("select");
    },
  });

  const platforms = Object.keys(PLATFORM_LABELS) as Platform[];
  const scenes = Object.keys(SCENE_LABELS) as SceneCategory[];

  const handleGenerate = () => {
    // In preview mode, skip the credit gate entirely
    if (!previewTier) {
      const credits = creditsQuery.data;
      if (credits && credits.credits_remaining <= 0) {
        toast.error("No credits remaining. Please upgrade to continue.");
        return;
      }
    }
    setStep("generating");
    // Cycle through loading phrases
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % GENERATING_PHRASES.length;
      setPhraseIndex(idx);
    }, 3000);
    generateMutation.mutateAsync({ platform, sceneCategory: sceneCategory ?? undefined }).finally(() => {
      clearInterval(interval);
    });
  };

  const handleHookSelect = (hook: string) => {
    setSelectedHook(hook);
    if (result?.generation?.id) {
      selectHookMutation.mutate({ generationId: result.generation.id, selectedHook: hook });
    }
    setStep("preview");
  };

  const handleDownload = async () => {
    if (!result?.generation?.image_url) return;
    try {
      const response = await fetch(result.generation.image_url as string);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meetha-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStep("feedback");
    } catch {
      toast.error("Download failed. Please try again.");
    }
  };

  const handleCopyCaption = () => {
    const text = `${result?.caption}\n\n${result?.hashtags?.map((h) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    });
  };

  const handleFeedback = (response: "yes" | "maybe" | "no") => {
    if (result?.generation?.id) {
      feedbackMutation.mutate({ generationId: result.generation.id, response });
    }
    setFeedbackGiven(true);
    toast.success("Thank you. Your feedback shapes Meetha.");
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  const handleRegenerate = () => {
    setResult(null);
    setSelectedHook(null);
    setFeedbackGiven(false);
    setVideoUrl(null);
    setIsGeneratingVideo(false);
    setStep("select");
  };

  const handleGenerateVideo = () => {
    if (!result?.generation) return;
    setIsGeneratingVideo(true);
    videoMutation.mutate({
      generationId: result.generation.id,
      imageUrl: result.generation.image_url as string,
      archetype: result.generation.archetype,
      mood: result.generation.mood,
      sceneCategory: sceneCategory ?? undefined,
    });
  };

  const profile = profileQuery.data;
  const credits = creditsQuery.data;

  // In preview mode, synthesize a credits object matching the selected tier
  const effectiveCredits = previewTier
    ? {
        credits_remaining: previewTier === "free" ? 3 : previewTier === "starter" ? 28 : 73,
        tier: previewTier,
      }
    : credits;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-sand/40">
        <button
          onClick={() => navigate("/dashboard")}
          className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors"
        >
          Back
        </button>
        <span className="font-serif text-lg tracking-widest text-charcoal">MEETHA</span>
        <div className="text-right">
          <p className="font-sans text-xs text-gold">
            {effectiveCredits?.credits_remaining ?? "\u2014"} left
          </p>
        </div>
      </div>

      {/* ── Step: Select ── */}
      {step === "select" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
          {/* Profile context */}
          {profile && (
            <div className="flex items-center gap-3 mb-8 p-4 bg-warm-white border border-sand">
              <div className="w-1 h-8 bg-gold flex-shrink-0" />
              <div>
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                  Creating as
                </p>
                <p className="font-serif text-sm text-charcoal">
                  {ARCHETYPE_LABELS[profile.archetype as keyof typeof ARCHETYPE_LABELS] ?? profile.archetype} &middot;{" "}
                  {MOOD_LABELS[profile.mood as keyof typeof MOOD_LABELS] ?? profile.mood}
                </p>
              </div>
            </div>
          )}

          {/* Platform */}
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal mb-4">
              Platform
            </p>
            <div className="grid grid-cols-3 gap-2">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`py-3 px-2 text-center border transition-all duration-200 ${
                    platform === p
                      ? "border-gold bg-gold/10 text-charcoal"
                      : "border-sand/60 bg-warm-white/60 text-charcoal hover:border-gold/40"
                  }`}
                >
                  <p className="font-sans text-xs tracking-[0.1em] uppercase">
                    {PLATFORM_LABELS[p]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Scene */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal">
                Scene
              </p>
              <p className="font-sans text-xs text-charcoal-soft">Optional</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setSceneCategory(null)}
                className={`w-full py-3 px-4 text-left border transition-all duration-200 ${
                  sceneCategory === null
                    ? "border-gold bg-gold/10 text-charcoal"
                    : "border-sand/60 bg-warm-white/60 text-charcoal hover:border-gold/40"
                }`}
              >
                <p className="font-sans text-xs tracking-[0.1em] uppercase">Surprise me</p>
              </button>
              {scenes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSceneCategory(s)}
                  className={`w-full py-3 px-4 text-left border transition-all duration-200 ${
                    sceneCategory === s
                      ? "border-gold bg-gold/10 text-charcoal"
                      : "border-sand/60 bg-warm-white/60 text-charcoal hover:border-gold/40"
                  }`}
                >
                  <p className="font-sans text-xs tracking-[0.1em] uppercase">
                    {SCENE_LABELS[s]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate CTA */}
          {effectiveCredits && effectiveCredits.credits_remaining <= 0 && !previewTier ? (
            <div className="space-y-3">
              <div className="p-4 border border-gold/30 bg-warm-white text-center">
                <p className="font-sans text-xs text-charcoal-soft mb-2">
                  You have used all your free generations.
                </p>
                <p className="font-serif text-sm text-charcoal">Upgrade to keep creating.</p>
              </div>
              <div className="space-y-2">
                <a
                  href={import.meta.env.VITE_STRIPE_STARTER_LINK || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-luxury btn-gold w-full text-center block"
                >
                  Starter — $19 / month
                </a>
                <a
                  href={import.meta.env.VITE_STRIPE_PRO_LINK || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-luxury btn-luxury-outline w-full text-center block"
                >
                  Pro — $39 / month
                </a>
              </div>
            </div>
          ) : (
            <button onClick={handleGenerate} className="btn-luxury w-full">
              Generate My Content
            </button>
          )}
        </div>
      )}

      {/* ── Step: Generating ── */}
      {step === "generating" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="max-w-xs mx-auto">
            {/* Cinematic loading animation */}
            <div className="relative w-20 h-20 mx-auto mb-10">
              <div className="absolute inset-0 border border-gold/20 rounded-full animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-1 border border-gold/40 rounded-full animate-spin" style={{ animationDuration: "4s" }} />
              <div className="absolute inset-3 border border-gold/60 rounded-full animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gold" />
              </div>
            </div>
            <h3 className="font-serif font-light text-charcoal mb-3 transition-all duration-700">
              {GENERATING_PHRASES[phraseIndex]}
            </h3>
            <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
              Meetha is building your aesthetic. This takes about 15 seconds.
            </p>
          </div>
        </div>
      )}

      {/* ── Step: Hooks ── */}
      {step === "hooks" && result && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
          <div className="mb-6">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-2">
              Choose Your Hook
            </p>
            <h3 className="font-serif font-light text-charcoal mb-1">
              Three options. Pick one.
            </h3>
            <p className="font-sans font-light text-xs text-charcoal-soft">
              This text will appear over your image.
            </p>
          </div>

          {/* Thumbnail preview — no hook overlay yet */}
          <div className="mb-6">
            <CinematicPreview
              imageUrl={result.generation.image_url as string}
              hook={null}
              size="thumb"
              platform={platform}
            />
          </div>

          {/* Hook options */}
          <div className="space-y-3 flex-1">
            {result.hooks.map((hook, i) => (
              <button
                key={i}
                onClick={() => handleHookSelect(hook)}
                className="w-full text-left p-5 border border-sand bg-warm-white/60 hover:bg-warm-white hover:border-gold/50 transition-all duration-200 group"
              >
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-gold mb-2">
                  Option {i + 1}
                </p>
                <p className="font-serif text-lg text-charcoal leading-snug">{hook}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleRegenerate}
            className="mt-4 w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* ── Step: Preview ── */}
      {step === "preview" && result && selectedHook && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
          <div className="mb-6">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-2">
              Your Content
            </p>
            <h3 className="font-serif font-light text-charcoal">
              Ready to post.
            </h3>
          </div>

          {/* Full cinematic preview with hook overlay + Ken Burns */}
          <div className="mb-6">
            <CinematicPreview
              imageUrl={result.generation.image_url as string}
              hook={selectedHook}
              animated={true}
              size="full"
              platform={platform}
            />
          </div>

          {/* Caption */}
          <div className="p-4 border border-sand bg-warm-white/60 mb-6">
            <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft mb-2">
              Caption
            </p>
            <p className="font-sans font-light text-sm text-charcoal leading-relaxed mb-3">
              {result.caption}
            </p>
            <p className="font-sans text-xs text-gold">
              {result.hashtags?.map((h) => `#${h}`).join(" ")}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Video — Pro tier */}
            {videoUrl ? (
              <a
                href={videoUrl}
                download={`meetha-video-${Date.now()}.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-luxury btn-gold w-full text-center block"
              >
                Download Video
              </a>
            ) : (effectiveCredits?.tier === "pro" || previewTier === "pro") ? (
              <button
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo}
                className="btn-luxury btn-gold w-full"
              >
                {isGeneratingVideo ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                    Generating video...
                  </span>
                ) : (
                  "Generate Video (Pro)"
                )}
              </button>
            ) : (
              <a
                href={import.meta.env.VITE_STRIPE_PRO_LINK || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-gold/40 transition-all duration-200 text-center block"
              >
                Upgrade to Pro for Video
              </a>
            )}
            <button onClick={handleDownload} className="btn-luxury w-full">
              Download Image
            </button>
            <button
              onClick={handleCopyCaption}
              className="btn-luxury btn-luxury-outline w-full"
            >
              {captionCopied ? "Copied!" : "Copy Caption + Hashtags"}
            </button>
            <button
              onClick={handleRegenerate}
              className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Feedback ── */}
      {step === "feedback" && result && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center animate-fade-up opacity-0">
          <div className="max-w-xs mx-auto">
            <div className="divider-editorial mb-8" />

            <h3 className="font-serif font-light text-charcoal mb-3">
              Would you post this?
            </h3>
            <p className="font-sans font-light text-xs text-charcoal-soft mb-10">
              Your answer helps Meetha understand what feels postable.
            </p>

            {!feedbackGiven ? (
              <div className="grid grid-cols-3 gap-3">
                {(["yes", "maybe", "no"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleFeedback(r)}
                    className="py-4 border border-sand bg-warm-white/60 hover:bg-warm-white hover:border-gold/50 transition-all duration-200"
                  >
                    <p className="font-serif text-lg text-charcoal capitalize">{r}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="animate-fade-in opacity-0">
                <p className="font-serif text-lg text-charcoal">Thank you.</p>
              </div>
            )}

            <button
              onClick={() => navigate("/dashboard")}
              className="mt-8 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
