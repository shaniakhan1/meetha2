import { useState, useEffect, useRef } from "react";
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

  const [calibrationImages, setCalibrationImages] = useState<string[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const calibrationInputRef = useRef<HTMLInputElement>(null);

  // LoRA portrait training state
  const [loraPhotos, setLoraPhotos] = useState<File[]>([]);
  const [loraPreviews, setLoraPreviews] = useState<string[]>([]);
  const [isSubmittingLora, setIsSubmittingLora] = useState(false);
  const [loraStatus, setLoraStatus] = useState<"training" | "ready" | "failed" | null>(null);
  const [showRetrainConfirm, setShowRetrainConfirm] = useState(false);
  const loraInputRef = useRef<HTMLInputElement>(null);
  const loraPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const generatePreview = trpc.aesthetic.preview.useMutation({
    onSuccess: (data) => {
      setPreviewUrl(data.url);
      utils.profile.get.invalidate();
      toast.success("Your aesthetic preview is ready.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true);
    try {
      await generatePreview.mutateAsync();
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const analyzeAesthetic = trpc.aesthetic.analyzeAndSave.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Aesthetic calibrated. Your next generation will reflect your world.");
      setCalibrationImages([]);
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

  const handleCalibrationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - calibrationImages.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setCalibrationImages((prev) => [...prev, dataUrl].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCalibrate = async () => {
    if (calibrationImages.length === 0) return;
    setIsCalibrating(true);
    try {
      await analyzeAesthetic.mutateAsync({ images: calibrationImages });
    } finally {
      setIsCalibrating(false);
    }
  };

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
          // Log transient network errors but don't surface them — polling will retry
          console.warn("[LoRA poll]", e);
        }
      }, 15000); // poll every 15 seconds
    }
    return () => {
      if (loraPollingRef.current) clearInterval(loraPollingRef.current);
    };
  }, [loraStatus]);

  const handleLoraPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 20 - loraPhotos.length);
    setLoraPhotos((prev) => [...prev, ...files].slice(0, 20));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLoraPreviews((prev) => [...prev, ev.target?.result as string].slice(0, 20));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmitLoraTraining = async () => {
    if (loraPhotos.length < 5) {
      toast.error("Please upload at least 5 photos for best results.");
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
      toast.success("Your look is being learned. We will email you when it is ready.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsSubmittingLora(false);
    }
  };

  // Sync preview URL from profile on load
  useEffect(() => {
    if (profile?.aesthetic_preview_url && !previewUrl) {
      setPreviewUrl(profile.aesthetic_preview_url);
    }
  }, [profile?.aesthetic_preview_url]);

  // Show saved calibration thumbnails from the server when no new images are staged
  const savedCalibrationUrls: string[] = (profile as any)?.reference_image_urls ?? [];

  useEffect(() => {
    if (profile) {
      setPendingArchetype(profile.archetype as Archetype);
      setPendingMood(profile.mood as Mood);
      // Parse voice_style back into individual selections
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
          Back
        </button>
        <span className="font-serif text-lg tracking-widest text-charcoal">Profile</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-4 py-5 space-y-6">
        {/* Account */}
        <div>
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-4">
            Account
          </p>
          <div className="p-4 border border-sand bg-warm-white/60 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Name</p>
              <p className="font-sans text-sm text-charcoal">{user?.name ?? "—"}</p>
            </div>
            <div className="w-full h-px bg-sand/60" />
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Email</p>
              <p className="font-sans text-sm text-charcoal">{user?.email ?? "—"}</p>
            </div>
            <div className="w-full h-px bg-sand/60" />
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Plan</p>
              <p className="font-sans text-sm text-charcoal capitalize">
                {credits?.tier ?? "Free"}
              </p>
            </div>
            <div className="w-full h-px bg-sand/60" />
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-charcoal-soft">Credits</p>
              <p className="font-sans text-sm text-charcoal">
                {credits?.credits_remaining ?? "—"} remaining
              </p>
            </div>
            {/* Meetha badge toggle — Starter/Pro only */}
            {credits && credits.tier !== "free" && (
              <>
                <div className="w-full h-px bg-sand/60" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-sans text-xs text-charcoal-soft">Share with Meetha badge</p>
                    <p className="font-sans text-xs text-charcoal-soft/60 mt-0.5">
                      Adds a subtle "meetha" mark to your downloads
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setShareBadgeMutation.mutate({ enabled: !(profile?.share_badge_enabled ?? false) })
                    }
                    disabled={setShareBadgeMutation.isPending}
                    className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                      profile?.share_badge_enabled
                        ? "bg-gold"
                        : "bg-sand"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                        profile?.share_badge_enabled ? "left-5" : "left-0.5"
                      }`}
                    />
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
                    <p className="font-sans text-xs text-charcoal-soft/60 mt-0.5">
                      Upgrade to remove
                    </p>
                  </div>
                  <span className="font-sans text-xs text-charcoal-soft/60 border border-sand px-2 py-0.5">
                    Always on
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Archetype */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
              Aesthetic Archetype
            </p>
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
                {profile?.archetype
                  ? ARCHETYPE_LABELS[profile.archetype as Archetype]
                  : "Not set"}
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
                  <p
                    className={`font-serif text-base ${
                      pendingArchetype === a ? "text-cream" : "text-charcoal"
                    }`}
                  >
                    {ARCHETYPE_LABELS[a]}
                  </p>
                  <p
                    className={`font-sans font-light text-xs mt-1 ${
                      pendingArchetype === a ? "text-cream/70" : "text-charcoal-soft"
                    }`}
                  >
                    {ARCHETYPE_DESCRIPTIONS[a]}
                  </p>
                </button>
              ))}
              <button
                onClick={handleSaveArchetype}
                disabled={upsertProfile.isPending}
                className="btn-luxury w-full mt-2"
              >
                Save Archetype
              </button>
            </div>
          )}
        </div>

        {/* Mood */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
              Creative Mood
            </p>
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
                {profile?.mood
                  ? MOOD_DESCRIPTIONS[profile.mood as Mood].split(".")[0] + "."
                  : "Not set"}
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
                  <p
                    className={`font-serif text-base ${
                      pendingMood === m ? "text-cream" : "text-charcoal"
                    }`}
                  >
                    {MOOD_LABELS[m]}
                  </p>
                  <p
                    className={`font-sans font-light text-xs mt-1 ${
                      pendingMood === m ? "text-cream/70" : "text-charcoal-soft"
                    }`}
                  >
                    {MOOD_DESCRIPTIONS[m]}
                  </p>
                </button>
              ))}
              <button
                onClick={handleSaveMood}
                disabled={upsertProfile.isPending}
                className="btn-luxury w-full mt-2"
              >
                Save Mood
              </button>
            </div>
          )}
        </div>

        {/* Aesthetic Preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
              Your Aesthetic Preview
            </p>
            {previewUrl && (
              <button
                onClick={handleGeneratePreview}
                disabled={isGeneratingPreview}
                className="font-sans text-xs tracking-widest uppercase text-gold hover:text-charcoal transition-colors"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="border border-sand bg-warm-white/60 overflow-hidden">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Your aesthetic preview"
                  className="w-full object-cover"
                  style={{ maxHeight: "320px", aspectRatio: "3/4", objectFit: "cover" }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-charcoal/60 to-transparent">
                  <p className="font-serif text-sm text-cream">
                    {profile?.archetype ? profile.archetype.replace(/_/g, " ") : "Your frequency"}
                  </p>
                  <p className="font-sans text-xs text-cream/70 mt-0.5">
                    {profile?.mood ? profile.mood.replace(/_/g, " ") : ""} energy
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                  See what Meetha generates for your frequency before you create. This preview uses your calibrated aesthetic, archetype, and mood.
                </p>
                <button
                  onClick={handleGeneratePreview}
                  disabled={isGeneratingPreview}
                  className="btn-luxury w-full"
                >
                  {isGeneratingPreview ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                      Generating your preview...
                    </span>
                  ) : (
                    "Generate my aesthetic preview"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Aesthetic Calibration */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
              Aesthetic Calibration
            </p>
            {profile?.aesthetic_descriptors && (
              <span className="font-sans text-xs text-gold">Calibrated</span>
            )}
          </div>

          <div className="p-4 border border-sand bg-warm-white/60 space-y-4">
            {profile?.aesthetic_descriptors ? (
              <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                Meetha has read your aesthetic. Every generation is calibrated to your specific colors, light, and warmth. Upload new photos below to recalibrate.
              </p>
            ) : (
              <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                Upload 3-5 images that feel like your world. Meetha reads your colors, light, warmth, and skin tone to personalize every generation to you specifically.
              </p>
            )}

            {/* Saved thumbnails from previous calibration */}
            {calibrationImages.length === 0 && savedCalibrationUrls.length > 0 && (
              <div className="space-y-2">
                <p className="font-sans text-xs text-gold">Calibration photos on file</p>
                <div className="grid grid-cols-4 gap-2">
                  {savedCalibrationUrls.map((url, i) => (
                    <div key={i} className="aspect-square overflow-hidden border border-sand/60">
                      <img src={url} alt={`Saved ref ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload grid */}
            <div className="grid grid-cols-4 gap-2">
              {calibrationImages.map((img, i) => (
                <div key={i} className="aspect-square relative overflow-hidden border border-sand">
                  <img src={img} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setCalibrationImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-charcoal/70 text-cream rounded-full text-xs flex items-center justify-center hover:bg-charcoal transition-colors"
                  >
                    x
                  </button>
                </div>
              ))}
              {calibrationImages.length < 5 && (
                <button
                  onClick={() => calibrationInputRef.current?.click()}
                  className="aspect-square border border-dashed border-sand bg-warm-white/40 hover:bg-warm-white hover:border-gold/50 transition-all duration-200 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-gold text-lg leading-none">+</span>
                  <span className="font-sans text-xs text-charcoal-soft">Add</span>
                </button>
              )}
            </div>

            <input
              ref={calibrationInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleCalibrationUpload}
            />

            {calibrationImages.length > 0 && (
              <button
                onClick={handleCalibrate}
                disabled={isCalibrating}
                className="btn-luxury w-full"
              >
                {isCalibrating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-cream border-t-transparent rounded-full animate-spin" />
                    Reading your aesthetic...
                  </span>
                ) : (
                  profile?.aesthetic_descriptors ? "Recalibrate" : "Calibrate my aesthetic"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Create My Look — LoRA Portrait Training */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
              Create My Look
            </p>
            {loraStatus === "ready" && (
              <span className="font-sans text-xs text-gold">Active</span>
            )}
            {loraStatus === "training" && (
              <span className="font-sans text-xs text-charcoal-soft animate-pulse">Training...</span>
            )}
          </div>

          <div className="p-4 border border-sand bg-warm-white/60 space-y-4">
            {loraStatus === "ready" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gold" />
                  <p className="font-sans text-xs text-charcoal-soft">
                    Your personal look is active. Every image you generate now looks like you.
                  </p>
                </div>
                {showRetrainConfirm ? (
                  <div className="border border-sand/60 p-3 space-y-3 bg-warm-white/80">
                    <p className="font-sans text-xs text-charcoal-soft leading-relaxed">
                      This will replace your current look. You will need to upload new photos and wait about 20 minutes for training.
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setShowRetrainConfirm(false);
                          setLoraStatus(null);
                          setLoraPhotos([]);
                          setLoraPreviews([]);
                        }}
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
                )}
              </>
            ) : loraStatus === "training" ? (
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 border border-gold border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-serif text-sm text-charcoal">
                    Your look is being learned.
                  </p>
                  <p className="font-sans text-xs text-charcoal-soft mt-1 leading-relaxed">
                    This happens once. Every generation after this will look like you, in any scene. We will email you when it is ready.
                  </p>
                  <p className="font-sans text-xs text-charcoal-soft/50 mt-1">
                    About 20 minutes. You can close this page.
                  </p>
                </div>
              </div>
            ) : loraStatus === "failed" ? (
              <>
                <p className="font-sans text-xs text-red-400">
                  Training failed. Try again with clearer, well-lit photos.
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
                <p className="font-sans font-light text-xs text-charcoal-soft leading-relaxed">
                  Upload 10-15 selfies and Meetha trains a personal AI model on your face. Every generation after that looks like a real photo of you, in any scene.
                </p>
                <div className="p-3 border border-gold/30 bg-gold/5 space-y-1.5">
                  <p className="font-sans text-xs font-medium text-charcoal">What works best:</p>
                  <ul className="font-sans text-xs text-charcoal-soft leading-relaxed space-y-1">
                    <li>Solo photos only. No group shots.</li>
                    <li>Face clearly visible. No sunglasses, hats, or heavy filters.</li>
                    <li>Good lighting. Natural light or well-lit indoor shots.</li>
                    <li>A variety of angles and settings for variety.</li>
                  </ul>
                  <p className="font-sans text-xs text-charcoal-soft/60 pt-0.5">Training takes about 20 minutes.</p>
                </div>

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
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-charcoal/70 text-cream rounded-full text-xs flex items-center justify-center hover:bg-charcoal transition-colors"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {loraPreviews.length < 20 && (
                    <button
                      onClick={() => loraInputRef.current?.click()}
                      className="aspect-square border border-dashed border-sand bg-warm-white/40 hover:bg-warm-white hover:border-gold/50 transition-all duration-200 flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-gold text-lg leading-none">+</span>
                      <span className="font-sans text-xs text-charcoal-soft">Add</span>
                    </button>
                  )}
                </div>

                <input
                  ref={loraInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleLoraPhotoSelect}
                />

                {loraPreviews.length > 0 && (
                  <p className="font-sans text-xs text-charcoal-soft/60">
                    {loraPreviews.length} photo{loraPreviews.length !== 1 ? "s" : ""} selected
                    {loraPreviews.length < 5 ? ` — add ${5 - loraPreviews.length} more for best results` : " — ready to train"}
                  </p>
                )}

                {loraPreviews.length >= 5 && (
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
                      "Create my look"
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Voice Style */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft">
              Caption Voice
            </p>
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
                  <p className="font-sans text-xs text-gold mb-1">Calibrated</p>
                  <p className="font-serif text-sm text-charcoal capitalize">
                    {profile.voice_style.replace(/,/g, " ·")}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-sans text-xs text-charcoal-soft mb-1">Not set</p>
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
                <p className="font-sans text-xs tracking-[0.12em] uppercase text-charcoal-soft mb-2">Your tone</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["casual", "polished"] as VoiceTone[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPendingVoiceTone(pendingVoiceTone === opt ? null : opt)}
                      className={`text-left px-3 py-3 border transition-all duration-200 ${
                        pendingVoiceTone === opt
                          ? "border-gold bg-gold/5"
                          : "border-sand bg-warm-white/60 hover:border-gold/40"
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
                <p className="font-sans text-xs tracking-[0.12em] uppercase text-charcoal-soft mb-2">Your energy</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["funny", "serious"] as VoiceHumor[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPendingVoiceHumor(pendingVoiceHumor === opt ? null : opt)}
                      className={`text-left px-3 py-3 border transition-all duration-200 ${
                        pendingVoiceHumor === opt
                          ? "border-gold bg-gold/5"
                          : "border-sand bg-warm-white/60 hover:border-gold/40"
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
                <p className="font-sans text-xs tracking-[0.12em] uppercase text-charcoal-soft mb-2">Your captions</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["short", "storytelling"] as VoiceLength[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPendingVoiceLength(pendingVoiceLength === opt ? null : opt)}
                      className={`text-left px-3 py-3 border transition-all duration-200 ${
                        pendingVoiceLength === opt
                          ? "border-gold bg-gold/5"
                          : "border-sand bg-warm-white/60 hover:border-gold/40"
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
              <button
                onClick={handleSaveVoice}
                disabled={upsertProfile.isPending}
                className="btn-luxury w-full"
              >
                {upsertProfile.isPending ? "Saving..." : "Save voice style"}
              </button>
            </div>
          )}
        </div>

        {/* Upgrade */}
        {credits?.tier === "free" && (
          <div className="p-5 border border-gold/30 bg-warm-white/60">
            <p className="font-sans text-xs tracking-[0.1em] uppercase text-gold mb-2">
              Upgrade
            </p>
            <p className="font-serif text-lg text-charcoal mb-1">Starter Plan</p>
            <p className="font-sans font-light text-xs text-charcoal-soft mb-4">
              Starter: 30 generations for $19/mo. Pro: 75 generations for $39/mo.
            </p>
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
        )}

        {/* Sign out */}
        <div className="pt-4">
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="w-full py-3 font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal border border-sand hover:border-charcoal/40 transition-all duration-200"
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
