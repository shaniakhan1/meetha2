import { useState, useEffect, useRef } from "react";
import { saveOrShareBlob } from "@/lib/saveOrShare";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  PLATFORM_LABELS,
  SCENE_LABELS,
  ARCHETYPE_LABELS,
  MOOD_LABELS,
  CREATE_OCCASION_LABELS,
  CREATE_OCCASION_DESCRIPTIONS,
  CREATE_ENERGY_LABELS,
  CREATE_ENERGY_DESCRIPTIONS,
  type Platform,
  type SceneCategory,
  type CreateOccasion,
  type CreateEnergy,
  type CreateRefinements,
} from "@shared/types";
import CinematicPreview from "@/components/CinematicPreview";
import StyleBriefCard from "@/components/StyleBriefCard";
import { getPreviewTier } from "./Preview";
// html2canvas removed — export uses server-side /api/style-card/:id and /api/download/:id

const SCENE_PREVIEW_IMAGES: Record<string, string> = {
  paparazzi_flash: "/manus-storage/template-paparazzi-flash_24688a24.jpg",
  digital_diary: "/manus-storage/template-digital-diary_11ffb1d8.jpg",
  bill_please: "/manus-storage/template-bill-please_7eacca04.jpg",
  silk_robe_room_service: "/manus-storage/template-silk-robe_705e049a.jpg",
  irish_goodbye: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-irish-goodbye-ktzNEA3LBpMXoScC2CgPoj.webp",
  cleopatra_principle: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-cleopatra-RNkWpwxV5GeWZwStmYqiQx.webp",
  silk_robe_retaliation: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-silk-robe-retaliation-MJXwGjfHhTjt3ENoPKdG8s.webp",
};

type GenStep = "select" | "template_preview" | "generating" | "hooks" | "preview";
type StudioSubStep = "occasion" | "energy" | "refinements";

// Credit costs - keep in sync with server/routers.ts
const STILL_COST = 1;

