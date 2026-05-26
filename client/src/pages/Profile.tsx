import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
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

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState<"archetype" | "mood" | "voice" | null>(null);
  type VoiceTone = "casual" | "polished";
  type VoiceHumor = "funny" | "serious";
  type VoiceLength = "short" | "storytelling";
  const [pendingVoiceTone, setPendingVoiceTone] = useState<VoiceTone | null>(null);
  const [pendingVoiceHumor, setPendingVoiceHumor] = useState<VoiceHumor | null>(null);
  const [pendingVoiceLength, setPendingVoiceLength] = useState<VoiceLength | null>(null);
  const [pendingArchetype, setPendingArchetype] = useState<Archetype | null>(null);
  const [pendingMood, setPendingMood] = useState<Mood | null>(null);

  const profileQuery = trpc.profile.get.useQuery();
  const creditsQuery = trpc.credits.get.useQuery();
  const utils = trpc.useUtils();

  // LoRA portrait training state
  const [loraPhotos, setLoraPhotos] = useState<File[]>([]);
  const [loraPreviews, setLoraPreviews] = useState<string[]>([]);
  const [isSubmittingLora, setIsSubmittingLora] = useState(false);
  const [loraStatus, setLoraStatus] = useState<"training" | "ready" | "failed" | null>(null);
  const [showRetrainConfirm, setShowRetrainConfirm] = useState(false);
  const [loraConsent, setLoraConsent] = useState(false);
  const loraInputRef = useRef<HTMLInputElement>(null);
  const loraPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const retrainStatusQuery = trpc.profile.retrainStatus.useQuery();
  const createRetrainCheckout = trpc.profile.createRetrainCheckout.useMutation({
    onSuccess: ({ url }) => {
      window.open(url, "_blank");
      toast.success("Redirecting to checkout...");
    },
    onError: (err) => toast.error(err.message),
  });

  const setShareBadgeMutation = trpc.profile.setShareBadge.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Badge preference saved.");
    },
    onError: (err) => toast.error(err.message),
  });

  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setEditing(null);
      toast.success("Profile updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const profile = profileQuery.data;
  const credits = creditsQuery.data;

  // Sync LoRA status from profile on load
  useEffect(() => {
    if (profile?.lora_status) {
      setLoraStatus(profile.lora_status as "training" | "ready" | "failed" | null);
    }
  }, [profile?.lora_status]);

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
    if (!loraConsent) {
      toast.error("Please confirm the consent statement before training.");
      return;
    }
    if (loraPhotos.length < 10) {
      toast.error("Please upload at least 10 photos for best results.");
      return;
    }
    setIsSubmittingLora(true);
    try {
      const formData = new FormData();
      loraPhotos.forEach((f) => formData.append("photos", f));
      const res = await fetch("/api/lora/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setLoraStatus("training");
      setLoraPhotos([]);
      setLoraPreviews([]);
      toast.success("Your look is being learned. We'll email you when it's ready (~20 min).");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsSubmittingLora(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setPendingArchetype(profile.archetype as Archetype);
      setPendingMood(profile.mood as Mood);
      if (profile.voice_style) {
        const parts = profile.voice_style.split(", ");
        setPendingVoiceTone((parts.find((p) => p === "casual" || p === "polished") as VoiceTone) ?? null);
        setPendingVoiceHumor((parts.find((p) => p === "funny" || p === "serious") as VoiceHumor) ?? null);
        setPendingVoiceLength((parts.find((p) => p === "short" || p === "storytelling") as VoiceLength) ?? null);
      }
    }
  }, [profile]);

  const archetypes = Object.keys(ARCHETYPE_LABELS) as Archetype[];
  const moods = Object.keys(MOOD_LABELS) as Mood[];

  const handleSaveArchetype = () => {
    if (!pendingArchetype) return;
    upsertProfile.mutate({ archetype: pendingArchetype });
  };

  const handleSaveMood = () => {
    if (!pendingMood) return;
    upsertProfile.mutate({ mood: pendingMood });
  };

  const handleSaveVoice = () => {
    const voiceStyle = [pendingVoiceTone, pendingVoiceHumor, pendingVoiceLength].filter(Boolean).join(", ");
    upsertProfile.mutate({ voiceStyle: voiceStyle || null });
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

      <div className="flex-1 px-4 py-6 space-y-8">

        {/* ── Account ── */}
        <div>
          <p className="font-sans text-sm font-semibold text-charcoal mb-4">Account</p>
          <div className="p-4 border border-sand bg-warm-white/60 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Name</p>
              <p className="font-sans text-sm text-charcoal">{user?.name ?? "-"}</p>
            </div>
            <div className="w-full h-px bg-sand/60" />
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Email</p>
              <p className="font-sans text-sm text-charcoal">{user?.email ?? "-"}</p>
            </div>
            <div className="w-full h-px bg-sand/60" />
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Plan</p>
              <p className="font-sans text-sm text-charcoal capitalize">{credits?.tier ?? "Free"}</p>
            </div>
            <div className="w-full h-px bg-sand/60" />
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Credits</p>
              <p className="font-sans text-sm text-charcoal">{credits?.credits_remaining ?? "-"} remaining</p>
            </div>
            {/* Meetha badge toggle - Starter/Pro only */}
            {credits && credits.tier !== "free" && (
              <>
                <div className="w-full h-px bg-sand/60" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-sans text-xs text-charcoal-soft">Share with Meetha badge</p>
                    <p className="font-sans text-xs text-charcoal-soft/60 mt-0.5">Adds a subtle "meetha" mark to your downloads</p>
                  </div>
                  <button
                    onClick={() => setShareBadgeMutation.mutate({ enabled: !(profile?.share_badge_enabled ?? false) })}
                    disabled={setShareBadgeMutation.isPending}
                    className={`relative w-10 h-5 rounded-full transition-all duration-200 ${profile?.share_badge_enabled ? "bg-gold" : "bg-sand"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${profile?.share_badge_enabled ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              </>
            )}
            {credits?.tier === "free" && (
              <>
                <div className="w-full h-px bg-sand/60" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-sans text-xs text-charcoal-soft">Meetha badge on downloads</p>
                    <p className="font-sans text-xs text-charcoal-soft/60 mt-0.5">Upgrade to remove</p>
                  </div>
                  <span className="font-sans text-xs text-charcoal-soft/60 border border-sand px-2 py-0.5">Always on</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Frequency (Archetype) ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-sm font-semibold text-charcoal">Your Frequency</p>
            <button
              onClick={() => setEditing(editing === "archetype" ? null : "archetype")}
              className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors"
            >
              {editing === "archetype" ? "Cancel" : "Edit"}
            </button>
          </div>

          {editing !== "archetype" ? (
            <div className="p-4 border border-sand bg-warm-white/60">
              <p className="font-sans text-xs text-gold mb-1">
                {profile?.archetype
                  ? ARCHETYPE_DESCRIPTIONS[profile.archetype as Archetype].split(".")[0] + "."
                  : "Not set"}
              </p>
              <p className="font-serif text-xl text-charcoal">
                {profile?.archetype ? ARCHETYPE_LABELS[profile.archetype as Archetype] : "Not set"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {archetypes.map((a) => (
                <button
                  key={a}
                  onClick={() => setPendingArchetype(a)}
                  className={`w-full text-left p-4 border transition-all duration-200 ${
                    pendingArchetype === a
                      ? "border-charcoal bg-charcoal text-cream"
                      : "border-sand bg-warm-white/60 text-charcoal hover:border-charcoal/40"
                  }`}
                >
                  <p className={`font-serif text-base ${pendingArchetype === a ? "text-cream" : "text-charcoal"}`}>
                    {ARCHETYPE_LABELS[a]}
                  </p>
                  <p className={`font-sans font-light text-xs mt-1 ${pendingArchetype === a ? "text-cream/70" : "text-charcoal-soft"}`}>
                    {ARCHETYPE_DESCRIPTIONS[a]}
                  </p>
                </button>
              ))}
              <button onClick={handleSaveArchetype} disabled={upsertProfile.isPending} className="btn-luxury w-full mt-2">
                Save
              </button>
            </div>
          )}
        </div>

        {/* ── Energy (Mood) ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-sm font-semibold text-charcoal">Your Energy</p>
            <button
              onClick={() => setEditing(editing === "mood" ? null : "mood")}
              className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors"
            >
              {editing === "mood" ? "Cancel" : "Edit"}
            </button>
          </div>

          {editing !== "mood" ? (
            <div className="p-4 border border-sand bg-warm-white/60">
              <p className="font-sans text-xs text-gold mb-1">
                {profile?.mood ? MOOD_DESCRIPTIONS[profile.mood as Mood].split(".")[0] + "." : "Not set"}
              </p>
              <p className="font-serif text-xl text-charcoal">
                {profile?.mood ? MOOD_LABELS[profile.mood as Mood] : "Not set"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {moods.map((m) => (
                <button
                  key={m}
                  onClick={() => setPendingMood(m)}
                  className={`w-full text-left p-4 border transition-all duration-200 ${
                    pendingMood === m
                      ? "border-charcoal bg-charcoal text-cream"
                      : "border-sand bg-warm-white/60 text-charcoal hover:border-charcoal/40"
                  }`}
                >
                  <p className={`font-serif text-base ${pendingMood === m ? "text-cream" : "text-charcoal"}`}>
                    {MOOD_LABELS[m]}
                  </p>
                  <p className={`font-sans font-light text-xs mt-1 ${pendingMood === m ? "text-cream/70" : "text-charcoal-soft"}`}>
                    {MOOD_DESCRIPTIONS[m]}
                  </p>
                </button>
              ))}
              <button onClick={handleSaveMood} disabled={upsertProfile.isPending} className="btn-luxury w-full mt-2">
                Save
              </button>
            </div>
          )}
        </div>

        {/* ── Make Images Look Like You (LoRA) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-sans text-sm font-semibold text-charcoal">Make Images Look Like You</p>
            {loraStatus === "ready" && <span className="font-sans text-xs text-gold">Active ✓</span>}
            {loraStatus === "training" && <span className="font-sans text-xs text-charcoal-soft animate-pulse">Training...</span>}
          </div>
          <p className="font-sans text-xs text-charcoal-soft mb-4 leading-relaxed">
            Upload 10–20 solo selfies. Meetha trains a personal AI model on your face so every image it creates actually looks like you, in any scene, any outfit.
          </p>

          <div className="p-4 border border-sand bg-warm-white/60 space-y-4">
            {loraStatus === "ready" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                  <p className="font-sans text-sm text-charcoal">Your personal look is active.</p>
                </div>
                <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                  Every image you generate now looks like you. Training a new look will replace the current one.
                </p>
{/* Retrain section - free first retrain, $19 for subsequent */}
                {retrainStatusQuery.data?.hasUnusedPurchase ? (
                  // Has a paid retrain credit - show the confirm flow
                  showRetrainConfirm ? (
                    <div className="border border-sand/60 p-3 space-y-3 bg-warm-white/80">
                      <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                        This will replace your current look. Upload new photos and wait about 20 minutes for training.
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
                  // No unused retrain credit - show $19 paywall
                  <div className="border border-sand/60 p-3 space-y-3 bg-warm-white/80">
                    <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                      Your first training is included. Retraining with new photos, for example after a haircut, new style, or seasonal change, is a one-time $19 add-on.
                    </p>
                    <button
                      onClick={() => createRetrainCheckout.mutate({ origin: window.location.origin })}
                      disabled={createRetrainCheckout.isPending}
                      className="font-sans text-xs tracking-widest uppercase text-charcoal border border-charcoal/30 px-4 py-2 hover:bg-charcoal/5 transition-colors disabled:opacity-50 min-h-[40px]"
                    >
                      {createRetrainCheckout.isPending ? "Loading..." : "Retrain ($19)"}
                    </button>
                  </div>
                )}
              </>
            ) : loraStatus === "training" ? (
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 border border-gold border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-serif text-sm text-charcoal">Your look is being learned.</p>
                  <p className="font-sans text-xs text-charcoal-soft mt-1 leading-relaxed">
                    About 20 minutes. We'll email you when it's ready. You can close this page.
                  </p>
                </div>
              </div>
            ) : loraStatus === "failed" ? (
              <>
                <p className="font-sans text-sm text-red-500">Training failed.</p>
                <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                  Try again with clearer, well-lit solo photos. No group shots, no sunglasses.
                </p>
                <button
                  onClick={() => setLoraStatus(null)}
                  className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors"
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                {/* What works best */}
                <div className="space-y-1.5">
                  {[
                    "Solo photos only. No group shots",
                    "Face clearly visible. No sunglasses, hats, or heavy filters",
                    "Good lighting. Natural or well-lit indoor shots",
                    "Variety. Different angles, outfits, and settings",
                  ].map((tip) => (
                    <div key={tip} className="flex items-start gap-2">
                      <span className="text-gold text-xs mt-0.5 flex-shrink-0">✓</span>
                      <p className="font-sans text-xs text-charcoal-soft leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>

                {/* Consent checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative flex-shrink-0 mt-0.5">
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
                    I confirm that I am 18 or older, I own or have the right to use all photos I am uploading, all people depicted are adults who have consented to this use, and I agree to Meetha processing these photos to train a personal AI model solely for my use. I can delete my model anytime.
                  </p>
                </label>

                {/* Photo grid */}
                <div className="grid grid-cols-4 gap-2">
                  {loraPreviews.map((src, i) => (
                    <div key={i} className="aspect-square relative overflow-hidden border border-sand">
                      <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setLoraPhotos((prev) => prev.filter((_, idx) => idx !== i));
                          setLoraPreviews((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-charcoal/80 text-cream rounded-full text-xs flex items-center justify-center hover:bg-charcoal transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {loraPreviews.length < 20 && (
                    <button
                      onClick={() => loraInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-sand bg-warm-white/40 hover:bg-warm-white hover:border-gold/60 transition-all duration-200 flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-gold text-2xl leading-none">+</span>
                      <span className="font-sans text-[10px] text-charcoal-soft text-center leading-tight">Add photo</span>
                    </button>
                  )}
                </div>

                <input
                  ref={loraInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleLoraPhotoSelect}
                />

                {loraPreviews.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="font-sans text-xs text-charcoal-soft">
                      {loraPreviews.length} photo{loraPreviews.length !== 1 ? "s" : ""} added
                    </p>
                    {loraPreviews.length < 10 ? (
                      <p className="font-sans text-xs text-gold">Add {10 - loraPreviews.length} more to train</p>
                    ) : (
                      <p className="font-sans text-xs text-charcoal-soft">✓ Ready to train</p>
                    )}
                  </div>
                )}

                {loraPreviews.length >= 10 && (
                  <button
                    onClick={handleSubmitLoraTraining}
                    disabled={isSubmittingLora}
                    className="btn-luxury w-full"
                  >
                    {isSubmittingLora ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                        Uploading photos...
                      </span>
                    ) : (
                      "Train my look"
                    )}
                  </button>
                )}
                {loraPreviews.length > 0 && loraPreviews.length < 10 && (
                  <button
                    onClick={() => loraInputRef.current?.click()}
                    className="btn-luxury w-full opacity-70"
                  >
                    Add more photos ({loraPreviews.length}/10 minimum)
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Caption Voice ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-sm font-semibold text-charcoal">Caption Voice</p>
            <button
              onClick={() => setEditing(editing === "voice" ? null : "voice")}
              className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors"
            >
              {editing === "voice" ? "Cancel" : "Edit"}
            </button>
          </div>

          {editing !== "voice" ? (
            <div className="p-4 border border-sand bg-warm-white/60">
              {profile?.voice_style ? (
                <>
                  <p className="font-sans text-xs text-gold mb-1">Set</p>
                  <p className="font-serif text-sm text-charcoal capitalize">
                    {profile.voice_style.replace(/,/g, " ·")}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-sans text-sm text-charcoal mb-1">Not set</p>
                  <p className="font-sans font-light text-xs text-charcoal-soft/70 leading-relaxed">
                    Tell Meetha how you write online and every caption will sound like you.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-4 border border-sand bg-warm-white/60">
              {/* Tone */}
              <div>
                <p className="font-sans text-xs font-semibold text-charcoal mb-2">Your tone</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["casual", "polished"] as VoiceTone[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPendingVoiceTone(pendingVoiceTone === opt ? null : opt)}
                      className={`text-left px-3 py-3 border transition-all duration-200 ${
                        pendingVoiceTone === opt ? "border-gold bg-gold/5" : "border-sand bg-warm-white/60 hover:border-gold/40"
                      }`}
                    >
                      <p className="font-sans text-sm text-charcoal capitalize">{opt}</p>
                      <p className="font-sans text-xs text-charcoal-soft mt-0.5">
                        {opt === "casual" ? "Like texting a friend" : "Elevated, editorial"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {/* Energy */}
              <div>
                <p className="font-sans text-xs font-semibold text-charcoal mb-2">Your energy</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["funny", "serious"] as VoiceHumor[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPendingVoiceHumor(pendingVoiceHumor === opt ? null : opt)}
                      className={`text-left px-3 py-3 border transition-all duration-200 ${
                        pendingVoiceHumor === opt ? "border-gold bg-gold/5" : "border-sand bg-warm-white/60 hover:border-gold/40"
                      }`}
                    >
                      <p className="font-sans text-sm text-charcoal capitalize">{opt}</p>
                      <p className="font-sans text-xs text-charcoal-soft mt-0.5">
                        {opt === "funny" ? "Wit, irony, a raised eyebrow" : "Direct, full presence"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {/* Length */}
              <div>
                <p className="font-sans text-xs font-semibold text-charcoal mb-2">Your captions</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["short", "storytelling"] as VoiceLength[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPendingVoiceLength(pendingVoiceLength === opt ? null : opt)}
                      className={`text-left px-3 py-3 border transition-all duration-200 ${
                        pendingVoiceLength === opt ? "border-gold bg-gold/5" : "border-sand bg-warm-white/60 hover:border-gold/40"
                      }`}
                    >
                      <p className="font-sans text-sm text-charcoal capitalize">{opt}</p>
                      <p className="font-sans text-xs text-charcoal-soft mt-0.5">
                        {opt === "short" ? "One or two sentences. Done." : "A little context, a little arc"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSaveVoice} disabled={upsertProfile.isPending} className="btn-luxury w-full">
                {upsertProfile.isPending ? "Saving..." : "Save voice style"}
              </button>
            </div>
          )}
        </div>

        {/* ── Visual Transformation Card ── */}
        <TransformationCardSection />

        {/* ── Your Aesthetic Brief ── */}
        <AestheticBriefSection />

        {/* ── Upgrade ── */}
        {credits?.tier === "free" && (
          <UpgradeSection />
        )}

        {/* ── Sign out ── */}
        <div className="pt-2">
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-full py-4 font-sans text-sm font-semibold text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200"
          >
            Sign Out
          </button>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 pt-2 pb-2">
          <a href="/privacy" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">
            Privacy Policy
          </a>
          <span className="text-charcoal-soft/30 text-xs">&middot;</span>
          <a href="/terms" className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors">
            Terms of Service
          </a>
        </div>

        {/* Delete account */}
        <div className="pt-2 pb-8">
          <DeleteAccountButton onDeleted={() => { logout(); navigate("/"); }} />
        </div>
      </div>
    </div>
  );
}

function TransformationCardSection() {
  const profileQuery = trpc.profile.get.useQuery();
  const creditsQuery = trpc.credits.get.useQuery();
  const generationsQuery = trpc.generations.list.useQuery({ limit: 1, offset: 0 });
  const utils = trpc.useUtils();

  const profile = profileQuery.data;
  const credits = creditsQuery.data;
  const tier = credits?.tier ?? "free";
  const cardUrl = profile?.transformation_card_url;
  const firstGeneration = generationsQuery.data?.items?.[0];

  const cardRef = useRef<HTMLDivElement>(null);
  const generateCard = trpc.profile.generateTransformationCard.useMutation({
    onSuccess: (data) => {
      // Immediately update the cache with the returned URL so the card
      // appears without waiting for a full refetch (fixes stale-cache bug)
      if (data?.url) {
        utils.profile.get.setData(undefined, (prev) =>
          prev ? { ...prev, transformation_card_url: data.url } : prev
        );
      }
      // Also invalidate to sync any other profile fields
      utils.profile.get.invalidate().then(() => {
        setTimeout(() => {
          cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      });
      toast.success("Your Transformation Card is ready!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerate = () => {
    if (!firstGeneration) return;
    // Convert relative /manus-storage/ URL to absolute so z.string().url() validation passes
    const rawUrl = firstGeneration.image_url as string;
    const afterImageUrl = rawUrl.startsWith("http")
      ? rawUrl
      : `${window.location.origin}${rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl}`;
    generateCard.mutate({
      afterImageUrl,
      beforeImageUrl: null,
    });
  };

  const tierLabel = tier === "pro" ? "Pro" : tier === "starter" ? "Starter" : null;
  const threshold = tier === "pro" ? 1 : tier === "starter" ? 2 : null;
  const genCount = generationsQuery.data?.total ?? 0;
  const hasEnoughGens = threshold !== null && genCount >= threshold;

  return (
    <div ref={cardRef}>
      <p className="font-sans text-sm font-semibold text-charcoal mb-4">Your Visual Transformation Card</p>

      {tier === "free" ? (
        // Free tier: locked state with clear upgrade message
        <div className="border border-gold/40 bg-[#1A0F09] p-5 space-y-4">
          <div className="space-y-3">
            <p className="font-serif text-lg text-cream leading-snug">
              Get Styled on Meetha.
            </p>
            <p className="font-sans font-light text-sm text-cream/80 leading-relaxed">
              Upgrade and we'll create your personal <strong className="text-gold font-normal">Visual Transformation Card</strong> — a shareable image showing your before photo next to your AI-styled look, plus your exact color palette, style direction, makeup energy, and jewelry guide.
            </p>
            <p className="font-sans font-light text-xs text-cream/50 leading-relaxed">
              Think of it as your personal style bible. One card. Everything you need to shop, shoot, and show up.
            </p>
          </div>
          <div className="border border-gold/20 p-3 bg-black/20 space-y-1.5">
            <p className="font-sans text-xs font-semibold text-gold tracking-widest uppercase mb-2">What's inside your card:</p>
            {[
              "Your before photo + AI-styled after — side by side",
              "Your personal color palette (4 exact shades)",
              "Style direction: fabrics, silhouettes, textures",
              "Makeup energy: techniques and your signature look",
              "Jewelry direction: metals, weight, piece types",
              "Your energy: 4 words that define your presence",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-gold text-xs mt-0.5 flex-shrink-0">✦</span>
                <p className="font-sans text-xs text-cream/70">{item}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 pt-1">
            <p className="font-sans text-xs text-gold/80 tracking-widest uppercase">✦ Starter — unlocks after your 2nd generation</p>
            <p className="font-sans text-xs text-gold/80 tracking-widest uppercase">✦ Pro — unlocks after your very first generation</p>
          </div>
          <a href="/pricing" className="btn-luxury w-full text-center block">
            Get Styled on Meetha
          </a>
        </div>
      ) : cardUrl ? (
        // Card is ready
        <div className="space-y-3">
          <img
            src={cardUrl}
            alt="Your Visual Transformation Card"
            className="w-full border border-sand/40"
          />
          <button
            onClick={async () => {
              if (!cardUrl) return;
              try {
                const res = await fetch(cardUrl);
                const blob = await res.blob();
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile && navigator.canShare) {
                  const file = new File([blob], "meetha-transformation-card.jpg", { type: "image/jpeg" });
                  if (navigator.canShare({ files: [file] })) {
                    try { await navigator.share({ files: [file], title: "My Visual Transformation Card" }); return; }
                    catch (e: unknown) { if (e instanceof Error && e.name === "AbortError") return; }
                  }
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "meetha-transformation-card.jpg";
                document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);
              } catch { toast.error("Could not save card. Please try again."); }
            }}
            className="btn-luxury w-full"
          >
            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "Save & Share Card" : "Download Card"}
          </button>
          <p className="font-sans text-xs text-charcoal-soft/50 text-center leading-relaxed">
            Share this card anywhere. It's yours.
          </p>
        </div>
      ) : !hasEnoughGens ? (
        // Paid but not enough generations yet
        <div className="border border-sand bg-warm-white/60 p-4 space-y-2">
          <p className="font-sans text-sm text-charcoal">
            {genCount === 0
              ? "Generate your first look to unlock your Transformation Card."
              : `Generate ${threshold! - genCount} more look${threshold! - genCount === 1 ? "" : "s"} to unlock your Transformation Card.`}
          </p>
          <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
            As a {tierLabel} member, your card unlocks after your {tier === "pro" ? "1st" : "2nd"} generation. It shows your before and after side by side with your complete style brief.
          </p>
          <div className="w-full bg-sand/30 h-1 rounded-full">
            <div
              className="bg-gold h-1 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (genCount / (threshold ?? 1)) * 100)}%` }}
            />
          </div>
          <p className="font-sans text-xs text-charcoal-soft/50">{genCount} of {threshold} generation{threshold === 1 ? "" : "s"} complete</p>
        </div>
      ) : generateCard.isPending ? (
        // Generating
        <div className="border border-sand bg-warm-white/60 p-6 flex items-center gap-4">
          <span className="w-5 h-5 border border-gold border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="font-serif text-sm text-charcoal">Creating your card…</p>
            <p className="font-sans text-xs text-charcoal-soft mt-0.5">This takes about 30 seconds.</p>
          </div>
        </div>
      ) : (
        // Ready to generate
        <div className="border border-gold/30 bg-warm-white/60 p-5 space-y-3">
          <p className="font-serif text-base text-charcoal">Your card is ready to generate.</p>
          <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
            We’ll create a personalized before & after card with your complete style brief: color palette, style direction, makeup energy, jewelry guide, and your energy keywords.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generateCard.isPending}
            className="btn-luxury btn-gold w-full"
          >
            Generate My Transformation Card
          </button>
        </div>
      )}
    </div>
  );
}

