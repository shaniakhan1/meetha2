import { useState, useEffect, useRef } from "react";
import { saveOrShareBlob } from "@/lib/saveOrShare";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ARCHETYPE_LABELS,
  MOOD_LABELS,
  PLATFORM_LABELS,
  SCENE_LABELS,
} from "@shared/types";
// storyCardExport removed — export uses server-side /api/style-card/:id and /api/download/:id

type GenerationItem = {
  id: number;
  user_id: number;
  image_url: string;
  image_key: string;
  archetype: string;
  mood: string;
  platform: string;
  scene_category: string | null;
  hooks: string;
  caption: string;
  selected_hook: string | null;
  created_at: string;
  archived: boolean;
  archived_at: string | null;
  card_url: string | null;
  card_key: string | null;
};

const PAGE_SIZE = 12;

const TEMPLATE_CARDS = [
  { slug: "paparazzi_flash", title: "Caught Looking Expensive", image: "/manus-storage/template-paparazzi-flash_24688a24.jpg" },
  { slug: "digital_diary", title: "Digital Diary", image: "/manus-storage/template-digital-diary_11ffb1d8.jpg" },
  { slug: "bill_please", title: "Bill, Please", image: "/manus-storage/template-bill-please_7eacca04.jpg" },
  { slug: "silk_robe_room_service", title: "Room Service", image: "/manus-storage/template-silk-robe_705e049a.jpg" },
  { slug: "irish_goodbye", title: "The Goodbye", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-irish-goodbye-ktzNEA3LBpMXoScC2CgPoj.webp" },
  { slug: "cleopatra_principle", title: "The Cleopatra Principle", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-cleopatra-RNkWpwxV5GeWZwStmYqiQx.webp" },
  { slug: "silk_robe_retaliation", title: "The Robe Reset", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-silk-robe-retaliation-MJXwGjfHhTjt3ENoPKdG8s.webp" },
  { slug: "motion_blur", title: "The Blur", image: "/manus-storage/the-blur-hero-v2_053e32e7.webp" },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [offset, setOffset] = useState(0);
  const [allGenerations, setAllGenerations] = useState<GenerationItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [sharingCardId, setSharingCardId] = useState<number | null>(null);
  const [showLoraReady, setShowLoraReady] = useState(false);
  const [trainingBannerDismissed, setTrainingBannerDismissed] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const prevLoraStatus = useRef<string | null | undefined>(undefined);

  const utils = trpc.useUtils();
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    // Always refetch on mount so returning from email CTA (even on iOS Safari)
    // gets current lora_status immediately instead of stale cached data.
    refetchOnMount: "always",
    // Poll every 15s while training so the UI auto-transitions when ready.
    // lora_status is the single source of truth — no photo-count fallback.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.lora_status === "training") return 15_000;
      return false;
    },
  });
  const creditsQuery = trpc.credits.get.useQuery();
  const generationsQuery = trpc.generations.list.useQuery({ limit: PAGE_SIZE, offset });
  const referralQuery = trpc.referral.getLink.useQuery();
  const briefQuery = trpc.profile.getAestheticBrief.useQuery();

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

  // Spark Pack checkout — $5 for 3 looks
  const creditPackMutation = trpc.profile.createCreditPackCheckout.useMutation({
    onSuccess: ({ url }) => { window.open(url, "_blank"); },
    onError: (err) => { toast.error("Could not start checkout: " + err.message); },
  });
  const handleSparkPack = () => {
    creditPackMutation.mutate({ origin: window.location.origin });
    toast.info("Opening secure checkout...");
  };

  const profile = profileQuery.data;
  const credits = creditsQuery.data;
  const generationsPage = generationsQuery.data;
  const referral = referralQuery.data;

  useEffect(() => {
    if (generationsPage?.items) {
      if (offset === 0) {
        setAllGenerations(generationsPage.items);
      } else {
        setAllGenerations((prev) => {
          const existingIds = new Set(prev.map((g) => g.id));
          const newItems = generationsPage.items.filter((g) => !existingIds.has(g.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [generationsPage, offset]);

  const totalGenerations = generationsPage?.total ?? 0;
  const hasMore = allGenerations.length < totalGenerations;

  const archetype = profile?.archetype
    ? ARCHETYPE_LABELS[profile.archetype as keyof typeof ARCHETYPE_LABELS]
    : null;
  const mood = profile?.mood
    ? MOOD_LABELS[profile.mood as keyof typeof MOOD_LABELS]
    : null;

  const archiveMutation = trpc.generations.archive.useMutation({
    onSuccess: (_, variables) => {
      setAllGenerations((prev) => prev.filter((g) => g.id !== variables.id));
      setExpandedId(null);
      setDeletingId(null);
      setConfirmDeleteId(null);
      toast.success("Removed from your creations.");
      utils.generations.list.invalidate();
    },
    onError: () => {
      setDeletingId(null);
      toast.error("Could not remove. Please try again.");
    },
  });

  const handleDelete = (id: number) => {
    setDeletingId(id);
    archiveMutation.mutate({ id });
  };

  const freeRetryMutation = trpc.credits.requestFreeRetry.useMutation({
    onSuccess: (_, variables) => {
      // Remove the bad generation from the list
      setAllGenerations((prev) => prev.filter((g) => g.id !== variables.generationId));
      setExpandedId(null);
      setRetryingId(null);
      // Refresh credits so the restored credit shows immediately
      utils.credits.get.invalidate();
      utils.generations.list.invalidate();
      toast.success("Credit restored. Try again with a different mood or archetype.");
    },
    onError: (err) => {
      setRetryingId(null);
      toast.error(err.message ?? "Could not restore credit. Please try again.");
    },
  });

  const handleFreeRetry = (generationId: number) => {
    setRetryingId(generationId);
    freeRetryMutation.mutate({ generationId });
  };

  const referralUrl = referral?.code
    ? `${window.location.origin}/sign-in?ref=${referral.code}`
    : null;

  const handleCopyReferral = async () => {
    if (!referralUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referralUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = referralUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setReferralCopied(true);
      toast.success("Referral link copied.");
      setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      toast.info("Copy this link: " + referralUrl, { duration: 8000 });
    }
  };

  /** Save style card — server-rendered via /api/style-card/:id */
  const handleDownload = async (id: number, hook?: string | null) => {
    if (downloadingId === id) return;
    setDownloadingId(id);
    try {
      await saveOrShareBlob(`/api/style-card/${id}`, `meetha-style-card-${id}.jpg`, hook ?? "Styled by Meetha.");
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") toast.error("Could not save. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  /** Save clean image — server-rendered via /api/download/:id */
  const handleShareStyleCard = async (id: number, hook?: string | null) => {
    if (sharingCardId === id) return;
    setSharingCardId(id);
    try {
      await saveOrShareBlob(`/api/download/${id}`, `meetha-${id}.jpg`, hook ?? "Styled by Meetha.");
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") toast.error("Could not save image. Please try again.");
    } finally {
      setSharingCardId(null);
    }
  };

  const heroGen = allGenerations[0] ?? null;
  const firstName = user?.name?.split(" ")[0] ?? "Your Studio";

  // LoRA ready celebration: fires once when lora_status transitions to "ready"
  useEffect(() => {
    if (!user?.id || !profile) return;
    const storageKey = `meetha_lora_ready_shown_${user.id}`;
    const alreadyShown = localStorage.getItem(storageKey);
    const currentStatus = profile.lora_status;

    if (
      !alreadyShown &&
      prevLoraStatus.current !== undefined &&
      prevLoraStatus.current !== "ready" &&
      currentStatus === "ready"
    ) {
      setShowLoraReady(true);
      localStorage.setItem(storageKey, "1");
    }

    prevLoraStatus.current = currentStatus;
  }, [profile?.lora_status, user?.id]);

  // Load training banner dismissal state from localStorage
  useEffect(() => {
    if (!user?.id) return;
    const bannerKey = `meetha_training_banner_dismissed_${user.id}`;
    if (localStorage.getItem(bannerKey)) {
      setTrainingBannerDismissed(true);
    }
  }, [user?.id]);

  // Auto-clear dismissal when LoRA becomes ready (so banner can show again if user retrains)
  useEffect(() => {
    if (!user?.id || !profile) return;
    if (profile.lora_status === "ready" || profile.lora_status === "failed") {
      const bannerKey = `meetha_training_banner_dismissed_${user.id}`;
      localStorage.removeItem(bannerKey);
      setTrainingBannerDismissed(false);
    }
  }, [profile?.lora_status, user?.id]);

  // Force profile refetch when the user returns to this tab from the email CTA.
  // This handles the case where training completed while the app was in the background.
  useEffect(() => {
    const handleFocus = () => {
      profileQuery.refetch();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [profileQuery]);

  const handleDismissTrainingBanner = () => {
    if (!user?.id) return;
    const bannerKey = `meetha_training_banner_dismissed_${user.id}`;
    localStorage.setItem(bannerKey, "1");
    setTrainingBannerDismissed(true);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* LoRA ready celebration overlay */}
      {showLoraReady && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
          style={{ background: "linear-gradient(160deg, #2C1810 0%, #1a0f09 100%)" }}
        >
          {/* Decorative top rule */}
          <div className="w-px h-16 bg-gradient-to-b from-transparent to-gold/60 mb-10" />

          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-gold mb-6 animate-fade-up opacity-0" style={{ animationDelay: "100ms" }}>
            Your look is ready
          </p>

          <h2
            className="font-serif font-light text-cream text-center mb-4 animate-fade-up opacity-0"
            style={{ lineHeight: 1.05, fontSize: "clamp(2rem, 8vw, 3rem)", animationDelay: "200ms" }}
          >
            Your look is ready.<br />Let's create.
          </h2>

          <div className="w-12 h-px bg-gold/40 mb-6 animate-fade-in opacity-0" style={{ animationDelay: "300ms" }} />

          <p
            className="font-sans font-light text-sm text-cream/60 text-center leading-relaxed mb-12 max-w-xs animate-fade-up opacity-0"
            style={{ animationDelay: "350ms" }}
          >
            Meetha has learned your face, your coloring, your look. Every image from here is you.
          </p>

          <button
            onClick={() => { setShowLoraReady(false); navigate("/generate"); }}
            className="btn-luxury btn-gold w-full max-w-xs animate-fade-up opacity-0"
            style={{ animationDelay: "450ms" }}
          >
            Start creating
          </button>

          <button
            onClick={() => setShowLoraReady(false)}
            className="font-sans text-xs tracking-widest uppercase text-cream/30 hover:text-cream/60 transition-colors mt-6 min-h-[44px]"
          >
            Go to dashboard
          </button>

          {/* Decorative bottom rule */}
          <div className="w-px h-16 bg-gradient-to-b from-gold/60 to-transparent mt-10" />
        </div>
      )}

      {/* HERO - compact editorial masthead */}
      <div
        className="relative w-full flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #2C1810 0%, #1a0f09 100%)" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <span className="font-serif text-base tracking-[0.2em] text-cream/90 cursor-pointer" onClick={() => navigate("/dashboard")}>MEETHA</span>
          <button
            onClick={() => navigate("/profile")}
            className="font-sans text-xs tracking-widest uppercase text-cream/70 hover:text-cream transition-colors min-h-[44px] flex items-center"
          >
            Profile
          </button>
        </div>

        {/* Masthead row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-5 gap-4">
          {/* Left: identity */}
          <div className="flex-1 min-w-0">
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-gold/70 mb-1">Welcome back</p>
            <h1 className="font-serif text-2xl font-light text-cream leading-tight truncate">{firstName}</h1>
            {archetype && mood && (
              <p className="font-sans font-light text-xs text-cream/50 mt-0.5 truncate">{archetype} &middot; {mood}</p>
            )}
            {briefQuery.data?.palette && (
              <p className="font-sans font-light text-[10px] text-cream/30 mt-1 leading-relaxed line-clamp-1">{briefQuery.data.palette}</p>
            )}
            {/* Credits */}
            {credits && (
              <div className="flex items-center gap-2 mt-3">
                <div className="w-16 h-0.5 bg-cream/15 relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gold transition-all duration-700"
                    style={{
                      width: `${Math.min(100, ((credits.credits_remaining ?? 0) / (credits.tier === "pro" ? 25 : credits.tier === "starter" ? 25 : 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="font-sans text-[10px] text-cream/50 tabular-nums">{credits.credits_remaining} left</span>
              </div>
            )}
          </div>

          {/* Right: latest generation thumbnail */}
          {heroGen && (
            <button
              onClick={() => setExpandedId(heroGen.id)}
              className="flex-shrink-0 overflow-hidden active:scale-[0.97] transition-transform duration-150"
              style={{ width: "72px", height: "96px" }}
            >
              <img
                src={heroGen.image_url}
                alt="Your latest creation"
                className="w-full h-full object-cover"
                style={{ objectPosition: "center top" }}
              />
            </button>
          )}
        </div>
      </div>

      {/* Training card — shows while lora_status === 'training'. */}
      {profile && profile.lora_status === "training" && (
        <div
          className="w-full"
          style={{ background: "linear-gradient(135deg, #2C1810 0%, #1a0f09 100%)" }}
        >
          <div className="px-5 py-6">
            <div className="flex items-center gap-2 mb-3">
              {/* Pulsing ring + spinning border to show active work */}
              <span className="relative flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-gold/20 animate-ping" style={{ width: "16px", height: "16px" }} />
                <span className="relative block w-4 h-4 border border-gold border-t-transparent rounded-full animate-spin" />
              </span>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-gold">
                Training in progress
              </p>
            </div>
            <h2 className="font-serif text-xl font-light text-cream leading-snug mb-2">
              Your Visual Identity is Training
            </h2>
            <p className="font-sans font-light text-xs text-cream/60 leading-relaxed">
              Meetha is learning your face, proportions, coloring, and visual presence.
              This usually takes 10 to 20 minutes. We will email you when it is ready.
            </p>
            <div className="mt-4 w-full h-px bg-gold/20 relative overflow-hidden">
              {/* Shimmer progress bar */}
              <div
                className="absolute inset-y-0 left-0 bg-gold/50"
                style={{ width: "40%", animation: "shimmerProgress 2.5s ease-in-out infinite alternate" }}
              />
            </div>
          </div>
          <style>{`@keyframes shimmerProgress { from { width: 20%; opacity: 0.5; } to { width: 70%; opacity: 1; } }`}</style>
        </div>
      )}
      {/* Add photos / retry card — shows when no model is ready and not currently training. */}
      {profile && (profile.lora_status === null || profile.lora_status === "failed") && (
        <button
          onClick={() => navigate("/profile")}
          className="w-full text-left active:scale-[0.99] transition-transform duration-150"
          style={{ background: "linear-gradient(135deg, #2C1810 0%, #1a0f09 100%)" }}
        >
          <div className="px-5 py-5">
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-gold mb-2">
              {profile.lora_status === "failed" ? "Action needed" : "Step 1 of 2"}
            </p>
            <h2 className="font-serif text-xl font-light text-cream leading-snug mb-1">
              {profile.lora_status === "failed"
                ? "Training did not complete."
                : "Make every image look like you."}
            </h2>
            <p className="font-sans font-light text-xs text-cream/60 leading-relaxed mb-4">
              {profile.lora_status === "failed"
                ? "Something went wrong during training. Tap to retry with your photos."
                : "Upload 10 to 20 photos of yourself. Meetha learns your face, your coloring, your look. Every generation after that is you."}
            </p>
            <div className="inline-flex items-center gap-2 border border-gold/50 px-4 py-2">
              <span className="font-sans text-xs tracking-widest uppercase text-gold">
                {profile.lora_status === "failed" ? "Retry" : "Add photos"}
              </span>
              <span className="text-gold text-xs">&rarr;</span>
            </div>
          </div>
        </button>
      )}

      {/* Before-photo nudge: paid users who haven't generated a transformation card yet */}
      {profile && credits && credits.tier !== "free" && !(profile as Record<string, unknown>).transformation_card_url && profile.lora_status === "ready" && (
        <button
          onClick={() => navigate("/profile")}
          className="w-full text-left border-b border-gold/20 bg-gold/5 active:bg-gold/10 transition-colors duration-150"
        >
          <div className="px-5 py-4 flex items-start gap-3">
            <span className="text-gold text-base mt-0.5 flex-shrink-0">✦</span>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-xs font-semibold text-charcoal mb-0.5">Complete your Transformation Card</p>
              <p className="font-sans font-light text-xs text-charcoal-soft/80 leading-relaxed">
                Add a before photo to see your full style evolution. Takes 10 seconds.
              </p>
            </div>
            <span className="font-sans text-xs text-gold flex-shrink-0 mt-0.5">&rarr;</span>
          </div>
        </button>
      )}

      <div className="flex-1 px-5 pt-6 pb-28">

        {/* PRIMARY CTA */}
        {/* Lock generation for anyone whose model is not yet ready.
             Source of truth: lora_status === 'ready'. No photo-count check. */}
        {profile && profile.lora_status !== "ready" && (
          <div className="mb-4 px-4 py-3 border border-gold/30 bg-gold/5">
            <p className="font-sans text-xs text-charcoal tracking-wide text-center leading-relaxed">
              {profile.lora_status === "training"
                ? "Your model is still training. Check back soon."
                : "Upload your photos to unlock generation."}
            </p>
          </div>
        )}
        <button
          onClick={() => navigate("/generate")}
          disabled={credits?.credits_remaining === 0 || profile?.lora_status !== "ready"}
          className="btn-luxury w-full mb-8 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {profile?.lora_status === "training"
            ? "Training in progress..."
            : profile?.lora_status !== "ready"
            ? "Upload photos to unlock"
            : "Generate New Content"}
        </button>
        {credits?.credits_remaining === 0 && (
          <div className="-mt-6 mb-8 space-y-2">
            <button
              onClick={handleSparkPack}
              disabled={creditPackMutation.isPending}
              className="btn-luxury btn-gold w-full text-center block disabled:opacity-60"
            >
              {creditPackMutation.isPending ? "Opening..." : "3 more looks — $5"}
            </button>
            <button
              onClick={handleMembershipMonthly}
              disabled={subscriptionCheckoutMutation.isPending}
              className="font-sans text-xs text-gold hover:text-charcoal transition-colors tracking-wide block w-full disabled:opacity-60 py-2"
            >
              {subscriptionCheckoutMutation.isPending ? "Opening..." : "Membership — $19 / month (25 looks)"}
            </button>
            <button
              onClick={handleMembershipAnnual}
              disabled={subscriptionCheckoutMutation.isPending}
              className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors tracking-wide block w-full disabled:opacity-60"
            >
              Annual plans (save up to 40%)
            </button>
          </div>
        )}

        {/* TEMPLATES - horizontal visual scroll */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="font-serif text-xl text-charcoal">Templates</p>
            <button
              onClick={() => navigate("/templates")}
              className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors min-h-[44px] flex items-center"
            >
              See all
            </button>
          </div>
          <div
            className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {TEMPLATE_CARDS.map((t) => (
              <button
                key={t.slug}
                onClick={() => {
                  if (profile?.lora_status !== "ready") {
                    toast.error(profile?.lora_status === "training" ? "Your model is still training. Check back soon." : "Upload your photos in Profile to unlock generation.");
                    return;
                  }
                  navigate(`/generate?template=${t.slug}`);
                }}
                className="flex-shrink-0 relative overflow-hidden active:scale-[0.97] transition-transform duration-150"
                style={{ width: "130px", height: "174px", borderRadius: "2px" }}
              >
                <img
                  src={t.image}
                  alt={t.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "center top" }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to bottom, transparent 45%, rgba(26,15,9,0.88) 100%)" }}
                />
                <p
                  className="absolute bottom-0 left-0 right-0 px-2 pb-2.5 font-serif text-cream leading-tight"
                  style={{ fontSize: "0.68rem" }}
                >
                  {t.title}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* REFERRAL - minimal */}
        <div className="mb-10 py-5 border-t border-b border-sand/40">
          <p className="font-serif text-xl text-charcoal mb-1">Invite a friend</p>
          <p className="font-sans font-light text-sm text-charcoal-soft mb-4">
            Both of you get 3 free generations.
          </p>
          {referralUrl ? (
            <button
              onClick={handleCopyReferral}
              className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors min-h-[44px] flex items-center"
            >
              {referralCopied ? "Link copied" : "Copy invite link"}
            </button>
          ) : (
            <div className="w-24 h-3 bg-sand/40 animate-pulse" />
          )}
          {referral && referral.completed > 0 && (
            <p className="font-sans text-xs text-charcoal-soft/60 mt-2">
              {referral.completed} {referral.completed === 1 ? "friend" : "friends"} joined
            </p>
          )}
        </div>

        {/* HISTORY GRID */}
        <div className="mb-5 flex items-baseline justify-between">
          <p className="font-serif text-xl text-charcoal">Your Creations</p>
          {totalGenerations > 0 && (
            <p className="font-sans text-xs text-charcoal-soft/60">{totalGenerations}</p>
          )}
        </div>

        {generationsQuery.isLoading && allGenerations.length === 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[9/16] bg-sand/40 animate-pulse" />
            ))}
          </div>
        ) : allGenerations.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl text-charcoal mb-2">Nothing yet.</p>
            <p className="font-sans font-light text-sm text-charcoal-soft mb-6">
              Your first generation will appear here.
            </p>
            {profile?.lora_status === "ready" ? (
              <button
                onClick={() => navigate("/generate")}
                className="btn-luxury px-8"
              >
                Create your first
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  disabled
                  className="btn-luxury px-8 opacity-30 cursor-not-allowed"
                >
                  Create your first
                </button>
                <p className="font-sans text-xs text-charcoal-soft/50">
                  {profile?.lora_status === "training"
                    ? "Your model is training. Check back soon."
                    : "Upload your photos to unlock generation."}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 3-column thumbnail grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {allGenerations.map((gen) => (
                <button
                  key={gen.id}
                  className="relative overflow-hidden bg-[#1a0f09] focus:outline-none group"
                  style={{ borderRadius: "2px" }}
                  onClick={() => setExpandedId(gen.id)}
                  aria-label={gen.selected_hook ?? "View creation"}
                >
                  <div className="aspect-[9/16]">
                    <img
                      src={gen.image_url}
                      alt={gen.selected_hook ?? "Generated content"}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-200"
                      loading="lazy"
                    />
                    {/* Subtle bottom scrim with hook text */}
                    <div
                      className="absolute inset-x-0 bottom-0 flex items-end pb-1.5 px-1"
                      style={{ height: "50%", background: "linear-gradient(to top, rgba(26,15,9,0.75) 0%, transparent 100%)" }}
                    >
                      {gen.selected_hook && (
                        <p
                          className="font-serif text-cream leading-tight text-center w-full"
                          style={{ fontSize: "clamp(0.5rem, 2vw, 0.65rem)", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                        >
                          {gen.selected_hook}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  disabled={generationsQuery.isFetching}
                  className="font-sans text-xs tracking-widest uppercase text-charcoal-soft border border-sand px-8 py-3 hover:border-charcoal/40 hover:text-charcoal transition-all duration-200 disabled:opacity-40 min-h-[44px]"
                >
                  {generationsQuery.isFetching ? "Loading..." : `Load more (${totalGenerations - allGenerations.length} remaining)`}
                </button>
              </div>
            )}

            {/* Full-screen detail modal */}
            {expandedId !== null && (() => {
              const gen = allGenerations.find((g) => g.id === expandedId);
              if (!gen) return null;
              const hooks = (() => { try { return JSON.parse(gen.hooks) as string[]; } catch { return []; } })();
              const isDownloading = downloadingId === gen.id;
              return (
                <div
                  className="fixed inset-0 z-50 flex flex-col"
                  style={{ background: "rgba(13,10,7,0.96)", animation: "slideUp 220ms cubic-bezier(0.23,1,0.32,1) both" }}
                >
                  <style>{`@keyframes slideUp { from { transform: translateY(6%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

                  {/* Close bar */}
                  <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3 shrink-0">
                    <button
                      onClick={() => setExpandedId(null)}
                      className="font-sans text-xs tracking-widest uppercase text-cream/50 hover:text-cream transition-colors min-h-[44px] pr-4"
                    >
                      Close
                    </button>
                    <span className="font-sans text-xs tracking-widest uppercase text-gold/60">
                      {gen.scene_category ? SCENE_LABELS[gen.scene_category as keyof typeof SCENE_LABELS] : ""}
                    </span>
                    <div className="w-16" />
                  </div>

                  {/* Image */}
                  <div className="flex-1 flex items-center justify-center px-6 min-h-0">
                    <div className="relative w-full max-w-xs" style={{ aspectRatio: "9/16" }}>
                      <img
                        src={gen.image_url}
                        alt={gen.selected_hook ?? "Generated content"}
                        className="w-full h-full object-cover"
                        style={{ borderRadius: "2px" }}
                      />
                      {/* Hook + MEETHA overlay */}
                      <div
                        className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-6 px-6"
                        style={{ height: "45%", background: "linear-gradient(to top, rgba(13,10,7,0.8) 0%, transparent 100%)", justifyContent: "flex-end" }}
                      >
                        {(gen.selected_hook ?? hooks[0]) && (
                          <p className="font-serif text-cream text-center leading-snug mb-2"
                            style={{ fontSize: "clamp(1rem, 4vw, 1.25rem)", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                          >
                            {gen.selected_hook ?? hooks[0]}
                          </p>
                        )}
                        <p className="font-sans text-cream/30 tracking-[0.2em] uppercase" style={{ fontSize: "7px" }}>M  E  E  T  H  A</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 px-6 pt-4 space-y-2" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 1rem))" }}>
                    <button
                      onClick={() => handleDownload(gen.id, gen.selected_hook)}
                      disabled={isDownloading}
                      className="w-full font-sans text-xs tracking-widest uppercase text-charcoal bg-cream py-4 hover:bg-cream/90 transition-colors active:scale-[0.98] disabled:opacity-50 min-h-[52px]"
                      style={{ borderRadius: "1px" }}
                    >
                      {isDownloading ? "Preparing…" : "Share Story Card"}
                    </button>

                    <button
                      onClick={() => handleShareStyleCard(gen.id, gen.selected_hook)}
                      disabled={sharingCardId === gen.id}
                      className="w-full font-sans text-xs tracking-widest uppercase text-cream/40 hover:text-cream/70 transition-colors py-2 min-h-[36px] disabled:opacity-40"
                    >
                      {sharingCardId === gen.id ? "Downloading…" : "Download Clean Image"}
                    </button>
                    <button
                      onClick={() => { setExpandedId(null); setConfirmDeleteId(gen.id); }}
                      disabled={deletingId === gen.id}
                      className="w-full font-sans text-[10px] tracking-widest uppercase text-cream/20 hover:text-cream/50 transition-colors py-1 min-h-[32px] disabled:opacity-30"
                    >
                      {deletingId === gen.id ? "Removing..." : "Remove"}
                    </button>

                    {/* Free retry button — only for free tier, first generation, retry not yet used */}
                    {credits?.tier === "free" && !credits?.free_retry_used && allGenerations[0]?.id === gen.id && (
                      <button
                        onClick={() => handleFreeRetry(gen.id)}
                        disabled={retryingId === gen.id}
                        className="w-full font-sans text-[10px] tracking-widest uppercase text-gold/40 hover:text-gold/70 transition-colors py-1 min-h-[32px] disabled:opacity-30 border-t border-cream/5 mt-1 pt-2"
                      >
                        {retryingId === gen.id ? "Restoring credit..." : "I didn't like this. Try again."}
                      </button>
                    )}
                    {/* Upgrade prompt if retry already used */}
                    {credits?.tier === "free" && credits?.free_retry_used && allGenerations[0]?.id === gen.id && (
                      <button
                        onClick={() => { setExpandedId(null); navigate("/profile"); }}
                        className="w-full font-sans text-[10px] tracking-widest uppercase text-gold/30 hover:text-gold/60 transition-colors py-1 min-h-[32px] border-t border-cream/5 mt-1 pt-2"
                      >
                        Upgrade for unlimited generations
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Confirm delete dialog */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent className="bg-cream border-sand">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif font-light text-charcoal">Remove this creation?</AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-charcoal-soft">
              It will be removed from your gallery. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-sans text-xs tracking-widest uppercase" onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-sans text-xs tracking-widest uppercase bg-charcoal text-cream hover:bg-charcoal/80"
              onClick={() => { if (confirmDeleteId !== null) handleDelete(confirmDeleteId); }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-sand/40 bg-cream/95 backdrop-blur-sm pb-safe z-10">
        <div className="flex items-center justify-around px-6 py-4">
          <button onClick={() => navigate("/dashboard")} className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
            <div className="w-1 h-1 rounded-full bg-charcoal" />
            <p className="font-sans text-xs tracking-widest uppercase text-charcoal">Home</p>
          </button>
          <button onClick={() => navigate("/generate")} className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
            <div className="w-1 h-1 rounded-full bg-sand-dark" />
            <p className="font-sans text-xs tracking-widest uppercase text-charcoal-soft">Create</p>
          </button>
          <button onClick={() => navigate("/templates")} className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
            <div className="w-1 h-1 rounded-full bg-sand-dark" />
            <p className="font-sans text-xs tracking-widest uppercase text-charcoal-soft">Templates</p>
          </button>
          <button onClick={() => navigate("/profile")} className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
            <div className="w-1 h-1 rounded-full bg-sand-dark" />
            <p className="font-sans text-xs tracking-widest uppercase text-charcoal-soft">Profile</p>
          </button>
        </div>
      </div>
    </div>
  );
}
