import { useState, useEffect } from "react";
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
  const [editing, setEditing] = useState<"archetype" | "mood" | null>(null);
  const [pendingArchetype, setPendingArchetype] = useState<Archetype | null>(null);
  const [pendingMood, setPendingMood] = useState<Mood | null>(null);

  const profileQuery = trpc.profile.get.useQuery();
  const creditsQuery = trpc.credits.get.useQuery();
  const utils = trpc.useUtils();

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

  useEffect(() => {
    if (profile) {
      setPendingArchetype(profile.archetype as Archetype);
      setPendingMood(profile.mood as Mood);
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

      <div className="flex-1 px-6 py-8 space-y-8">
        {/* Account */}
        <div>
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-charcoal-soft mb-4">
            Account
          </p>
          <div className="p-5 border border-sand bg-warm-white/60 space-y-3">
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
            <div className="p-5 border border-sand bg-warm-white/60">
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
            <div className="p-5 border border-sand bg-warm-white/60">
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