function AestheticBriefSection() {
  const briefQuery = trpc.profile.getAestheticBrief.useQuery();
  const brief = briefQuery.data;

  if (!brief) {
    return (
      <div>
        <p className="font-sans text-sm font-semibold text-charcoal mb-4">Your Styling Brief</p>
        <div className="p-4 border border-sand bg-warm-white/60">
          <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
            Generate your first image to unlock your personal styling brief: your color palette, metals, fabrics, makeup direction, and lighting guide.
          </p>
        </div>
      </div>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: "Palette", value: brief.palette },
    { label: "Metals", value: brief.metals },
    { label: "Fabrics", value: brief.fabrics },
    { label: "Makeup", value: brief.makeup },
    { label: "Lighting", value: brief.lighting },
    { label: "Hair", value: brief.hair },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-sans text-sm font-semibold text-charcoal">Your Styling Brief</p>
        {brief.generatedAt && (
          <p className="font-sans text-xs text-charcoal-soft/50">
            {new Date(brief.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        )}
      </div>
      <div className="border border-sand bg-warm-white/60 divide-y divide-sand/60">
        {rows.map((row) => (
          <div key={row.label} className="px-4 py-3">
            <p className="font-sans text-xs text-gold tracking-widest uppercase mb-1">{row.label}</p>
            <p className="font-sans text-sm text-charcoal leading-relaxed">{row.value}</p>
          </div>
        ))}
      </div>
      <p className="font-sans text-xs text-charcoal-soft/50 mt-2 leading-relaxed">
        Updates automatically with each generation. Use this as your shopping brief, shoot brief, and styling reference.
      </p>
    </div>
  );
}

function UpgradeSection() {
  const [annual, setAnnual] = useState(false);

  const starterLink = annual
    ? import.meta.env.VITE_STRIPE_STARTER_ANNUAL_LINK
    : import.meta.env.VITE_STRIPE_STARTER_LINK;
  const proLink = annual
    ? import.meta.env.VITE_STRIPE_PRO_ANNUAL_LINK
    : import.meta.env.VITE_STRIPE_PRO_LINK;

  return (
    <div className="p-5 border border-gold/30 bg-warm-white/60">
      <p className="font-sans text-sm font-semibold text-charcoal mb-1">Upgrade</p>
      <p className="font-sans font-light text-xs text-charcoal-soft mb-4">
        Starter: 10 generations per month. Pro: 25 generations per month.
      </p>

      {/* Billing toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setAnnual(false)}
          className={`font-sans text-xs tracking-[0.12em] uppercase transition-colors ${
            !annual ? "text-charcoal" : "text-charcoal-soft/40"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setAnnual(!annual)}
          className="relative w-9 h-4 flex-shrink-0"
          aria-label="Toggle billing period"
        >
          <span
            className="absolute inset-0 border transition-colors"
            style={{ borderColor: annual ? "oklch(78% 0.09 75)" : "oklch(60% 0.01 80 / 0.3)" }}
          />
          <span
            className="absolute top-0.5 w-3 h-3 transition-all duration-200"
            style={{
              left: annual ? "calc(100% - 0.875rem)" : "0.125rem",
              background: annual ? "oklch(78% 0.09 75)" : "oklch(60% 0.01 80 / 0.4)",
            }}
          />
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={`font-sans text-xs tracking-[0.12em] uppercase transition-colors ${
            annual ? "text-charcoal" : "text-charcoal-soft/40"
          }`}
        >
          Annual
        </button>
        {annual && (
          <span className="font-sans text-xs text-gold/70 tracking-wide">Save up to 40%</span>
        )}
      </div>

      <div className="space-y-2">
        <a
          href={starterLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-luxury btn-gold w-full text-center block"
        >
          {annual ? "Starter ($152 / year)" : "Starter ($19 / month)"}
        </a>
        <a
          href={proLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-luxury btn-luxury-outline w-full text-center block"
        >
          {annual ? "Pro ($252 / year)" : "Pro ($35 / month)"}
        </a>
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
      <button
        onClick={() => setConfirming(true)}
        className="w-full font-sans text-xs text-charcoal-soft/40 hover:text-red-400 transition-colors py-1"
      >
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
