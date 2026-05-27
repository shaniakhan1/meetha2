import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [creditDelta, setCreditDelta] = useState<Record<number, string>>({});

  const usersQuery = trpc.admin.listUsers.useQuery(undefined, {
    retry: false,
  });

  // Redirect non-admins if query fails (FORBIDDEN)
  if (usersQuery.error) {
    navigate("/");
  }

  const resetLoraMutation = trpc.admin.resetLora.useMutation({
    onSuccess: () => {
      toast.success("LoRA reset. User can now retrain.");
      usersQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const adjustCreditsMutation = trpc.admin.adjustCredits.useMutation({
    onSuccess: (data) => {
      toast.success(`Credits updated. New balance: ${data.newBalance}`);
      usersQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const regenerateBriefMutation = trpc.admin.regenerateBrief.useMutation({
    onSuccess: () => toast.success("Styling brief regenerated."),
    onError: (e) => toast.error(e.message),
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <p className="font-sans text-sm text-charcoal-soft">Access denied.</p>
      </div>
    );
  }

  const users = usersQuery.data ?? [];
  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  const loraStatusColor = (status: string | null) => {
    if (status === "ready") return "text-green-600";
    if (status === "training") return "text-amber-500";
    if (status === "failed") return "text-red-500";
    return "text-charcoal-soft/50";
  };

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header */}
      <div className="border-b border-sand px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-sans text-xs tracking-widest uppercase text-gold mb-0.5">Meetha</p>
          <h1 className="font-serif text-xl text-charcoal">Admin Panel</h1>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="font-sans text-xs text-charcoal-soft underline underline-offset-2"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-sand bg-warm-white/60 p-4">
            <p className="font-sans text-xs text-charcoal-soft/60 tracking-widest uppercase mb-1">Total Users</p>
            <p className="font-serif text-2xl text-charcoal">{users.length}</p>
          </div>
          <div className="border border-sand bg-warm-white/60 p-4">
            <p className="font-sans text-xs text-charcoal-soft/60 tracking-widest uppercase mb-1">LoRA Ready</p>
            <p className="font-serif text-2xl text-charcoal">
              {users.filter((u) => u.loraStatus === "ready").length}
            </p>
          </div>
          <div className="border border-sand bg-warm-white/60 p-4">
            <p className="font-sans text-xs text-charcoal-soft/60 tracking-widest uppercase mb-1">Training</p>
            <p className="font-serif text-2xl text-charcoal">
              {users.filter((u) => u.loraStatus === "training").length}
            </p>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-sand bg-warm-white/60 px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal-soft/40 focus:outline-none focus:border-gold/60 mb-6"
        />

        {/* User table */}
        {usersQuery.isLoading ? (
          <div className="text-center py-12">
            <p className="font-sans text-sm text-charcoal-soft/60">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <div key={u.id} className="border border-sand bg-warm-white/60 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* User info */}
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-semibold text-charcoal truncate">{u.email}</p>
                    <p className="font-sans text-xs text-charcoal-soft/60 mt-0.5">
                      {u.name || "—"} &middot; {u.archetype ?? "no archetype"} / {u.mood ?? "no mood"} &middot;{" "}
                      {u.generationCount} generations
                    </p>
                    <p className="font-sans text-xs mt-1">
                      <span className="text-charcoal-soft/60">LoRA: </span>
                      <span className={`font-semibold ${loraStatusColor(u.loraStatus)}`}>
                        {u.loraStatus ?? "none"}
                      </span>
                      <span className="text-charcoal-soft/60 ml-3">Credits: </span>
                      <span className="font-semibold text-charcoal">{u.creditsRemaining}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Reset LoRA */}
                    <button
                      onClick={() => {
                        if (confirm(`Reset LoRA for ${u.email}? They will need to retrain.`)) {
                          resetLoraMutation.mutate({ userId: u.id });
                        }
                      }}
                      disabled={resetLoraMutation.isPending}
                      className="font-sans text-xs border border-sand px-3 py-1.5 text-charcoal hover:border-charcoal/40 transition-colors disabled:opacity-50"
                    >
                      Reset LoRA
                    </button>

                    {/* Adjust credits */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="+5"
                        value={creditDelta[u.id] ?? ""}
                        onChange={(e) => setCreditDelta((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        className="w-16 border border-sand px-2 py-1.5 font-sans text-xs text-charcoal text-center focus:outline-none focus:border-gold/60"
                      />
                      <button
                        onClick={() => {
                          const delta = parseInt(creditDelta[u.id] ?? "0", 10);
                          if (!isNaN(delta) && delta !== 0) {
                            adjustCreditsMutation.mutate({ userId: u.id, delta });
                            setCreditDelta((prev) => ({ ...prev, [u.id]: "" }));
                          }
                        }}
                        disabled={adjustCreditsMutation.isPending}
                        className="font-sans text-xs border border-sand px-3 py-1.5 text-charcoal hover:border-charcoal/40 transition-colors disabled:opacity-50"
                      >
                        Credits
                      </button>
                    </div>

                    {/* Regenerate brief */}
                    <button
                      onClick={() => regenerateBriefMutation.mutate({ userId: u.id })}
                      disabled={regenerateBriefMutation.isPending}
                      className="font-sans text-xs border border-gold/40 px-3 py-1.5 text-gold hover:border-gold transition-colors disabled:opacity-50"
                    >
                      Regen Brief
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="font-sans text-sm text-charcoal-soft/60">No users found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
