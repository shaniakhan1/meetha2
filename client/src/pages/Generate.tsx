import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import {
  PLATFORM_LABELS,
  SCENE_LABELS,
  ARCHETYPE_LABELS,
  MOOD_LABELS,
  VIDEO_FORMAT_LABELS,
  VIDEO_FORMAT_DESCRIPTIONS,
  type Platform,
  type SceneCategory,
  type VideoFormat,
} from "@shared/types";
import CinematicPreview from "@/components/CinematicPreview";
import { getPreviewTier } from "./Preview";

type GenStep = "select" | "template_preview" | "recording" | "transcribing" | "generating" | "hooks" | "preview" | "feedback";

// Credit costs — keep in sync with server/routers.ts
const STILL_COST = 1;
const VIDEO_COST = 5;

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
  transcript?: string;
}

const GENERATING_PHRASES = [
  "Composing your aesthetic.",
  "Curating the light.",
  "Finding your visual voice.",
  "Calibrating the mood.",
  "Almost ready.",
];

const TRANSCRIBING_PHRASES = [
  "Listening to your frequency.",
  "Extracting the emotional core.",
  "Translating your moment.",
  "Building from your words.",
];

export default function Generate() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<GenStep>("select");
  const [platform, setPlatform] = useState<Platform>("reels");
  const [sceneCategory, setSceneCategory] = useState<SceneCategory | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [customHook, setCustomHook] = useState("");
  const [showCustomHookInput, setShowCustomHookInput] = useState(false);
  const [showShareNudge, setShowShareNudge] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [outputType, setOutputType] = useState<"still" | "video">("still");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("tiktok_reels");
  const [showCustomize, setShowCustomize] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const previewTier = getPreviewTier(); // null when not in preview mode

  // Pre-select template from URL query param (e.g. ?template=paparazzi_flash)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const template = params.get("template");
    const validSlugs = ["paparazzi_flash", "digital_diary", "bill_please", "silk_robe_room_service"];
    if (template && validSlugs.includes(template)) {
      setSceneCategory(template as SceneCategory);
      setTemplateSlug(template);
      setStep("template_preview");
    }
  }, []);

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

  const regenerateCopyMutation = trpc.generations.regenerateCopy.useMutation({
    onSuccess: (data) => {
      if (result) {
        setResult({ ...result, hooks: data.hooks, caption: data.caption, hashtags: data.hashtags });
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleRegenerateCopy = () => {
    if (!result?.generation) return;
    regenerateCopyMutation.mutate({
      generationId: result.generation.id,
      platform,
      sceneCategory: sceneCategory ?? undefined,
    });
  };
  const utils = trpc.useUtils();

  const animateMeMutation = trpc.video.animateMe.useMutation({
    onSuccess: (data) => {
      setVideoUrl(data.videoUrl);
      setIsGeneratingVideo(false);
      utils.credits.get.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      setIsGeneratingVideo(false);
    },
  });

  const handleAnimateMe = () => {
    if (!result?.generation) return;
    setIsGeneratingVideo(true);
    animateMeMutation.mutate({
      generationId: result.generation.id,
      imageUrl: result.generation.image_url as string,
      archetype: result.generation.archetype,
      mood: result.generation.mood,
      sceneCategory: sceneCategory ?? undefined,
    });
  };

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

  const signatureSceneStatusQuery = trpc.signatureScene.status.useQuery();
  const signatureSceneTwoStatusQuery = trpc.signatureScene.statusTwo.useQuery();
  const signatureSceneMutation = trpc.signatureScene.generate.useMutation({
    onSuccess: (data) => {
      setResult(data as GenerationResult);
      setStep("hooks");
      utils.credits.get.invalidate();
      utils.generations.list.invalidate();
      signatureSceneStatusQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("select");
    },
  });

  const signatureSceneTwoMutation = trpc.signatureScene.generateTwo.useMutation({
    onSuccess: (data) => {
      setResult(data as GenerationResult);
      setStep("hooks");
      utils.credits.get.invalidate();
      utils.generations.list.invalidate();
      signatureSceneTwoStatusQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("select");
    },
  });

  const fromVoiceMutation = trpc.generate.fromVoice.useMutation({
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

  const handleQuickGenerate = () => {
    // One-tap generate: uses saved profile defaults, no scene/format selection
    if (!previewTier) {
      const credits = creditsQuery.data;
      if (!credits || credits.credits_remaining < STILL_COST) {
        setShowTopUp(true);
        return;
      }
    }
    setStep("generating");
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % GENERATING_PHRASES.length;
      setPhraseIndex(idx);
    }, 3000);
    generateMutation.mutateAsync({ platform: "reels" }).then(() => {
      clearInterval(interval);
    }).catch(() => clearInterval(interval));
  };

  const handleGenerate = () => {
    // In preview mode, skip the credit gate entirely
    if (!previewTier) {
      const credits = creditsQuery.data;
      if (!credits || credits.credits_remaining < STILL_COST) {
        setShowTopUp(true);
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
    generateMutation.mutateAsync({ platform, sceneCategory: sceneCategory ?? undefined, videoFormat: outputType === "video" ? videoFormat : undefined }).then((data) => {
      clearInterval(interval);
      // If Pro user chose video output, auto-trigger video generation after still is ready
      if (outputType === "video" && (effectiveCredits?.tier === "pro" || previewTier === "pro")) {
        const gen = (data as GenerationResult).generation;
        if (gen?.image_url && gen?.id) {
          setIsGeneratingVideo(true);
          videoMutation.mutate({
            generationId: gen.id,
            imageUrl: gen.image_url as string,
            archetype: gen.archetype,
            mood: gen.mood,
            sceneCategory: sceneCategory ?? undefined,
          });
        }
      }
    }).catch(() => clearInterval(interval));
  };

  const handleHookSelect = (hook: string) => {
    setSelectedHook(hook);
    if (result?.generation?.id) {
      selectHookMutation.mutate({ generationId: result.generation.id, selectedHook: hook });
    }
    setStep("preview");
  };

  const handleDownload = async () => {
    if (!result?.generation?.id) return;
    try {
      // Use the server-side download endpoint which applies the watermark for free tier
      const response = await fetch(`/api/download/${result.generation.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meetha-${result.generation.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowShareNudge(true);
      setTimeout(() => setStep("feedback"), 3500);
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

  // ── Voice recording handlers ──────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250); // collect chunks every 250ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      setStep("recording");

      // Timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 59) {
            // Auto-stop at 60s
            stopRecording();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access is required. Please allow it and try again.");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleVoiceStop = () => {
    stopRecording();
    // Give MediaRecorder time to flush the last chunk
    setTimeout(() => {
      submitVoiceRecording();
    }, 400);
  };

  const submitVoiceRecording = () => {
    const chunks = audioChunksRef.current;
    if (!chunks.length) {
      toast.error("No audio captured. Please try again.");
      setStep("select");
      return;
    }

    const mimeType = mediaRecorderRef.current?.mimeType ?? "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });

    // Check size (16MB limit)
    if (blob.size > 16 * 1024 * 1024) {
      toast.error("Recording is too long. Please keep it under 60 seconds.");
      setStep("select");
      return;
    }

    setStep("transcribing");
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % TRANSCRIBING_PHRASES.length;
      setPhraseIndex(idx);
    }, 2500);

    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      fromVoiceMutation
        .mutateAsync({
          audioBase64: base64,
          mimeType: mimeType.split(";")[0], // strip codec params
          platform,
          sceneCategory: sceneCategory ?? undefined,
        })
        .finally(() => {
          clearInterval(interval);
        });
    };
    reader.readAsDataURL(blob);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const profile = profileQuery.data;
  const credits = creditsQuery.data;

  // In preview mode, synthesize a credits object matching the selected tier
  const effectiveCredits = previewTier
    ? {
        credits_remaining: previewTier === "free" ? 3 : previewTier === "starter" ? 28 : 73,
        tier: previewTier,
      }
    : credits;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* ── Top-up Modal ── */}
      {showTopUp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowTopUp(false)}
        >
          <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-cream border-t border-sand px-6 pt-8 pb-10 animate-fade-up opacity-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTopUp(false)}
              className="absolute top-4 right-5 font-sans text-xs text-charcoal-soft hover:text-charcoal tracking-widest uppercase"
            >
              Close
            </button>
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-1">
              Credits
            </p>
            <h2 className="font-serif text-2xl text-charcoal mb-2">
              You have used all your generations.
            </h2>
            <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed mb-6">
              Upgrade to keep creating. Starter and Pro unlock more credits every month, animated video, and Animate Me.
            </p>
            <div className="space-y-3">
              <a
                href={import.meta.env.VITE_STRIPE_STARTER_LINK || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-luxury btn-gold w-full text-center block"
              >
                Starter - $19 / month
              </a>
              <a
                href={import.meta.env.VITE_STRIPE_PRO_LINK || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-luxury btn-luxury-outline w-full text-center block"
              >
                Pro - $39 / month
              </a>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Step: Template Preview ── */}
      {step === "template_preview" && (() => {
        const TEMPLATE_META: Record<string, {
          number: string;
          title: string;
          subtitle: string;
          features: string[];
          sampleImage: string;
        }> = {
          paparazzi_flash: {
            number: "Template No. 01",
            title: "Caught Looking Expensive",
            subtitle: "Flash photography. Blurry background. Someone caught you mid-moment looking effortlessly stunning.",
            features: ["Flash photography aesthetic", "Grain and motion blur", "Candid energy hook"],
            sampleImage: "/manus-storage/template-paparazzi-flash_24688a24.jpg",
          },
          digital_diary: {
            number: "Template No. 02",
            title: "Digital Diary",
            subtitle: "Taped polaroid. Handwritten note. Dried flower. Analog layering that feels like a page from a real woman's private journal.",
            features: ["Polaroid and analog layering", "Warm film grain", "Private journal hook"],
            sampleImage: "/manus-storage/template-digital-diary_11ffb1d8.jpg",
          },
          bill_please: {
            number: "Template No. 03",
            title: "Bill, Please",
            subtitle: "She reaches for the check. Calm, unbothered, final. The gesture says everything the caption does not.",
            features: ["Fine dining candlelight aesthetic", "35mm analog warmth", "Quiet power hook"],
            sampleImage: "/manus-storage/template-bill-please_7eacca04.jpg",
          },
          silk_robe_room_service: {
            number: "Template No. 04",
            title: "Silk Robe Room Service",
            subtitle: "Hotel suite. Silk robe. Morning light. Room service tray. The luxury of an unhurried morning that belongs entirely to her.",
            features: ["Luxury hotel suite morning light", "Warm cream and gold tones", "Solitude as luxury hook"],
            sampleImage: "/manus-storage/template-silk-robe_705e049a.jpg",
          },
        };
        const meta = TEMPLATE_META[templateSlug ?? ""] ?? TEMPLATE_META.paparazzi_flash;
        return (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
          {/* Template identity */}
          <div className="mb-6">
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-3">
              {meta.number}
            </p>
            <h2 className="font-serif text-3xl font-light text-charcoal mb-3">
              {meta.title}
            </h2>
            <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
              {meta.subtitle}
            </p>
          </div>

          {/* Sample image */}
          <div
            className="relative overflow-hidden mb-6"
            style={{ height: "220px", borderRadius: "2px" }}
          >
            <img
              src={meta.sampleImage}
              alt={meta.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center top" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, transparent 50%, rgba(26,15,9,0.4) 100%)",
              }}
            />
          </div>

          {/* What you get */}
          <div className="mb-8 space-y-2">
            {meta.features.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                <p className="font-sans text-xs text-charcoal-soft">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-3">
            {effectiveCredits && effectiveCredits.credits_remaining > 0 ? (
              <button
                onClick={() => {
                  if (!previewTier) {
                    const credits = creditsQuery.data;
                    if (!credits || credits.credits_remaining < STILL_COST) {
                      setShowTopUp(true);
                      return;
                    }
                  }
                  setStep("generating");
                  let idx = 0;
                  const interval = setInterval(() => {
                    idx = (idx + 1) % GENERATING_PHRASES.length;
                    setPhraseIndex(idx);
                  }, 3000);
                  generateMutation.mutateAsync({ platform, sceneCategory: sceneCategory ?? undefined }).then(() => {
                    clearInterval(interval);
                  }).catch(() => clearInterval(interval));
                }}
                className="btn-luxury w-full"
              >
                Generate Now
              </button>
            ) : (
              <button onClick={() => setShowTopUp(true)} className="btn-luxury w-full">
                Get Credits to Generate
              </button>
            )}
            <button
              onClick={() => setStep("select")}
              className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200"
            >
              Customize options
            </button>
          </div>
        </div>
        );
      })()}

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

          {/* Calibration nudge — shown when no aesthetic descriptors are set */}
          {profile && !profile.aesthetic_descriptors && (
            <div className="mb-6 flex items-start gap-3 p-4 border border-sand/80 bg-warm-white/60">
              <div className="w-1 h-full min-h-[2rem] bg-sand flex-shrink-0" />
              <div className="flex-1">
                <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                  Your generations are using a default aesthetic. Upload reference photos to personalize every image to your exact world.
                </p>
                <button
                  onClick={() => navigate("/profile")}
                  className="mt-2 font-sans text-xs tracking-[0.1em] uppercase text-gold hover:text-charcoal transition-colors"
                >
                  Calibrate now
                </button>
              </div>
            </div>
          )}

          {/* ── Quick Generate — one tap, zero decisions ── */}
          {effectiveCredits && effectiveCredits.credits_remaining > 0 && (
            <div className="mb-6">
              <button
                onClick={handleQuickGenerate}
                className="w-full py-5 bg-[#2C1810] hover:bg-[#3a2015] active:scale-[0.98] transition-all duration-150 text-cream font-sans text-sm tracking-[0.15em] uppercase"
              >
                Generate My Content
              </button>
              <p className="mt-2 text-center font-sans text-xs text-charcoal-soft/60">
                Uses your saved frequency. {STILL_COST} credit.
              </p>
            </div>
          )}

          {/* Customize toggle */}
          <div className="mb-6">
            <button
              onClick={() => setShowCustomize((v) => !v)}
              className="w-full flex items-center justify-between py-3 px-4 border border-sand/60 bg-warm-white/40 hover:border-gold/40 transition-all duration-200"
            >
              <span className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                {showCustomize ? "Hide options" : "Customize"}
              </span>
              <span className="font-sans text-xs text-charcoal-soft/60">
                {showCustomize ? "\u2212" : "+"}
              </span>
            </button>
          </div>

          {/* Collapsible customize section */}
          {showCustomize && (
          <div className="animate-fade-up opacity-0">

          {/* Signature Scene — featured viral template, free once */}
          {!signatureSceneStatusQuery.data?.used && (
            <div className="mb-6 relative overflow-hidden border border-gold/60 bg-gradient-to-br from-warm-white to-gold/5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gold" />
                    <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold">
                      Signature Scene
                    </p>
                  </div>
                  <span className="font-sans text-xs text-gold/80 border border-gold/30 px-2 py-0.5">
                    Free
                  </span>
                </div>
                <h3 className="font-serif text-lg text-charcoal mb-2">
                  Yes to All
                </h3>
                <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed mb-4">
                  A curated cinematic moment tuned to your exact frequency. No choices needed. One tap.
                </p>
                <button
                  onClick={() => {
                    setStep("generating");
                    let idx = 0;
                    const interval = setInterval(() => {
                      idx = (idx + 1) % GENERATING_PHRASES.length;
                      setPhraseIndex(idx);
                    }, 3000);
                    signatureSceneMutation.mutateAsync().finally(() => clearInterval(interval));
                  }}
                  className="w-full py-3 border border-gold bg-gold/10 hover:bg-gold/20 transition-all duration-200 font-sans text-xs tracking-[0.15em] uppercase text-charcoal"
                >
                  Generate my Signature Scene
                </button>
              </div>
            </div>
          )}

          {/* Signature Scene 2: Quiet Wealth — free once */}
          {!signatureSceneTwoStatusQuery.data?.used && (
            <div className="mb-6 relative overflow-hidden border border-sand/80 bg-gradient-to-br from-warm-white to-sand/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sand/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-charcoal-soft" />
                    <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
                      Signature Scene
                    </p>
                  </div>
                  <span className="font-sans text-xs text-charcoal-soft/80 border border-sand/60 px-2 py-0.5">
                    Free
                  </span>
                </div>
                <h3 className="font-serif text-lg text-charcoal mb-2">
                  Quiet Wealth
                </h3>
                <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed mb-4">
                  A private morning. No performance. Just the texture of a life that is already full.
                </p>
                <button
                  onClick={() => {
                    setStep("generating");
                    let idx = 0;
                    const interval = setInterval(() => {
                      idx = (idx + 1) % GENERATING_PHRASES.length;
                      setPhraseIndex(idx);
                    }, 3000);
                    signatureSceneTwoMutation.mutateAsync().finally(() => clearInterval(interval));
                  }}
                  className="w-full py-3 border border-sand hover:border-charcoal/30 bg-warm-white/60 hover:bg-warm-white transition-all duration-200 font-sans text-xs tracking-[0.15em] uppercase text-charcoal"
                >
                  Generate Quiet Wealth
                </button>
              </div>
            </div>
          )}

          {/* Output type selector — Pro only */}
          {(effectiveCredits?.tier === "pro" || previewTier === "pro") && (
            <div className="mb-8">
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal mb-4">
                Output
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["still", "video"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOutputType(type)}
                    className={`py-3 px-2 text-center border transition-all duration-200 ${
                      outputType === type
                        ? "border-gold bg-gold/10 text-charcoal"
                        : "border-sand/60 bg-warm-white/60 text-charcoal hover:border-gold/40"
                    }`}
                  >
                    <p className="font-sans text-xs tracking-[0.1em] uppercase">
                      {type === "still" ? "Still Image" : "Animated Video"}
                    </p>
                    <p className="font-sans text-xs text-charcoal-soft mt-0.5">
                      {type === "still" ? "Download or post" : "15-sec cinematic clip"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voice-to-content entry point */}
          <div className="mb-8 p-5 border border-sand/60 bg-warm-white/40">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal mb-1">
              Speak your moment
            </p>
            <p className="font-sans font-light text-xs text-charcoal-soft mb-4 leading-relaxed">
              Talk for up to 60 seconds. Meetha listens and builds your content from what you say.
            </p>
            <button
              onClick={startRecording}
              className="w-full flex items-center justify-center gap-3 py-4 border border-gold/40 bg-gold/5 hover:bg-gold/10 transition-all duration-200 group"
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gold">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </span>
              <span className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal group-hover:text-charcoal">
                Tap to record
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-sand/40" />
            <p className="font-sans text-xs text-charcoal-soft/60 tracking-[0.1em] uppercase">or choose manually</p>
            <div className="flex-1 h-px bg-sand/40" />
          </div>

          {/* Format — still image options or video format options depending on outputType */}
          <div className="mb-8">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal mb-4">
              Format
            </p>
            {outputType === "video" ? (
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(VIDEO_FORMAT_LABELS) as VideoFormat[]).map((vf) => (
                  <button
                    key={vf}
                    onClick={() => setVideoFormat(vf)}
                    className={`py-3 px-4 text-left border transition-all duration-200 ${
                      videoFormat === vf
                        ? "border-gold bg-gold/10 text-charcoal"
                        : "border-sand/60 bg-warm-white/60 text-charcoal hover:border-gold/40"
                    }`}
                  >
                    <p className="font-sans text-xs tracking-[0.1em] uppercase">
                      {VIDEO_FORMAT_LABELS[vf]}
                    </p>
                    <p className="font-sans text-xs text-charcoal-soft mt-0.5">
                      {VIDEO_FORMAT_DESCRIPTIONS[vf]}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
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
            )}
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

          {/* Generate CTA inside customize panel */}
          <button
            onClick={handleGenerate}
            className="btn-luxury w-full"
          >
            Generate with Custom Settings
          </button>

          </div>
          )}


        </div>
      )}

      {/* ── Step: Recording ── */}
      {step === "recording" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="max-w-xs mx-auto">
            {/* Pulsing mic indicator */}
            <div className="relative w-24 h-24 mx-auto mb-10">
              <div className="absolute inset-0 rounded-full bg-gold/10 animate-ping" style={{ animationDuration: "1.5s" }} />
              <div className="absolute inset-2 rounded-full bg-gold/20 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.3s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-gold">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </div>
              </div>
            </div>

            <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-2">Recording</p>
            <p className="font-serif text-3xl text-charcoal mb-4">{formatTime(recordingSeconds)}</p>
            <p className="font-sans font-light text-xs text-charcoal-soft mb-10 leading-relaxed">
              Speak naturally. Talk about your day, a feeling, or a moment you want to share.
            </p>

            <button
              onClick={handleVoiceStop}
              className="btn-luxury w-full"
            >
              Done — Build My Content
            </button>
            <button
              onClick={() => {
                stopRecording();
                setStep("select");
              }}
              className="mt-3 w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Transcribing ── */}
      {step === "transcribing" && (
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
              {TRANSCRIBING_PHRASES[phraseIndex]}
            </h3>
            <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
              Meetha is reading your frequency and building your content. This takes about 20 seconds.
            </p>
          </div>
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
          {/* Show transcript if this came from voice */}
          {result.transcript && (
            <div className="mb-6 p-4 border border-sand/60 bg-warm-white/60">
              <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft mb-2">
                What Meetha heard
              </p>
              <p className="font-sans font-light text-xs text-charcoal leading-relaxed italic">
                "{result.transcript}"
              </p>
            </div>
          )}

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
          <div className="space-y-3">
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

            {/* Custom hook option */}
            {!showCustomHookInput ? (
              <button
                onClick={() => setShowCustomHookInput(true)}
                className="w-full text-left p-5 border border-dashed border-sand/60 bg-transparent hover:border-gold/40 transition-all duration-200"
              >
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft/60 mb-2">
                  Write your own
                </p>
                <p className="font-serif text-base text-charcoal-soft/50">Type your own hook instead</p>
              </button>
            ) : (
              <div className="p-5 border border-gold/40 bg-warm-white/60">
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-gold mb-3">
                  Your hook
                </p>
                <input
                  type="text"
                  value={customHook}
                  onChange={(e) => setCustomHook(e.target.value)}
                  placeholder="calm women move differently"
                  maxLength={60}
                  autoFocus
                  className="w-full bg-transparent font-serif text-lg text-charcoal placeholder:text-charcoal/30 outline-none border-b border-sand pb-2 mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (customHook.trim()) handleHookSelect(customHook.trim());
                    }}
                    disabled={!customHook.trim()}
                    className="flex-1 py-2 bg-[#2C1810] text-cream font-sans text-xs tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#3a2015] transition-colors"
                  >
                    Use this
                  </button>
                  <button
                    onClick={() => { setShowCustomHookInput(false); setCustomHook(""); }}
                    className="px-4 py-2 font-sans text-xs tracking-widest uppercase text-charcoal-soft border border-sand hover:border-charcoal/40 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action row: Regenerate hooks (free) + Start over */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleRegenerateCopy}
              disabled={regenerateCopyMutation.isPending}
              className="flex-1 py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200 disabled:opacity-50"
            >
              {regenerateCopyMutation.isPending ? "Rewriting..." : "New hooks"}
            </button>
            <button
              onClick={handleRegenerate}
              className="px-4 py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft/60 hover:text-charcoal-soft border border-sand/60 hover:border-sand transition-all duration-200"
            >
              Start over
            </button>
          </div>
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
          {/* Ken Burns animation is Starter+ only */}
          {(effectiveCredits?.tier === "free" || (!effectiveCredits?.tier && !previewTier)) && (
            <div className="mb-2 px-1">
              <p className="font-sans text-xs text-charcoal-soft/70">
                Animated preview unlocked on Starter and Pro plans.
              </p>
            </div>
          )}
          <div className="mb-6">
            <CinematicPreview
              imageUrl={result.generation.image_url as string}
              hook={selectedHook}
              animated={
                effectiveCredits?.tier === "starter" ||
                effectiveCredits?.tier === "pro" ||
                previewTier === "starter" ||
                previewTier === "pro"
              }
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
            {/* Video — ready to download */}
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
            ) : isGeneratingVideo ? (
              <button disabled className="btn-luxury btn-gold w-full opacity-80">
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                  Animating your scene...
                </span>
              </button>
            ) : (effectiveCredits?.tier === "starter" || effectiveCredits?.tier === "pro" || previewTier === "starter" || previewTier === "pro") ? (
              <div>
                <button
                  onClick={handleAnimateMe}
                  className="btn-luxury btn-gold w-full"
                >
                  Animate Me
                </button>
                <p className="mt-1 text-center font-sans text-xs text-charcoal-soft/60">
                  Turns your still into a 5-second cinematic clip. {VIDEO_COST} credits.
                </p>
              </div>
            ) : (
              <a
                href={import.meta.env.VITE_STRIPE_STARTER_LINK || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-gold/40 transition-all duration-200 text-center block"
              >
                Upgrade to Starter for Animate Me
              </a>
            )}
            {/* Share nudge — appears after download, auto-dismisses */}
            {showShareNudge && selectedHook && (
              <div className="w-full p-4 bg-[#2C1810] text-cream animate-fade-up opacity-0 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-xs tracking-[0.1em] uppercase text-gold/80 mb-1">Post to your story</p>
                  <p className="font-serif text-sm text-cream truncate">"{selectedHook}"</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedHook);
                    toast.success("Hook copied.");
                  }}
                  className="shrink-0 px-3 py-2 border border-cream/30 font-sans text-xs tracking-widest uppercase text-cream hover:bg-cream/10 transition-colors"
                >
                  Copy hook
                </button>
              </div>
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
