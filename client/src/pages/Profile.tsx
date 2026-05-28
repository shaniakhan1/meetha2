import { useState, useEffect, useRef } from "react";
import { saveOrShare, saveOrShareBlob } from "@/lib/saveOrShare";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const SILHOUETTE_OPTIONS: { value: "slim" | "athletic" | "curvy"; label: string; sub: string }[] = [
    { value: "slim", label: "Slim", sub: "Elongated, fashion-forward cuts with clean lines" },
    { value: "athletic", label: "Athletic", sub: "Strong, structured tailoring with confident proportions" },
    { value: "curvy", label: "Curvy", sub: "Elegant silhouette with soft waist emphasis and luxury proportions" },
  ];

  const [editingBody, setEditingBody] = useState(false);
  const [pendingBodyPref, setPendingBodyPref] = useState<"slim" | "athletic" | "curvy" | null>(null);

  // LoRA state
  const [loraPhotos, setLoraPhotos] = useState<File[]>([]);
  const [loraPreviews, setLoraPreviews] = useState<string[]>([]);
  const [isSubmittingLora, setIsSubmittingLora] = useState(false);
  const [loraStatus, setLoraStatus] = useState<"training" | "ready" | "failed" | null>(null);
  const [showRetrainConfirm, setShowRetrainConfirm] = useState(false);
  const [loraConsent, setLoraConsent] = useState(false);
  const loraInputRef = useRef<HTMLInputElement>(null);
  const loraPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive training status from server first, fall back to local state
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    // Poll every 15s while training so the UI auto-transitions when ready
    refetchInterval: (query) => {
      const status = query.state.data?.lora_status;
      return status === "training" ? 15000 : false;
    },
  });
  const creditsQuery = trpc.credits.get.useQuery();
  const briefQuery = trpc.profile.getAestheticBrief.useQuery();
  const retrainStatusQuery = trpc.profile.retrainStatus.useQuery();
  const utils = trpc.useUtils();

  const profile = profileQuery.data;
  const credits = creditsQuery.data;
  const brief = briefQuery.data;

  const MEMBERSHIP_MONTHLY_PRICE = "price_1TafvrPMV5P3vLteuAss2HQB";
  const isFree = !credits || credits.tier === "free";
  const generationsUsed = credits ? (credits.total_used ?? 0) : 0;
  const generationsAllowed = isFree ? 1 : 25;

  // Sync LoRA status from profile — server is source of truth.
  // KEY RULE: uploaded_photo_count > 0 is a permanent signal.
  // Once photos are uploaded, we NEVER show the upload UI again.
  // If lora_status is null but uploaded_photo_count > 0, treat as 'training' (server is catching up).
  useEffect(() => {
    if (profileQuery.data !== undefined) {
      const serverStatus = (profileQuery.data?.lora_status as "training" | "ready" | "failed" | null) ?? null;
      const photoCount = profileQuery.data?.uploaded_photo_count ?? 0;
      setLoraStatus((prev) => {
        // If photos were uploaded but status is null, keep as training (permanent fallback)
        if (photoCount > 0 && serverStatus === null) return "training";
        // If local state says training but server says null, keep local (server may be slightly behind)
        if (prev === "training" && serverStatus === null) return prev;
        return serverStatus;
      });
    }
  }, [profileQuery.data?.lora_status, profileQuery.data?.uploaded_photo_count, profileQuery.data]);

  // Sync silhouette from profile
  useEffect(() => {
    if (profile?.body_type && ["slim", "athletic", "curvy"].includes(profile.body_type)) {
      setPendingBodyPref(profile.body_type as "slim" | "athletic" | "curvy");
    }
  }, [profile]);

  // Poll for LoRA training completion
  useEffect(() => {
    if (loraStatus === "training") {
      loraPollingRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/lora/status", { credentials: "include" });
          const data = await res.json();
          if (data.status === "ready") {
            setLoraStatus("ready");
            profileQuery.refetch();
            toast.success("Your look is ready. Every generation now looks like you.");
            if (loraPollingRef.current) clearInterval(loraPollingRef.current);
          } else if (data.status === "failed") {
            setLoraStatus("failed");
            toast.error("Training failed. Please try again with clearer photos.");
            if (loraPollingRef.current) clearInterval(loraPollingRef.current);
          }
        } catch (e) {
          console.warn("[LoRA poll]", e);
        }
      }, 15000);
    }
    return () => {
      if (loraPollingRef.current) clearInterval(loraPollingRef.current);
    };
  }, [loraStatus]);

  const handleLoraPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    const valid = incoming.filter(
      (f) => f.type.startsWith("image/") || /\.(heic|heif|jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name)
    );
    if (valid.length < incoming.length) {
      const skipped = incoming.length - valid.length;
      toast.error(`${skipped} photo${skipped > 1 ? "s" : ""} could not be added. Try saving them as JPG from your Photos app first.`, { duration: 6000 });
    }
    const newFiles = [...loraPhotos, ...valid].slice(0, 20);
    setLoraPhotos(newFiles);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLoraPreviews((prev) => [...prev, ev.target?.result as string].slice(0, 20));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleSubmitLoraTraining = async () => {
    if (!loraConsent) { toast.error("Please confirm the consent statement before training."); return; }
    if (loraPhotos.length < 10) { toast.error("Please upload at least 10 photos for best results."); return; }
    setIsSubmittingLora(true);
    try {
      const formData = new FormData();
      loraPhotos.forEach((f) => formData.append("photos", f));
      const res = await fetch("/api/lora/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setLoraStatus("training");
      setLoraPhotos([]);
      setLoraPreviews([]);
      // Invalidate profile so server lora_status is refreshed immediately
      utils.profile.get.invalidate();
      toast.success("Your look is being learned. We'll email you when it's ready (~20 min).");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsSubmittingLora(false);
    }
  };

  const [isRegeneratingBrief, setIsRegeneratingBrief] = useState(false);

  const regenerateBriefMutation = trpc.generations.aestheticRead.useMutation({
    onSuccess: () => {
      // Brief and card are regenerated server-side — invalidate both queries
      utils.profile.getAestheticBrief.invalidate();
      utils.profile.get.invalidate();
      toast.success("Your Identity Brief is being updated. Refresh in a moment.");
      setIsRegeneratingBrief(false);
    },
    onError: () => {
      toast.error("Could not regenerate brief. Please try again.");
      setIsRegeneratingBrief(false);
    },
  });

  const handleRegenerateBrief = () => {
    if (!profile) return;
    setIsRegeneratingBrief(true);
    regenerateBriefMutation.mutate({
      archetype: (profile as any).archetype ?? "luxury_minimal",
      mood: (profile as any).mood ?? "soft",
      sceneCategory: undefined,
      aestheticDescriptors: (profile as any).aesthetic_descriptors ?? undefined,
      loraPhysicalDescriptors: (profile as any).lora_physical_descriptors ?? undefined,
    });
  };

  const setBodyTypeMutation = trpc.profile.setBodyType.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setEditingBody(false);
      toast.success("Body preference saved.");
    },
    onError: (err) => toast.error(err.message),
  });

  const createRetrainCheckout = trpc.profile.createRetrainCheckout.useMutation({
    onSuccess: ({ url }) => { window.open(url, "_blank"); toast.success("Redirecting to checkout..."); },
    onError: (err) => toast.error(err.message),
  });

  const createSubscriptionCheckout = trpc.profile.createSubscriptionCheckout.useMutation({
    onSuccess: ({ url }) => { window.open(url, "_blank"); toast.success("Redirecting to checkout..."); },
    onError: (err) => toast.error(err.message),
  });

  // Save/share style card
  const handleShareCard = async () => {
    try {
      await saveOrShareBlob('/api/download/style-card', 'meetha-style-card.jpg', 'My Meetha Style Card');
    } catch {
      toast.error("Could not save. Try downloading directly.");
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-sand/40">
        <button
          onClick={() => navigate("/dashboard")}
          className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors"
        >
          ← Back
        </button>
        <span className="font-serif text-lg tracking-widest text-charcoal">Profile</span>
        <div className="w-10" />
      </div>

      {/* Training banner */}
      {loraStatus === "training" && (
        <div className="px-4 pt-4">
          <div className="border border-gold/40 bg-gold/8 p-4 flex items-start gap-3">
            <span className="w-4 h-4 border border-gold border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-sans text-sm font-semibold text-charcoal">Your visual identity is being built.</p>
              <p className="font-sans text-xs text-charcoal-soft mt-1 leading-relaxed">
                About 20 minutes. We'll email you when it's ready. You can close this page and come back later.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-6 space-y-8">

        {/* ── 1. Membership ── */}
        <div>
          <p className="font-sans text-xs tracking-[0.18em] uppercase text-charcoal-soft/50 mb-4">Membership</p>
          <div className="p-4 border border-sand bg-warm-white/60 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Plan</p>
              <p className="font-sans text-sm text-charcoal capitalize">{isFree ? "Free" : "Membership"}</p>
            </div>
            <div className="w-full h-px bg-sand/60" />
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Generations</p>
              <p className="font-sans text-sm text-charcoal">{generationsUsed} / {generationsAllowed}</p>
            </div>
            {!isFree && (
              <>
                <div className="w-full h-px bg-sand/60" />
                <div className="flex items-center justify-between">
                  <p className="font-sans text-xs text-charcoal-soft">Credits remaining</p>
                  <p className="font-sans text-sm text-charcoal">{credits?.credits_remaining ?? 0}</p>
                </div>
              </>
            )}
          </div>
          {isFree && (
            <button
              onClick={() => createSubscriptionCheckout.mutate({ origin: window.location.origin, priceId: MEMBERSHIP_MONTHLY_PRICE })}
              disabled={createSubscriptionCheckout.isPending}
              className="btn-luxury btn-gold w-full mt-3"
            >
              {createSubscriptionCheckout.isPending ? "Loading..." : "Membership — $19 / month"}
            </button>
          )}
        </div>

        {/* ── 2. Your Visual Identity (style card) ── */}
        {profile?.transformation_card_url && (
          <div>
            <p className="font-sans text-xs tracking-[0.18em] uppercase text-charcoal-soft/50 mb-4">Your Visual Identity</p>
            <div className="max-w-sm border border-sand bg-warm-white/60 overflow-hidden">
              <img
                src={profile!.transformation_card_url!}
                alt="Your style card"
                className="w-full object-cover"
              />
              <div className="p-4 space-y-3">
                <p className="font-sans text-xs text-charcoal-soft">Saved to your profile.</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleShareCard}
                    className="flex-1 btn-luxury btn-gold text-sm"
                  >
                    Save & Share
                  </button>
                  {!isFree ? (
                    <button
                      onClick={() => navigate("/generate")}
                      className="flex-1 btn-luxury btn-luxury-outline text-sm"
                    >
                      Regenerate
                    </button>
                  ) : (
                    <button
                    onClick={() => createSubscriptionCheckout.mutate({ origin: window.location.origin, priceId: MEMBERSHIP_MONTHLY_PRICE })}
                    disabled={createSubscriptionCheckout.isPending}
                    className="flex-1 btn-luxury btn-luxury-outline text-sm opacity-60"
                    >
                      Regenerate ↑
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Identity Brief ── */}
        <div>
          <p className="font-sans text-xs tracking-[0.18em] uppercase text-charcoal-soft/50 mb-4">Identity Brief</p>

          {brief ? (
            /* Unlocked — show generated card image if available, else editorial text card */
            <div className="space-y-4">
              {profile?.identity_brief_card_url ? (
                /* Generated PNG card */
                <div className="max-w-sm space-y-3">
                  <img
                    src={profile.identity_brief_card_url}
                    alt="Your Identity Brief"
                    className="w-full rounded-none border border-sand/60"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        try {
                          // Use server-side endpoint to bypass /manus-storage/ proxy rate limit (429)
                          await saveOrShareBlob('/api/download/brief-card', 'meetha-identity-brief.png', 'My Meetha Identity Brief');
                        } catch { /* ignore */ }
                      }}
                      className="btn-luxury btn-gold flex-1"
                    >
                      Save &amp; Share
                    </button>
                    <button
                      onClick={handleRegenerateBrief}
                      disabled={isRegeneratingBrief}
                      className="btn-luxury btn-luxury-outline flex-1 disabled:opacity-50"
                    >
                      {isRegeneratingBrief ? "Updating..." : "Regenerate"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Fallback text card while image is being generated */
                <div className="border border-sand bg-warm-white/60 divide-y divide-sand/40">
                  {([  
                    { label: "Palette", value: brief.palette },
                    { label: "Metals", value: brief.metals },
                    { label: "Makeup", value: brief.makeup },
                    { label: "Fabrics", value: brief.fabrics },
                    { label: "Lighting", value: brief.lighting },
                    { label: "Presence", value: brief.hair },
                    (brief as Record<string, unknown>).shopping_notes
                      ? { label: "Shopping", value: (brief as Record<string, unknown>).shopping_notes as string }
                      : null,
                  ] as Array<{ label: string; value: string } | null>).filter((r): r is { label: string; value: string } => r !== null).map((row) => (
                    <div key={row.label} className="px-4 py-3">
                      <p className="font-sans text-[10px] tracking-[0.18em] uppercase text-gold/70 mb-1">{row.label}</p>
                      <p className="font-sans text-sm text-charcoal leading-relaxed">{row.value}</p>
                    </div>
                  ))}
                  <div className="px-4 py-3">
                    <p className="font-sans text-[10px] text-charcoal-soft/50">Your Identity Brief card is being generated...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Locked teaser */
            <div className="border border-sand bg-warm-white/60 p-6 text-center space-y-4">
              {/* Blurred preview rows */}
              <div className="space-y-2 mb-2 select-none pointer-events-none" aria-hidden>
                {["Palette", "Metals", "Makeup", "Fabrics", "Lighting", "Presence", "Shopping"].map((label) => (
                  <div key={label} className="flex gap-3 items-start opacity-30 blur-[3px]">
                    <p className="font-sans text-[10px] tracking-[0.18em] uppercase text-gold/70 w-16 shrink-0 pt-0.5">{label}</p>
                    <div className="flex-1 h-3 bg-charcoal-soft/20 rounded-sm mt-1" />
                  </div>
                ))}
              </div>
              <div className="border-t border-sand/60 pt-4">
                <p className="font-serif text-base text-charcoal mb-1">Your Identity Brief is waiting.</p>
                <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                  Unlocks after your second generation. Your stylist-grade aesthetic blueprint — palette, metals, makeup direction, fabrics, lighting, and presence — generated from your visual identity.
                </p>
                {isFree && (
                  <button
                  onClick={() => createSubscriptionCheckout.mutate({ origin: window.location.origin, priceId: MEMBERSHIP_MONTHLY_PRICE })}
                  disabled={createSubscriptionCheckout.isPending}
                  className="btn-luxury btn-gold w-full mt-4"
                  >
                    {createSubscriptionCheckout.isPending ? "Loading..." : "Unlock Membership"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Visual Identity Model ── */}
        <div>
          <p className="font-sans text-xs tracking-[0.18em] uppercase text-charcoal-soft/50 mb-4">Visual Identity Model</p>
          <div className="p-4 border border-sand bg-warm-white/60 space-y-4">
            {profileQuery.isLoading ? (
              /* Show skeleton while profile loads — never flash the upload form */
              <div className="space-y-3 animate-pulse">
                <div className="h-3 bg-sand/60 rounded w-1/3" />
                <div className="h-3 bg-sand/40 rounded w-2/3" />
                <div className="h-3 bg-sand/40 rounded w-1/2" />
              </div>
            ) : loraStatus === "ready" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                  <p className="font-sans text-sm text-charcoal">Active</p>
                </div>
                {retrainStatusQuery.data?.hasUnusedPurchase ? (
                  showRetrainConfirm ? (
                    <div className="border border-sand/60 p-3 space-y-3 bg-warm-white/80">
                      <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                        This will replace your current look. Upload new photos and wait about 20 minutes.
                      </p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => { setShowRetrainConfirm(false); setLoraStatus(null); setLoraPhotos([]); setLoraPreviews([]); }}
                          className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors"
                        >
                          Yes, retrain
                        </button>
                        <button
                          onClick={() => setShowRetrainConfirm(false)}
                          className="font-sans text-xs tracking-widest uppercase text-charcoal-soft/50 hover:text-charcoal-soft transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRetrainConfirm(true)}
                      className="font-sans text-xs tracking-widest uppercase text-charcoal-soft/50 hover:text-charcoal-soft transition-colors"
                    >
                      Retrain with new photos
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => createRetrainCheckout.mutate({ origin: window.location.origin })}
                    disabled={createRetrainCheckout.isPending}
                    className="font-sans text-xs tracking-widest uppercase text-charcoal border border-charcoal/30 px-4 py-2 hover:bg-charcoal/5 transition-colors disabled:opacity-50 min-h-[40px]"
                  >
                    {createRetrainCheckout.isPending ? "Loading..." : "Retrain ($19)"}
                  </button>
                )}
              </>
            ) : loraStatus === "training" ? (
              <div className="space-y-4">
                {/* Prominent training indicator */}
                <div
                  className="p-4 border border-gold/40"
                  style={{ background: "linear-gradient(135deg, rgba(139,105,20,0.12) 0%, rgba(139,105,20,0.05) 100%)" }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="relative flex-shrink-0">
                      <span className="absolute inset-0 rounded-full bg-gold/25 animate-ping" style={{ width: "16px", height: "16px" }} />
                      <span className="relative block w-4 h-4 border border-gold border-t-transparent rounded-full animate-spin" />
                    </span>
                    <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-gold">Training in progress</p>
                  </div>
                  <p className="font-serif text-base text-charcoal leading-snug mb-1">
                    Your Visual Identity is Training
                  </p>
                  <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                    Meetha is learning your face, proportions, coloring, and visual presence.
                    This usually takes 10 to 20 minutes.
                  </p>
                  {/* Animated shimmer bar */}
                  <div className="mt-3 w-full h-px bg-gold/20 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gold/60"
                      style={{ width: "40%", animation: "shimmerBar 2.5s ease-in-out infinite alternate" }}
                    />
                  </div>
                  <style>{`@keyframes shimmerBar { from { width: 15%; opacity: 0.5; } to { width: 75%; opacity: 1; } }`}</style>
                </div>
                <p className="font-sans text-xs text-charcoal-soft/60 leading-relaxed">
                  We will email you when your model is ready. You can close this page.
                </p>
              </div>
            ) : loraStatus === "failed" ? (
              <>
                <p className="font-sans text-sm text-red-500">Training failed.</p>
                <p className="font-sans text-xs text-charcoal-soft leading-relaxed">Try again with clearer, well-lit solo photos. No group shots, no sunglasses.</p>
                <button onClick={() => setLoraStatus(null)} className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors">Try again</button>
              </>
            ) : (profileQuery.data?.uploaded_photo_count ?? 0) > 0 ? (
              /* Locked: photos already submitted — never show upload form again */
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 opacity-60 pointer-events-none select-none">
                <div className="w-12 h-12 border border-sand rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-charcoal-soft" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-9v4l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">Photos submitted</p>
                <p className="font-sans text-xs text-charcoal-soft/60 leading-relaxed max-w-[200px]">Your Visual Identity Model is being trained. This section is locked.</p>
              </div>
            ) : (
              /* Upload form */
              <>
                <div className="space-y-1.5">
                  <div className="mb-3 p-3 border border-amber-200/60 bg-amber-50/40">
                    <p className="font-sans text-xs text-amber-800/80 leading-relaxed">
                      <strong>Important:</strong> Photos taken from a distance will not train your face correctly. Your face must fill at least 60% of the frame.
                    </p>
                  </div>
                  {[
                    "Close-up selfies only — your face fills most of the frame",
                    "10–15 photos minimum for accurate results",
                    "Face clearly visible from multiple angles: front, left, right, slightly above",
                    "Include 1–2 photos from the side or back showing your hair",
                    "No sunglasses, hats, heavy filters, or group shots",
                    "Good natural or indoor lighting — no harsh flash directly on face",
                  ].map((tip) => (
                    <div key={tip} className="flex items-start gap-2">
                      <span className="text-gold text-xs mt-0.5 flex-shrink-0">✓</span>
                      <p className="font-sans text-xs text-charcoal-soft leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input type="checkbox" checked={loraConsent} onChange={(e) => setLoraConsent(e.target.checked)} className="sr-only" />
                    <div className={`w-5 h-5 border-2 transition-all duration-200 flex items-center justify-center ${loraConsent ? "border-charcoal bg-charcoal" : "border-sand bg-warm-white"}`}>
                      {loraConsent && (
                        <svg className="w-3 h-3 text-cream" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                    I confirm that I am 18 or older, I own or have the right to use all photos I am uploading, all people depicted are adults who have consented to this use, and I agree to Meetha processing these photos to train a personal AI model solely for my use. I can delete my model anytime.
                  </p>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {loraPreviews.map((src, i) => (
                    <div key={i} className="aspect-square relative overflow-hidden border border-sand">
                      <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setLoraPhotos((prev) => prev.filter((_, idx) => idx !== i)); setLoraPreviews((prev) => prev.filter((_, idx) => idx !== i)); }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-charcoal/80 text-cream rounded-full text-xs flex items-center justify-center hover:bg-charcoal transition-colors"
                      >×</button>
                    </div>
                  ))}
                  {loraPreviews.length < 20 && (
                    <button onClick={() => loraInputRef.current?.click()} className="aspect-square border-2 border-dashed border-sand bg-warm-white/40 hover:bg-warm-white hover:border-gold/60 transition-all duration-200 flex flex-col items-center justify-center gap-1">
                      <span className="text-gold text-2xl leading-none">+</span>
                      <span className="font-sans text-[10px] text-charcoal-soft text-center leading-tight">Add photo</span>
                    </button>
                  )}
                </div>
                <input ref={loraInputRef} type="file" multiple className="hidden" onChange={handleLoraPhotoSelect} />
                {loraPreviews.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="font-sans text-xs text-charcoal-soft">{loraPreviews.length} photo{loraPreviews.length !== 1 ? "s" : ""} added</p>
                    {loraPreviews.length < 10 ? (
                      <p className="font-sans text-xs text-gold">Add {10 - loraPreviews.length} more to train</p>
                    ) : (
                      <p className="font-sans text-xs text-charcoal-soft">✓ Ready to train</p>
                    )}
                  </div>
                )}
                {loraPreviews.length >= 10 && (
                  <button onClick={handleSubmitLoraTraining} disabled={isSubmittingLora} className="btn-luxury w-full">
                    {isSubmittingLora ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />Uploading photos...</span> : "Train my look"}
                  </button>
                )}
                {loraPreviews.length > 0 && loraPreviews.length < 10 && (
                  <button onClick={() => loraInputRef.current?.click()} className="btn-luxury w-full opacity-70">
                    Add more photos ({loraPreviews.length}/10 minimum)
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── 5. Your Silhouette ── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="font-sans text-xs tracking-[0.18em] uppercase text-charcoal-soft/50">Your Silhouette</p>
            <button
              onClick={() => setEditingBody(!editingBody)}
              className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors"
            >
              {editingBody ? "Cancel" : "Update"}
            </button>
          </div>
          <p className="font-sans text-[11px] text-charcoal-soft/50 mb-4 leading-relaxed">
            Helps Meetha style cuts, tailoring, and proportions more accurately.
          </p>

          {!editingBody ? (
            <div className="p-4 border border-sand bg-warm-white/60">
              {pendingBodyPref ? (
                <>
                  <p className="font-serif text-sm text-charcoal">
                    {SILHOUETTE_OPTIONS.find((o) => o.value === pendingBodyPref)?.label ?? pendingBodyPref}
                  </p>
                  <p className="font-sans text-xs text-charcoal-soft mt-1">
                    {SILHOUETTE_OPTIONS.find((o) => o.value === pendingBodyPref)?.sub ?? ""}
                  </p>
                </>
              ) : (
                <p className="font-sans text-sm text-charcoal-soft">Not set &mdash; tap Update to choose</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {SILHOUETTE_OPTIONS.map(({ value, label, sub }) => (
                <button
                  key={value}
                  onClick={() => setPendingBodyPref(value)}
                  className={`w-full text-left p-4 border-2 transition-all duration-200 ${
                    pendingBodyPref === value
                      ? "border-gold bg-gold/10"
                      : "border-sand bg-warm-white/60 hover:border-gold/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-serif text-base text-charcoal">{label}</p>
                      <p className="font-sans font-light text-xs mt-0.5 text-charcoal-soft">{sub}</p>
                    </div>
                    {pendingBodyPref === value ? (
                      <div className="w-5 h-5 rounded-full border-2 border-gold bg-gold flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-cream" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-sand/60 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
              <button
                onClick={() => { if (pendingBodyPref) setBodyTypeMutation.mutate({ bodyType: pendingBodyPref }); }}
                disabled={setBodyTypeMutation.isPending || !pendingBodyPref}
                className="btn-luxury w-full mt-2"
              >
                {setBodyTypeMutation.isPending ? "Saving..." : "Save silhouette"}
              </button>
            </div>
          )}
        </div>

        {/* ── 6. Account ── */}
        <div>
          <p className="font-sans text-xs tracking-[0.18em] uppercase text-charcoal-soft/50 mb-4">Account</p>
          <div className="p-4 border border-sand bg-warm-white/60 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Email</p>
              <p className="font-sans text-sm text-charcoal">{user?.email ?? "-"}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-full py-4 font-sans text-sm font-semibold text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200 mt-3"
          >
            Sign Out
          </button>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 pt-2 pb-2">
          <a href="/privacy" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">Privacy Policy</a>
          <span className="text-charcoal-soft/30 text-xs">&middot;</span>
          <a href="/terms" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">Terms of Service</a>
          <span className="text-charcoal-soft/30 text-xs">&middot;</span>
          <a href="mailto:hello@frequencyplanner.com" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">Get Help</a>
        </div>

        {/* Delete account */}
        <div className="pt-2 pb-8">
          <DeleteAccountButton onDeleted={() => { logout(); navigate("/"); }} />
        </div>

      </div>
    </div>
  );
}

function DeleteAccountButton({ onDeleted }: { onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const deleteAccount = trpc.account.delete.useMutation({
    onSuccess: onDeleted,
    onError: (err) => toast.error(err.message),
  });

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="w-full font-sans text-xs text-charcoal-soft/40 hover:text-red-400 transition-colors py-1">
        Delete my account
      </button>
    );
  }

  return (
    <div className="border border-red-200 bg-red-50/40 p-4 space-y-3">
      <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
        This will permanently delete your account, all generated images, and all data. This cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => deleteAccount.mutate()}
          disabled={deleteAccount.isPending}
          className="flex-1 py-2 font-sans text-xs tracking-widest uppercase text-white bg-red-500 hover:bg-red-600 transition-colors"
        >
          {deleteAccount.isPending ? "Deleting..." : "Yes, delete everything"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 py-2 font-sans text-xs tracking-widest uppercase text-charcoal-soft border border-sand hover:border-charcoal/40 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
