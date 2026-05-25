import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ARCHETYPE_LABELS,
  MOOD_LABELS,
  PLATFORM_LABELS,
  SCENE_LABELS,
} from "@shared/types";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  const profileQuery = trpc.profile.get.useQuery();
  const creditsQuery = trpc.credits.get.useQuery();
  const generationsQuery = trpc.generations.list.useQuery();
  const referralQuery = trpc.referral.getLink.useQuery();

  const profile = profileQuery.data;
  const credits = creditsQuery.data;
  const generations = generationsQuery.data ?? [];
  const referral = referralQuery.data;

  const archetype = profile?.archetype
    ? ARCHETYPE_LABELS[profile.archetype as keyof typeof ARCHETYPE_LABELS]
    : null;
  const mood = profile?.mood
    ? MOOD_LABELS[profile.mood as keyof typeof MOOD_LABELS]
    : null;

  const referralUrl = referral?.code
    ? `${window.location.origin}/sign-in?ref=${referral.code}`
    : null;

  const handleCopyReferral = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setReferralCopied(true);
      toast.success("Referral link copied.");
      setTimeout(() => setReferralCopied(false), 2000);
    });
  };

  const handleDownload = async (_imageUrl: string, id: number) => {
    try {
      // Use server-side endpoint — applies watermark for free tier automatically
      const response = await fetch(`/api/download/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meetha-${id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-sand/40">
        <span className="font-serif text-lg tracking-widest text-charcoal">MEETHA</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/profile")}
            className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors"
          >
            Profile
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-8">
        {/* Welcome + Identity */}
        <div className="mb-8">
          {user?.name && (
            <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold mb-2">
              Welcome back
            </p>
          )}
          <h2 className="font-serif font-light text-charcoal mb-1">
            {user?.name?.split(" ")[0] ?? "Your Studio"}
          </h2>
          {archetype && mood && (
            <p className="font-sans font-light text-sm text-charcoal-soft">
              {archetype} &middot; {mood}
            </p>
          )}
        </div>

        {/* Credits bar */}
        <div className="mb-8 p-4 border border-sand bg-warm-white/60">
          <div className="flex items-center justify-between mb-3">
            <p className="font-sans text-xs tracking-[0.1em] uppercase text-charcoal-soft">
              Credits
            </p>
            <p className="font-serif text-sm text-charcoal">
              {credits?.credits_remaining ?? "—"} remaining
            </p>
          </div>
          <div className="w-full h-0.5 bg-sand">
            <div
              className="h-full bg-gold transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  ((credits?.credits_remaining ?? 0) /
                    (credits?.tier === "pro" ? 75 : credits?.tier === "starter" ? 30 : 3)) *
                    100
                )}%`,
              }}
            />
          </div>
          {credits?.credits_remaining === 0 && (
            <a
              href={import.meta.env.VITE_STRIPE_STARTER_LINK || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 font-sans text-xs text-gold hover:text-charcoal transition-colors tracking-wide"
            >
              Upgrade for more generations
            </a>
          )}
        </div>

        {/* Train Your Look nudge -- shown when lora_status is null or failed */}
        {(profile && !profile.lora_status || profile?.lora_status === "failed") && (
          <div className="mb-6 p-4 border border-gold/30 bg-warm-white/60">
            <p className="font-sans text-xs tracking-[0.1em] uppercase text-gold mb-1">
              {profile?.lora_status === "failed" ? "Training Did Not Complete" : "Train Your Look"}
            </p>
            <p className="font-serif text-sm text-charcoal leading-snug mb-3">
              {profile?.lora_status === "failed"
                ? "Your model did not finish. Upload your photos again to retry."
                : "Upload 6 photos and Meetha learns your face. Every generation looks like you."}
            </p>
            <button
              onClick={() => navigate("/profile")}
              className="font-sans text-xs tracking-[0.15em] uppercase text-gold hover:text-charcoal transition-colors"
            >
              {profile?.lora_status === "failed" ? "Retry" : "Get started"}
            </button>
          </div>
        )}

        {/* LoRA training status banner */}
        {profile?.lora_status === "training" && (
          <div className="mb-6 p-4 border border-gold/30 bg-warm-white/60 flex items-center gap-3">
            <span className="w-4 h-4 border border-gold border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="font-serif text-sm text-charcoal">
                Your look is being learned.
              </p>
              <p className="font-sans text-xs text-charcoal-soft/70 mt-0.5">
                This happens once. About 20 minutes. We will email you.
              </p>
            </div>
          </div>
        )}
        {profile?.lora_status === "ready" && (
          <div className="mb-6 p-4 border border-gold/30 bg-warm-white/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
              <p className="font-sans text-xs text-charcoal-soft">
                Your personal look is active. Generations now look like you.
              </p>
            </div>
          </div>
        )}

        {/* Generate CTA */}
        <button
          onClick={() => navigate("/generate")}
          disabled={credits?.credits_remaining === 0}
          className="btn-luxury w-full mb-6 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Generate New Content
        </button>

        {/* Template shortcut */}
        <button
          onClick={() => navigate("/templates")}
          className="w-full mb-6 p-4 border border-[#2C1810]/30 bg-[#2C1810] text-cream text-left hover:bg-[#3a2015] transition-all duration-200 active:scale-[0.98]"
        >
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold/70 mb-1">
            4 Templates Available
          </p>
          <p className="font-serif text-base text-cream">
            Caught Looking Expensive, Digital Diary, Bill Please, Silk Robe
          </p>
          <p className="font-sans font-light text-xs text-cream/50 mt-1">
            Tap to browse all templates
          </p>
        </button>

        {/* Referral card */}
        <div className="mb-10 p-4 border border-sand/60 bg-warm-white/40">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-sans text-xs tracking-[0.1em] uppercase text-gold mb-1">
                Invite a Friend
              </p>
              <p className="font-serif text-sm text-charcoal leading-snug">
                Both of you get 3 free generations.
              </p>
            </div>
            {referral && referral.completed > 0 && (
              <div className="text-right">
                <p className="font-sans text-xs text-charcoal-soft">
                  {referral.completed} joined
                </p>
              </div>
            )}
          </div>
          <p className="font-sans font-light text-xs text-charcoal-soft mb-4 leading-relaxed">
            Share your link. When a friend signs up using it, you each receive 3 extra generations — no strings attached.
          </p>
          {referralUrl ? (
            <button
              onClick={handleCopyReferral}
              className="w-full py-3 font-sans text-xs tracking-widest uppercase border transition-all duration-200 border-sand hover:border-gold/50 text-charcoal hover:text-charcoal bg-warm-white/60 hover:bg-warm-white"
            >
              {referralCopied ? "Link Copied" : "Copy Invite Link"}
            </button>
          ) : (
            <div className="w-full py-3 bg-sand/30 animate-pulse" />
          )}
        </div>

        {/* History Grid */}
        <div className="mb-4">
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal mb-1">
            Your Creations
          </p>
          <p className="font-sans font-light text-xs text-charcoal-soft">
            {generations.length} {generations.length === 1 ? "generation" : "generations"}
          </p>
        </div>

        {generationsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-story bg-sand/40 animate-pulse" />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <div className="py-16 text-center border border-sand bg-warm-white/40">
            <p className="font-serif text-lg text-charcoal mb-2">Nothing yet.</p>
            <p className="font-sans font-light text-xs text-charcoal-soft">
              Your first generation will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {generations.map((gen) => {
              const hooks = (() => {
                try {
                  return JSON.parse(gen.hooks) as string[];
                } catch {
                  return [];
                }
              })();
              const isExpanded = expandedId === gen.id;

              return (
                <div
                  key={gen.id}
                  className="relative overflow-hidden bg-[#1a0f09] cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : gen.id)}
                >
                  <div className="aspect-story">
                    <img
                      src={gen.image_url}
                      alt={gen.selected_hook ?? "Generated content"}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    {/* Hook overlay */}
                    {gen.selected_hook && (
                      <div className="absolute inset-0 flex items-end justify-center pb-4 px-3">
                        <p
                          className="font-serif text-cream text-center leading-tight"
                          style={{
                            fontSize: "clamp(0.65rem, 2.5vw, 0.85rem)",
                            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
                          }}
                        >
                          {gen.selected_hook}
                        </p>
                      </div>
                    )}
                    {/* Platform badge */}
                    <div className="absolute top-2 left-2">
                      <span className="font-sans text-xs bg-[#1a0f09]/80 text-cream px-1.5 py-0.5 tracking-widest uppercase">
                        {PLATFORM_LABELS[gen.platform as keyof typeof PLATFORM_LABELS] ?? gen.platform}
                      </span>
                    </div>
                  </div>

                  {/* Expanded overlay */}
                  {isExpanded && (
                    <div
                      className="absolute inset-0 bg-[#1a0f09]/92 flex flex-col items-center justify-center p-4 animate-fade-in opacity-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="font-sans text-xs tracking-widest uppercase text-gold mb-3">
                        {gen.scene_category
                          ? SCENE_LABELS[gen.scene_category as keyof typeof SCENE_LABELS]
                          : ""}
                      </p>
                      <p className="font-serif text-sm text-cream text-center leading-snug mb-4">
                        {gen.selected_hook ?? hooks[0]}
                      </p>
                      <p className="font-sans font-light text-xs text-cream/70 text-center leading-relaxed mb-4">
                        {gen.caption}
                      </p>
                      <button
                        onClick={() => handleDownload(gen.image_url, gen.id)}
                        className="font-sans text-xs tracking-widest uppercase text-cream border border-cream/40 px-4 py-2 hover:bg-cream/10 transition-colors"
                      >
                        Re-download
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 border-t border-sand/40 bg-cream/95 backdrop-blur-sm pb-safe">
        <div className="flex items-center justify-around px-6 py-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-1 h-1 rounded-full bg-charcoal" />
            <p className="font-sans text-xs tracking-widest uppercase text-charcoal">
              Home
            </p>
          </button>
          <button
            onClick={() => navigate("/generate")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-1 h-1 rounded-full bg-sand-dark" />
            <p className="font-sans text-xs tracking-widest uppercase text-charcoal-soft">
              Create
            </p>
          </button>
          <button
            onClick={() => navigate("/templates")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-1 h-1 rounded-full bg-sand-dark" />
            <p className="font-sans text-xs tracking-widest uppercase text-charcoal-soft">
              Templates
            </p>
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-1 h-1 rounded-full bg-sand-dark" />
            <p className="font-sans text-xs tracking-widest uppercase text-charcoal-soft">
              Profile
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
