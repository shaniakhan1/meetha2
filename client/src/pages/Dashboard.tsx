import { useState, useEffect } from "react";
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
  archivedAt: string | null;
};

const PAGE_SIZE = 20;

const TEMPLATE_CARDS = [
  { slug: "paparazzi_flash", title: "Caught Looking Expensive", image: "/manus-storage/template-paparazzi-flash_24688a24.jpg" },
  { slug: "digital_diary", title: "Digital Diary", image: "/manus-storage/template-digital-diary_11ffb1d8.jpg" },
  { slug: "bill_please", title: "Bill, Please", image: "/manus-storage/template-bill-please_7eacca04.jpg" },
  { slug: "silk_robe_room_service", title: "Room Service", image: "/manus-storage/template-silk-robe_705e049a.jpg" },
  { slug: "irish_goodbye", title: "The Goodbye", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-irish-goodbye-ktzNEA3LBpMXoScC2CgPoj.webp" },
  { slug: "cleopatra_principle", title: "The Cleopatra Principle", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-cleopatra-RNkWpwxV5GeWZwStmYqiQx.webp" },
  { slug: "silk_robe_retaliation", title: "The Robe Reset", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-silk-robe-retaliation-MJXwGjfHhTjt3ENoPKdG8s.webp" },
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

  const utils = trpc.useUtils();
  const profileQuery = trpc.profile.get.useQuery();
  const creditsQuery = trpc.credits.get.useQuery();
  const generationsQuery = trpc.generations.list.useQuery({ limit: PAGE_SIZE, offset });
  const referralQuery = trpc.referral.getLink.useQuery();
  const briefQuery = trpc.profile.getAestheticBrief.useQuery();

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

  const handleDownload = async (id: number, hook?: string | null) => {
    if (downloadingId === id) return;
    setDownloadingId(id);
    try {
      const response = await fetch(`/api/download/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && navigator.canShare) {
        const file = new File([blob], `meetha-${id}.jpg`, { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "Meetha styled me", text: hook ?? "Meetha styled me" });
            return;
          } catch (shareErr: unknown) {
            if (shareErr instanceof Error && shareErr.name === "AbortError") return;
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meetha-${id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const heroGen = allGenerations[0] ?? null;
  const firstName = user?.name?.split(" ")[0] ?? "Your Studio";

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* HERO - full-bleed image with name overlay */}
      <div className="relative w-full flex-shrink-0" style={{ height: "52vw", maxHeight: "340px", minHeight: "220px" }}>
        {heroGen ? (
          <img
            src={heroGen.image_url}
            alt="Your latest creation"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center top" }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #2C1810 0%, #1a0f09 60%, #3a2015 100%)" }}
          />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(26,15,9,0.75) 100%)" }}
        />
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5">
          <span className="font-serif text-base tracking-[0.2em] text-cream/90">MEETHA</span>
          <button
            onClick={() => navigate("/profile")}
            className="font-sans text-xs tracking-widest uppercase text-cream/70 hover:text-cream transition-colors min-h-[44px] flex items-center"
          >
            Profile
          </button>
        </div>
        {/* Credits pill */}
        {credits && (
          <div className="absolute top-14 right-5">
            <div className="bg-[#1a0f09]/70 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2">
              <div className="w-14 h-0.5 bg-cream/20 relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-gold transition-all duration-700"
                  style={{
                    width: `${Math.min(100, ((credits.credits_remaining ?? 0) / (credits.tier === "pro" ? 75 : credits.tier === "starter" ? 30 : 3)) * 100)}%`,
                  }}
                />
              </div>
              <span className="font-sans text-xs text-cream/80 tabular-nums">{credits.credits_remaining} left</span>
            </div>
          </div>
        )}
        {/* Name + frequency */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <p className="font-sans text-xs tracking-[0.18em] uppercase text-gold/80 mb-1">Welcome back</p>
          <h1 className="font-serif text-3xl font-light text-cream leading-tight mb-1">{firstName}</h1>
          {archetype && mood && (
            <p className="font-sans font-light text-xs text-cream/60">{archetype} &middot; {mood}</p>
          )}
          {briefQuery.data?.palette && (
            <p className="font-sans font-light text-xs text-cream/40 mt-0.5">{briefQuery.data.palette}</p>
          )}
        </div>
      </div>

      {/* Slim status banners - no boxes */}
      {profile?.lora_status === "training" && (
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gold/20 bg-gold/5">
          <span className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="font-sans text-xs text-charcoal-soft">Your look is being learned. About 20 minutes. We will email you.</p>
        </div>
      )}
      {profile && (!profile.lora_status || profile.lora_status === "failed") && (
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center justify-between px-5 py-3 border-b border-gold/20 bg-gold/5 w-full text-left hover:bg-gold/10 transition-colors min-h-[44px]"
        >
          <p className="font-sans text-xs text-charcoal-soft">
            {profile.lora_status === "failed"
              ? "Training did not complete. Tap to retry."
              : "Make images look like you. Add your photos."}
          </p>
          <span className="font-sans text-xs text-gold ml-3 flex-shrink-0">Set up</span>
        </button>
      )}

      <div className="flex-1 px-5 pt-6 pb-28">

        {/* PRIMARY CTA */}
        <button
          onClick={() => navigate("/generate")}
          disabled={credits?.credits_remaining === 0}
          className="btn-luxury w-full mb-8 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Generate New Content
        </button>
        {credits?.credits_remaining === 0 && (
          <div className="text-center -mt-6 mb-8 space-y-1">
            <a
              href={import.meta.env.VITE_STRIPE_STARTER_LINK || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs text-gold hover:text-charcoal transition-colors tracking-wide block"
            >
              Get more generations ($19 / month)
            </a>
            <a
              href={import.meta.env.VITE_STRIPE_STARTER_ANNUAL_LINK || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs text-charcoal-soft/50 hover:text-charcoal-soft transition-colors tracking-wide block"
            >
              Annual plans (save up to 40%)
            </a>
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
                onClick={() => navigate(`/generate?template=${t.slug}`)}
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
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-story bg-sand/40 animate-pulse" />
            ))}
          </div>
        ) : allGenerations.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl text-charcoal mb-2">Nothing yet.</p>
            <p className="font-sans font-light text-sm text-charcoal-soft mb-6">
              Your first generation will appear here.
            </p>
            <button onClick={() => navigate("/generate")} className="btn-luxury px-8">
              Create your first
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {allGenerations.map((gen) => {
                const hooks = (() => {
                  try { return JSON.parse(gen.hooks) as string[]; }
                  catch { return []; }
                })();
                const isExpanded = expandedId === gen.id;
                const isDownloading = downloadingId === gen.id;
                return (
                  <div
                    key={gen.id}
                    className="relative overflow-hidden bg-[#1a0f09] cursor-pointer group"
                    style={{ borderRadius: "2px" }}
                    onClick={() => setExpandedId(isExpanded ? null : gen.id)}
                  >
                    <div className="aspect-story">
                      <img
                        src={gen.image_url}
                        alt={gen.selected_hook ?? "Generated content"}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                        loading="lazy"
                      />
                      {gen.selected_hook && !isExpanded && (
                        <div className="absolute inset-0 flex items-end justify-center pb-4 px-3"
                          style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(26,15,9,0.7) 100%)" }}
                        >
                          <p
                            className="font-serif text-cream text-center leading-tight"
                            style={{ fontSize: "clamp(0.65rem, 2.5vw, 0.85rem)", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
                          >
                            {gen.selected_hook}
                          </p>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="font-sans text-xs bg-[#1a0f09]/80 text-cream px-1.5 py-0.5 tracking-widest uppercase">
                          {PLATFORM_LABELS[gen.platform as keyof typeof PLATFORM_LABELS] ?? gen.platform}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div
                        className="absolute inset-0 bg-[#1a0f09]/92 flex flex-col items-center justify-center p-4 animate-fade-in opacity-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="font-sans text-xs tracking-widest uppercase text-gold mb-3">
                          {gen.scene_category ? SCENE_LABELS[gen.scene_category as keyof typeof SCENE_LABELS] : ""}
                        </p>
                        <p className="font-serif text-sm text-cream text-center leading-snug mb-4">
                          {gen.selected_hook ?? hooks[0]}
                        </p>
                        <p className="font-sans font-light text-xs text-cream/70 text-center leading-relaxed mb-4">
                          {gen.caption}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(gen.id, gen.selected_hook); }}
                          disabled={isDownloading}
                          className="font-sans text-xs tracking-widest uppercase text-cream border border-cream/40 px-6 py-3 hover:bg-cream/10 transition-colors active:scale-[0.97] disabled:opacity-50 min-h-[44px] w-full"
                        >
                          {isDownloading ? "Saving..." : "Save & Share"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(gen.id); }}
                          disabled={deletingId === gen.id}
                          className="font-sans text-[10px] tracking-widest uppercase text-cream/30 hover:text-cream/60 transition-colors mt-2 min-h-[36px] disabled:opacity-30"
                        >
                          {deletingId === gen.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