interface GenerationResult {
  generation: {
    id: number;
    image_url: string;
    card_url?: string | null;
    card_key?: string | null;
    caption: string;
    archetype: string;
    mood: string;
    [key: string]: unknown;
  };
  generationNumber: number;
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

const REFINEMENT_OPTIONS: {
  key: keyof CreateRefinements;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  { key: "warmCool", label: "Tone", options: [{ value: "warm", label: "Warm" }, { value: "cool", label: "Cool" }] },
  { key: "metalTone", label: "Metal", options: [{ value: "gold", label: "Gold" }, { value: "silver", label: "Silver" }] },
  { key: "motionStyle", label: "Energy", options: [{ value: "motion", label: "In Motion" }, { value: "static", label: "Still" }] },
  { key: "shootStyle", label: "Shoot", options: [{ value: "candid", label: "Candid" }, { value: "editorial", label: "Editorial" }] },
  { key: "makeupLevel", label: "Makeup", options: [{ value: "glam", label: "Glam" }, { value: "natural", label: "Natural" }] },
];

export default function Generate() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<GenStep>("select");
  const [platform] = useState<Platform>("reels");
  const [sceneCategory, setSceneCategory] = useState<SceneCategory | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showLoraPaywall, setShowLoraPaywall] = useState(false);
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [aestheticRead, setAestheticRead] = useState<{
    undertone?: string;
    contrast_level?: string;
    best_metals?: string;
    ideal_whites_blacks?: string;
    makeup_intensity?: string;
    lighting_direction?: string;
    dominant_feature?: string;
    fabric_weight?: string;
    color_palette: string;
    metals: string;
    fabrics: string;
    makeup: string;
    lighting: string;
    hair: string;
  } | null>(null);
  const [aestheticReadOpen, setAestheticReadOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState<"share" | "download" | "raw" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const styleCardRef = useRef<HTMLDivElement>(null);

  /** Determine display mode from generationNumber */
  const genMode = !result ? null
    : result.generationNumber === 1 ? "style_card"
    : result.generationNumber === 2 ? "identity_brief"
    : "image_only";
  // Track whether the last generation came from a template (shows hook) or Create Studio (no hook)
  const [generationSource, setGenerationSource] = useState<"template" | "studio">("template");

  // Create Studio state
  const [showStudio, setShowStudio] = useState(false);
  const [studioSubStep, setStudioSubStep] = useState<StudioSubStep>("occasion");
  const [studioOccasion, setStudioOccasion] = useState<CreateOccasion | null>(null);
  const [studioEnergy, setStudioEnergy] = useState<CreateEnergy | null>(null);
  const [studioRefinements, setStudioRefinements] = useState<CreateRefinements>({
    warmCool: null,
    metalTone: null,
    motionStyle: null,
    shootStyle: null,
    makeupLevel: null,
  });

  const previewTier = getPreviewTier();

  // Membership checkout — creates a server-side Stripe session with user_id in metadata
  const subscriptionCheckoutMutation = trpc.profile.createSubscriptionCheckout.useMutation({
    onSuccess: ({ url }) => { window.open(url, "_blank"); },
    onError: (err) => { toast.error("Could not start checkout: " + err.message); },
  });
  const handleMembershipMonthly = () => {
    subscriptionCheckoutMutation.mutate({ origin: window.location.origin, priceId: "price_1TafvrPMV5P3vLteuAss2HQB" });
    toast.info("Opening secure checkout...");
  };
  const handleMembershipAnnual = () => {
    subscriptionCheckoutMutation.mutate({ origin: window.location.origin, priceId: "price_1TbNCKPMV5P3vLterPzZXdJ6" });
    toast.info("Opening secure checkout...");
  };

  // Queries — declared early so useEffects below can reference them
  const profileQuery = trpc.profile.get.useQuery();
  const creditsQuery = trpc.credits.get.useQuery();
  const aestheticBriefQuery = trpc.profile.getAestheticBrief.useQuery();
  const selectHookMutation = trpc.generations.selectHook.useMutation();
  const utils = trpc.useUtils();

  // Pre-select template from URL query param
  const [pendingTemplateSlug, setPendingTemplateSlug] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const template = params.get("template");
    const validSlugs = ["paparazzi_flash", "digital_diary", "bill_please", "silk_robe_room_service", "irish_goodbye", "cleopatra_principle", "silk_robe_retaliation", "motion_blur"];
    if (template && validSlugs.includes(template)) {
      setSceneCategory(template as SceneCategory);
      setTemplateSlug(template);
      setPendingTemplateSlug(template);
      setStep("generating");
    }
  }, []);

  const aestheticReadMutation = trpc.generations.aestheticRead.useMutation({
    onSuccess: (data) => setAestheticRead(data),
  });

  const triggerAestheticRead = (gen: GenerationResult["generation"], prof: any) => {
    aestheticReadMutation.mutate({
      archetype: (gen.archetype as string) ?? prof?.archetype ?? "luxury_minimal",
      mood: (gen.mood as string) ?? prof?.mood ?? "soft",
      sceneCategory: (gen.scene_category as string | null | undefined) ?? undefined,
      aestheticDescriptors: (prof?.aesthetic_descriptors as string | null | undefined) ?? undefined,
      loraPhysicalDescriptors: (prof?.lora_physical_descriptors as string | null | undefined) ?? undefined,
    });
  };

  const onGenerationSuccess = (data: GenerationResult) => {
    // Guard: if generation is missing the response shape is wrong — surface a real error
    if (!data?.generation?.image_url) {
      console.error("[onGenerationSuccess] Unexpected response shape:", data);
      toast.error("Generation failed — unexpected response. Please try again.");
      setStep("select");
      return;
    }
    setResult(data);
    const firstHook = data.hooks?.[0] ?? null;
    if (firstHook) {
      setSelectedHook(firstHook);
      if (data.generation?.id) {
        selectHookMutation.mutate({ generationId: data.generation.id, selectedHook: firstHook });
      }
    }
    setStep("preview");
    utils.credits.get.invalidate();
    utils.generations.list.invalidate();
    utils.profile.get.invalidate();
    const prof = profileQuery.data as any;
    // Only run aestheticRead on Gen 2+ (member reveal). Gen 1 is the emotional hook only.
    if (data.generation && data.generationNumber >= 2) {
      triggerAestheticRead(data.generation, prof);
    }
  };

  const generateMutation = trpc.generate.content.useMutation({
    onSuccess: (data) => onGenerationSuccess(data as GenerationResult),
    onError: (err) => {
      if (err.message === "LORA_PAYWALL") {
        setShowLoraPaywall(true);
        setStep("select");
      } else {
        toast.error(err.message);
        setStep("select");
      }
    },
  });

  const createStudioMutation = trpc.createStudio.generate.useMutation({
    onSuccess: (data) => onGenerationSuccess(data as unknown as GenerationResult),
    onError: (err) => {
      if (err.message === "LORA_PAYWALL") {
        setShowLoraPaywall(true);
        setStep("select");
      } else {
        toast.error(err.message);
        setStep("select");
      }
    },
  });

  // Auto-fire generation once credits are loaded (for Make Mine / template URL flow)
  useEffect(() => {
    if (!pendingTemplateSlug) return;
    if (creditsQuery.isLoading) return;
    const slug = pendingTemplateSlug;
    setPendingTemplateSlug(null);
    const c = creditsQuery.data;
    if (!previewTier && (!c || (c.credits_remaining ?? 0) < STILL_COST)) {
      setShowTopUp(true);
      setStep("select");
      return;
    }
    let idx = 0;
    const interval = setInterval(() => { idx = (idx + 1) % GENERATING_PHRASES.length; setPhraseIndex(idx); }, 3000);
    setGenerationSource("template");
    generateMutation.mutateAsync({ platform, sceneCategory: slug as SceneCategory }).finally(() => clearInterval(interval));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTemplateSlug, creditsQuery.isLoading]);

  const profile = profileQuery.data;
  const credits = creditsQuery.data;
  const normalizedCredits = credits ? { ...credits, creditsRemaining: credits.credits_remaining } : null;
  const effectiveCredits = previewTier
    ? { creditsRemaining: previewTier === "free" ? 1 : previewTier === "starter" ? 25 : 25, tier: previewTier }
    : normalizedCredits;

  const startGenerating = (fn: () => Promise<any>) => {
    if (!previewTier) {
      const c = creditsQuery.data;
      if (!c || (c.credits_remaining ?? 0) < STILL_COST) { setShowTopUp(true); return; }
    }
    setStep("generating");
    let idx = 0;
    const interval = setInterval(() => { idx = (idx + 1) % GENERATING_PHRASES.length; setPhraseIndex(idx); }, 3000);
    fn().finally(() => clearInterval(interval));
  };

  const handleQuickGenerate = () => startGenerating(() => generateMutation.mutateAsync({ platform: "reels" }));

  const handleTemplateGenerate = () => {
    setGenerationSource("template");
    startGenerating(() =>
      generateMutation.mutateAsync({ platform, sceneCategory: sceneCategory ?? undefined })
    );
  };

  const handleStudioGenerate = () => {
    if (!studioOccasion || !studioEnergy) {
      toast.error("Please choose an occasion and energy first.");
      return;
    }
    setGenerationSource("studio");
    startGenerating(() =>
      createStudioMutation.mutateAsync({
        occasion: studioOccasion,
        energy: studioEnergy,
        refinements: studioRefinements,
      })
    );
  };

  // Poll for card_url
  const [cardPollCount, setCardPollCount] = useState(0);
  const cardPollQuery = trpc.generations.getCardUrl.useQuery(
    { generationId: result?.generation?.id ?? 0 },
    { enabled: !!result?.generation?.id && !result?.generation?.card_url && cardPollCount < 12, refetchInterval: 5000, refetchIntervalInBackground: false }
  );
  useEffect(() => {
    if (cardPollQuery.data?.cardUrl && result && !result.generation.card_url) {
      setResult({ ...result, generation: { ...result.generation, card_url: cardPollQuery.data.cardUrl } });
      setCardPollCount(12);
    }
  }, [cardPollQuery.data?.cardUrl]);

  /** Gen 1: Save & Share Style Card — server-rendered via /api/style-card/:id */
  const handleSaveShareStyleCard = async () => {
    if (!result?.generation?.id) return;
    setExportLoading("share");
    try {
      await saveOrShareBlob(`/api/style-card/${result.generation.id}`, `meetha-style-card-${result.generation.id}.jpg`, selectedHook ?? "Styled by Meetha.");
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") toast.error("Could not save. Please try again.");
    } finally {
      setExportLoading(null);
    }
  };

  /** Gen 3+: Save & Share Image — server-rendered via /api/download/:id */
  const handleSaveShareImage = async () => {
    if (!result?.generation?.id) return;
    setExportLoading("raw");
    try {
      await saveOrShareBlob(`/api/download/${result.generation.id}`, `meetha-${result.generation.id}.jpg`, selectedHook ?? "Styled by Meetha.");
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") toast.error("Could not save. Please try again.");
    } finally {
      setExportLoading(null);
    }
  };


  const handleRegenerate = () => {
    setResult(null); setSelectedHook(null); setAestheticRead(null); setAestheticReadOpen(false);
    setStudioOccasion(null); setStudioEnergy(null);
    setStudioRefinements({ warmCool: null, metalTone: null, motionStyle: null, shootStyle: null, makeupLevel: null });
    setStudioSubStep("occasion"); setShowStudio(false);
    setStep("select");
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* ── Top-up Modal ── */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowTopUp(false)}>
          <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-cream border-t border-sand px-6 pt-8 pb-10 animate-fade-up opacity-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTopUp(false)} className="absolute top-4 right-5 font-sans text-xs text-charcoal-soft hover:text-charcoal tracking-widest uppercase">Close</button>
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-1">Credits</p>
            <h2 className="font-serif text-2xl text-charcoal mb-2">You have used all your generations.</h2>
            <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed mb-6">Membership unlocks 25 generations per month so you can keep building your aesthetic.</p>
            <div className="space-y-3">
              <button onClick={handleMembershipMonthly} disabled={subscriptionCheckoutMutation.isPending} className="btn-luxury btn-gold w-full text-center block disabled:opacity-60">{subscriptionCheckoutMutation.isPending ? "Opening..." : "Membership — $19 / month"}</button>
              <button onClick={handleMembershipAnnual} disabled={subscriptionCheckoutMutation.isPending} className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft/60 hover:text-charcoal-soft transition-colors text-center block disabled:opacity-60">Annual plan (save 20%)</button>
            </div>
          </div>
        </div>
      )}

      {/* LoRA paywall modal */}
      {showLoraPaywall && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowLoraPaywall(false)}>
          <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-cream border-t border-sand px-6 pt-8 pb-10 animate-fade-up opacity-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowLoraPaywall(false)} className="absolute top-4 right-5 font-sans text-xs text-charcoal-soft hover:text-charcoal tracking-widest uppercase">Close</button>
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold mb-1">Your Look</p>
            <h2 className="font-serif text-2xl text-charcoal mb-2">Your first look was on us.</h2>
            <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed mb-6">You have seen what Meetha can do with your face. Membership unlocks 25 generations per month so you can keep creating with your look.</p>
            <div className="space-y-3">
              <button onClick={handleMembershipMonthly} disabled={subscriptionCheckoutMutation.isPending} className="btn-luxury btn-gold w-full text-center block disabled:opacity-60">{subscriptionCheckoutMutation.isPending ? "Opening..." : "Membership — $19 / month"}</button>
              <button onClick={handleMembershipAnnual} disabled={subscriptionCheckoutMutation.isPending} className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft/60 hover:text-charcoal-soft transition-colors text-center block disabled:opacity-60">Annual plan (save 20%)</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-sand/40">
        <button onClick={() => navigate("/dashboard")} className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors">Back</button>
        <span className="font-serif text-lg tracking-widest text-charcoal cursor-pointer" onClick={() => navigate("/dashboard")}>MEETHA</span>
        <div className="text-right">
          <p className="font-sans text-xs text-gold">{effectiveCredits?.creditsRemaining ?? "."} left</p>
          {effectiveCredits?.tier === "free" && (
            <p className="font-sans text-[10px] text-charcoal-soft/50 tracking-wide">Make each one count.</p>
          )}
        </div>
      </div>

      {/* ── Step: Template Preview ── */}
      {step === "template_preview" && (() => {
        const TEMPLATE_META: Record<string, { number: string; title: string; subtitle: string; features: string[]; sampleImage: string; }> = {
          paparazzi_flash: { number: "Template No. 01", title: "Caught Looking Expensive", subtitle: "Flash photography. Blurry background. Someone caught you mid-moment looking effortlessly stunning.", features: ["Flash photography aesthetic", "Grain and motion blur", "Candid energy hook"], sampleImage: "/manus-storage/template-paparazzi-flash_24688a24.jpg" },
          digital_diary: { number: "Template No. 02", title: "Digital Diary", subtitle: "Taped polaroid. Handwritten note. Dried flower. Analog layering that feels like a page from a real woman's private journal.", features: ["Polaroid and analog layering", "Warm film grain", "Private journal hook"], sampleImage: "/manus-storage/template-digital-diary_11ffb1d8.jpg" },
          bill_please: { number: "Template No. 03", title: "Bill, Please", subtitle: "She reaches for the check. Calm, unbothered, final. The gesture says everything the caption does not.", features: ["Fine dining candlelight aesthetic", "35mm analog warmth", "Quiet power hook"], sampleImage: "/manus-storage/template-bill-please_7eacca04.jpg" },
          silk_robe_room_service: { number: "Template No. 04", title: "Silk Robe Room Service", subtitle: "Hotel suite. Silk robe. Morning light. Room service tray. The luxury of an unhurried morning that belongs entirely to her.", features: ["Luxury hotel suite morning light", "Warm cream and gold tones", "Solitude as luxury hook"], sampleImage: "/manus-storage/template-silk-robe_705e049a.jpg" },
          irish_goodbye: { number: "Template No. 05", title: "The Goodbye", subtitle: "She is walking away from the party. Seen from behind. Mid-stride. The crowd is blurred. She is not looking back.", features: ["Night exit cinematic energy", "Motion blur crowd", "No-announcement hook"], sampleImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-irish-goodbye-ktzNEA3LBpMXoScC2CgPoj.webp" },
          cleopatra_principle: { number: "Template No. 06", title: "The Cleopatra Principle", subtitle: "Velvet chaise. Direct eye contact. No smile, no performance. The stillness of someone who has already decided everything.", features: ["Velvet chaise editorial lighting", "Direct gaze presence", "Already decided hook"], sampleImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-cleopatra-RNkWpwxV5GeWZwStmYqiQx.webp" },
          silk_robe_retaliation: { number: "Template No. 07", title: "The Robe Reset", subtitle: "Floor-to-ceiling windows. Silk robe. Golden hour. Seen from behind. The energy of someone who chose herself and does not need to explain it.", features: ["Golden hour silhouette aesthetic", "Warm amber window light", "Chose herself hook"], sampleImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-silk-robe-retaliation-MJXwGjfHhTjt3ENoPKdG8s.webp" },
        };
        const meta = TEMPLATE_META[templateSlug ?? ""] ?? TEMPLATE_META.paparazzi_flash;
        return (
          <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">
            <div className="mb-6">
              <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-3">{meta.number}</p>
              <h2 className="font-serif text-4xl font-light text-charcoal mb-3">{meta.title}</h2>
              <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">{meta.subtitle}</p>
            </div>
            <div className="relative overflow-hidden mb-6" style={{ height: "220px", borderRadius: "2px" }}>
              <img src={meta.sampleImage} alt={meta.title} className="w-full h-full object-cover" style={{ objectPosition: "center top" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(26,15,9,0.4) 100%)" }} />
            </div>
            <div className="mb-8 space-y-2">
              {meta.features.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                  <p className="font-sans text-xs text-charcoal-soft">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-auto space-y-3">
              {effectiveCredits && effectiveCredits.creditsRemaining > 0 ? (
                <button onClick={handleTemplateGenerate} className="btn-luxury w-full py-5 text-sm tracking-[0.2em]">Generate This Scene</button>
              ) : (
                <button onClick={() => setShowTopUp(true)} className="btn-luxury w-full">Get Credits to Generate</button>
              )}
              <button onClick={() => setStep("select")} className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200">
                Refine My Look
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Step: Select ── */}
      {step === "select" && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">

          {/* Profile identity */}
          {profile && (
            <div className="mb-8">
              <p className="font-sans text-xs tracking-[0.18em] uppercase text-gold mb-2">Creating as</p>
              <h2 className="font-serif text-2xl text-charcoal leading-tight">
                {ARCHETYPE_LABELS[profile.archetype as keyof typeof ARCHETYPE_LABELS] ?? profile.archetype}
              </h2>
              <p className="font-sans font-light text-sm text-charcoal-soft mt-1">
                {MOOD_LABELS[profile.mood as keyof typeof MOOD_LABELS] ?? profile.mood}
              </p>
            </div>
          )}

          {/* Create Studio toggle */}
          <div className="mb-4">
            <button
              onClick={() => { setShowStudio((v) => !v); setStudioSubStep("occasion"); }}
              className="w-full flex items-center justify-between py-3 px-4 border border-sand/60 bg-warm-white/40 hover:border-gold/40 transition-all duration-200"
            >
              <span className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
                {showStudio ? "Hide" : "Create Studio"}
              </span>
              <span className="font-sans text-xs text-charcoal-soft/60">{showStudio ? "−" : "+"}</span>
            </button>
          </div>

          {/* ── Create Studio Panel ── */}
          {showStudio && (
            <div className="animate-fade-up opacity-0">

              {/* Sub-step nav */}
              <div className="flex gap-1 mb-6">
                {(["occasion", "energy", "refinements"] as StudioSubStep[]).map((s, i) => (
                  <button
                    key={s}
                    onClick={() => { if (s === "energy" && !studioOccasion) return; if (s === "refinements" && (!studioOccasion || !studioEnergy)) return; setStudioSubStep(s); }}
                    className={`flex-1 py-2 font-sans text-[10px] tracking-[0.12em] uppercase transition-all duration-200 border ${
                      studioSubStep === s ? "border-gold bg-gold/10 text-charcoal" : "border-sand/40 text-charcoal-soft/50"
                    } ${(s === "energy" && !studioOccasion) || (s === "refinements" && (!studioOccasion || !studioEnergy)) ? "opacity-30 cursor-not-allowed" : "hover:border-gold/40 cursor-pointer"}`}
                  >
                    {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {/* Sub-step: Occasion */}
              {studioSubStep === "occasion" && (
                <div className="mb-6">
                  <p className="font-sans text-xs tracking-[0.18em] uppercase text-gold mb-1">Choose Your Moment</p>
                  <p className="font-sans text-[11px] text-charcoal-soft/60 mb-4">Select the situation you want to style.</p>
                  <div className="space-y-2">
                    {(Object.keys(CREATE_OCCASION_LABELS) as CreateOccasion[]).map((occ) => (
                      <button
                        key={occ}
                        onClick={() => { setStudioOccasion(occ); setStudioSubStep("energy"); }}
                        className={`w-full py-3 px-4 text-left border transition-all duration-200 ${
                          studioOccasion === occ ? "border-gold bg-gold/10" : "border-sand/60 bg-warm-white/60 hover:border-gold/40"
                        }`}
                      >
                        <p className="font-sans text-xs tracking-[0.08em] uppercase text-charcoal">{CREATE_OCCASION_LABELS[occ]}</p>
                        <p className="font-sans text-[11px] text-charcoal-soft/60 mt-0.5 leading-snug">{CREATE_OCCASION_DESCRIPTIONS[occ]}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-step: Energy */}
              {studioSubStep === "energy" && (
                <div className="mb-6">
                  <p className="font-sans text-xs tracking-[0.18em] uppercase text-gold mb-1">Choose Your Energy</p>
                  <p className="font-sans text-[11px] text-charcoal-soft/60 mb-4">The visual filter for your moment.</p>
                  <div className="space-y-2">
                    {(Object.keys(CREATE_ENERGY_LABELS) as CreateEnergy[]).map((eng) => (
                      <button
                        key={eng}
                        onClick={() => { setStudioEnergy(eng); setStudioSubStep("refinements"); }}
                        className={`w-full py-3 px-4 text-left border transition-all duration-200 ${
                          studioEnergy === eng ? "border-gold bg-gold/10" : "border-sand/60 bg-warm-white/60 hover:border-gold/40"
                        }`}
                      >
                        <p className="font-sans text-xs tracking-[0.08em] uppercase text-charcoal">{CREATE_ENERGY_LABELS[eng]}</p>
                        <p className="font-sans text-[11px] text-charcoal-soft/60 mt-0.5 leading-snug">{CREATE_ENERGY_DESCRIPTIONS[eng]}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStudioSubStep("occasion")} className="mt-4 w-full py-2 font-sans text-xs tracking-widest uppercase text-charcoal-soft/60 hover:text-charcoal-soft transition-colors">
                    ← Back
                  </button>
                </div>
              )}

              {/* Sub-step: Refinements */}
              {studioSubStep === "refinements" && (
                <div className="mb-6">
                  <p className="font-sans text-xs tracking-[0.18em] uppercase text-gold mb-1">Refine the Details</p>
                  <p className="font-sans text-[11px] text-charcoal-soft/60 mb-4">Optional. Leave any unset and Meetha decides.</p>

                  {/* Summary of selections */}
                  <div className="mb-5 p-4 bg-warm-white/60 border border-sand/40">
                    <div className="flex gap-3 mb-1.5">
                      <p className="font-sans text-[10px] tracking-[0.12em] uppercase text-gold/70 w-16 shrink-0">Moment</p>
                      <p className="font-sans text-xs text-charcoal">{studioOccasion ? CREATE_OCCASION_LABELS[studioOccasion] : "—"}</p>
                    </div>
                    <div className="flex gap-3">
                      <p className="font-sans text-[10px] tracking-[0.12em] uppercase text-gold/70 w-16 shrink-0">Energy</p>
                      <p className="font-sans text-xs text-charcoal">{studioEnergy ? CREATE_ENERGY_LABELS[studioEnergy] : "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {REFINEMENT_OPTIONS.map(({ key, label, options }) => (
                      <div key={key}>
                        <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-charcoal-soft/60 mb-2">{label}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setStudioRefinements((r) => ({ ...r, [key]: null }))}
                            className={`flex-1 py-2 font-sans text-[10px] tracking-[0.1em] uppercase border transition-all duration-150 ${
                              studioRefinements[key] === null ? "border-charcoal/40 bg-charcoal/5 text-charcoal" : "border-sand/40 text-charcoal-soft/50 hover:border-sand"
                            }`}
                          >
                            Auto
                          </button>
                          {options.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setStudioRefinements((r) => ({ ...r, [key]: opt.value as any }))}
                              className={`flex-1 py-2 font-sans text-[10px] tracking-[0.1em] uppercase border transition-all duration-150 ${
                                studioRefinements[key] === opt.value ? "border-gold bg-gold/10 text-charcoal" : "border-sand/40 text-charcoal-soft/50 hover:border-gold/40"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    <button onClick={handleStudioGenerate} disabled={!studioOccasion || !studioEnergy} className="btn-luxury w-full disabled:opacity-40 disabled:cursor-not-allowed">
                      Generate This Look
                    </button>
                    <button onClick={() => setStudioSubStep("energy")} className="w-full py-2 font-sans text-xs tracking-widest uppercase text-charcoal-soft/60 hover:text-charcoal-soft transition-colors">
                      ← Back
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ── Step: Generating ── */}
      {step === "generating" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="max-w-xs mx-auto">
            <div className="relative w-20 h-20 mx-auto mb-10">
              <div className="absolute inset-0 border border-gold/20 rounded-full animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-1 border border-gold/40 rounded-full animate-spin" style={{ animationDuration: "4s" }} />
              <div className="absolute inset-3 border border-gold/60 rounded-full animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gold" />
              </div>
            </div>
            <h3 className="font-serif font-light text-charcoal mb-3 transition-all duration-700">{GENERATING_PHRASES[phraseIndex]}</h3>
            <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">Meetha is building your aesthetic. This takes about 15 seconds.</p>
          </div>
        </div>
      )}

      {/* ── Step: Preview ── */}
      {step === "preview" && result && (
        <div className="flex-1 flex flex-col px-6 py-8 animate-fade-up opacity-0">

          {/* ── MODE 1: Gen 1 — Viral Style Card ── */}
          {genMode === "style_card" && (
            <>
              <div className="mb-6">
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-2">Your First Look</p>
                <h3 className="font-serif font-light text-charcoal">Your style card is ready.</h3>
                <p className="font-sans text-xs text-charcoal-soft/60 mt-1">Save it. Share it. This is your aesthetic.</p>
              </div>

              <div className="mb-6">
                <StyleBriefCard
                  ref={styleCardRef}
                  imageUrl={result.generation.image_url as string}
                  brief={{
                    hook: selectedHook ?? null,
                    title: "Your Identity Brief",
                    palette: aestheticRead?.color_palette,
                    metals: aestheticRead?.metals,
                    makeup: aestheticRead?.makeup,
                    lighting: aestheticRead?.lighting,
                    presence: aestheticRead?.hair ?? undefined,
                  }}
                />
                {aestheticReadMutation.isPending && (
                  <div className="flex items-center gap-2 mt-3 px-1">
                    <div className="w-3 h-3 border border-gold/40 border-t-gold animate-spin rounded-full shrink-0" />
                    <p className="font-sans text-xs text-charcoal-soft/60">Building your identity brief...</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSaveShareStyleCard}
                  disabled={exportLoading !== null}
                  className="btn-luxury w-full min-h-[52px] flex items-center justify-center gap-2"
                >
                  {exportLoading === "share" ? (
                    <><div className="w-4 h-4 border border-cream/40 border-t-cream animate-spin rounded-full" /> Preparing card...</>
                  ) : (
                    "Save & Share Style Card"
                  )}
                </button>
                <button onClick={() => navigate("/dashboard")} className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft/40 hover:text-charcoal-soft transition-colors">
                  Done. Back to Dashboard
                </button>
              </div>
            </>
          )}

          {/* ── MODE 2: Gen 2 — Identity Brief (saved to profile) ── */}
          {genMode === "identity_brief" && (
            <>
              <div className="mb-6">
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-2">Your Identity Brief</p>
                <h3 className="font-serif font-light text-charcoal">Saved to your profile.</h3>
                <p className="font-sans text-xs text-charcoal-soft/60 mt-1">Your deeper color and styling analysis. It lives on your profile forever.</p>
              </div>

              <div className="mb-6">
                <StyleBriefCard
                  ref={styleCardRef}
                  imageUrl={result.generation.image_url as string}
                  brief={{
                    hook: selectedHook ?? null,
                    title: "Your Identity Brief",
                    palette: aestheticRead?.color_palette,
                    metals: aestheticRead?.metals,
                    makeup: aestheticRead?.makeup,
                    lighting: aestheticRead?.lighting,
                    presence: aestheticRead?.hair ?? undefined,
                  }}
                />
                {aestheticReadMutation.isPending && (
                  <div className="flex items-center gap-2 mt-3 px-1">
                    <div className="w-3 h-3 border border-gold/40 border-t-gold animate-spin rounded-full shrink-0" />
                    <p className="font-sans text-xs text-charcoal-soft/60">Building your identity brief...</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSaveShareStyleCard}
                  disabled={exportLoading !== null}
                  className="btn-luxury w-full min-h-[52px] flex items-center justify-center gap-2"
                >
                  {exportLoading === "share" ? (
                    <><div className="w-4 h-4 border border-cream/40 border-t-cream animate-spin rounded-full" /> Saving...</>
                  ) : (
                    "Save & Share Identity Brief"
                  )}
                </button>
                <button
                  onClick={handleSaveShareImage}
                  disabled={exportLoading !== null}
                  className="btn-luxury btn-luxury-outline w-full min-h-[52px] flex items-center justify-center gap-2"
                >
                  {exportLoading === "raw" ? (
                    <><div className="w-3.5 h-3.5 border border-charcoal/40 border-t-charcoal animate-spin rounded-full" /> Preparing...</>
                  ) : (
                    "Save Image Only"
                  )}
                </button>
                <button onClick={() => navigate("/dashboard")} className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft/40 hover:text-charcoal-soft transition-colors">
                  Done. Back to Dashboard
                </button>
              </div>
            </>
          )}

          {/* ── MODE 3: Gen 3+ — Image Only ── */}
          {genMode === "image_only" && (
            <>
              <div className="mb-6">
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-2">Your Generation</p>
                <h3 className="font-serif font-light text-charcoal">Styled by Meetha.</h3>
              </div>

              <div className="mb-6">
                <CinematicPreview
                  imageUrl={result.generation.image_url as string}
                  templateTitle={
                    generationSource === "template" && sceneCategory
                      ? (SCENE_LABELS[sceneCategory] ?? null)
                      : null
                  }
                  animated={false}
                  size="full"
                  platform={result.generation.platform as string | undefined}
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSaveShareImage}
                  disabled={exportLoading !== null}
                  className="btn-luxury w-full min-h-[52px] flex items-center justify-center gap-2"
                >
                  {exportLoading === "raw" ? (
                    <><div className="w-4 h-4 border border-cream/40 border-t-cream animate-spin rounded-full" /> Preparing...</>
                  ) : (
                    "Save & Share Image"
                  )}
                </button>
                <button onClick={handleRegenerate} className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200">
                  Generate Another
                </button>
                <button onClick={() => navigate("/dashboard")} className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft/40 hover:text-charcoal-soft transition-colors">
                  Done. Back to Dashboard
                </button>
              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
}
