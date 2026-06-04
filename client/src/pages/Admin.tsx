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

  const [recoveryResult, setRecoveryResult] = useState<{ sent: number; skipped: number; noEmail: number; dryRun: boolean } | null>(null);

  // V58 credit restoration
  const affectedUsersQuery = trpc.admin.listAffectedUsers.useQuery(undefined, { retry: false });
  const [restoreResult, setRestoreResult] = useState<{ restored: number; dryRun: number; failed: number; isDryRun: boolean } | null>(null);
  const [apologyResult, setApologyResult] = useState<{ sent: number; dryRun: number; noEmail: number; failed: number; isDryRun: boolean } | null>(null);

  const restoreCreditsMutation = trpc.admin.restoreAffectedCredits.useMutation({
    onSuccess: (data) => {
      setRestoreResult(data);
      affectedUsersQuery.refetch();
      if (data.isDryRun) {
        toast.success(`Dry run: would restore credits for ${data.dryRun} users.`);
      } else {
        toast.success(`Credits restored for ${data.restored} users.${data.failed > 0 ? ` ${data.failed} failed.` : ""}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const sendApologyMutation = trpc.admin.sendApologyEmails.useMutation({
    onSuccess: (data) => {
      setApologyResult(data);
      if (data.isDryRun) {
        toast.success(`Dry run: would send apology to ${data.dryRun} users.`);
      } else {
        toast.success(`Apology emails sent to ${data.sent} users.${data.failed > 0 ? ` ${data.failed} failed.` : ""}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const sendRecoveryMutation = trpc.admin.sendRecoveryEmails.useMutation({
    onSuccess: (data) => {
      setRecoveryResult(data);
      if (data.dryRun) {
        toast.success(`Dry run: would send to ${data.sent} users.`);
      } else {
        toast.success(`Recovery emails sent to ${data.sent} users. ${data.skipped} failed. ${data.noEmail} had no email.`);
      }
    },
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

        {/* Recovery Campaign */}
        <div className="border border-amber-200 bg-amber-50/50 p-5 mb-8">
          <p className="font-sans text-xs tracking-widest uppercase text-amber-700 mb-1">Founder Recovery Campaign</p>
          <p className="font-sans text-sm text-charcoal mb-1">
            Sends Shania's recovery email to all <strong>free-tier users</strong> who haven't received it yet.
            Adds <strong>3 credits immediately</strong>. They receive <strong>3 bonus credits</strong> if they become a member.
          </p>
          <p className="font-sans text-xs text-charcoal-soft/60 mb-4">
            Safe to run multiple times — idempotent. Use Dry Run first to preview the count.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => sendRecoveryMutation.mutate({ dryRun: true })}
              disabled={sendRecoveryMutation.isPending}
              className="font-sans text-xs border border-amber-300 px-4 py-2 text-amber-700 hover:border-amber-500 transition-colors disabled:opacity-50"
            >
              {sendRecoveryMutation.isPending ? "Running..." : "Dry Run (preview)"}
            </button>
            <button
              onClick={() => {
                if (confirm("Send recovery emails to all eligible free-tier users? This adds 3 credits to each account and sends the founder email.")) {
                  sendRecoveryMutation.mutate({ dryRun: false });
                }
              }}
              disabled={sendRecoveryMutation.isPending}
              className="font-sans text-xs border border-charcoal/40 bg-charcoal px-4 py-2 text-warm-white hover:bg-charcoal/80 transition-colors disabled:opacity-50"
            >
              {sendRecoveryMutation.isPending ? "Sending..." : "Send Recovery Emails"}
            </button>
            {recoveryResult && (
              <span className="font-sans text-xs text-charcoal-soft">
                {recoveryResult.dryRun ? "Preview: " : "Sent: "}
                <strong>{recoveryResult.sent}</strong> emails
                {recoveryResult.skipped > 0 && `, ${recoveryResult.skipped} failed`}
                {recoveryResult.noEmail > 0 && `, ${recoveryResult.noEmail} no email`}
              </span>
            )}
          </div>
        </div>

        {/* V58 Credit Restoration */}
        {(() => {
          const affected = affectedUsersQuery.data ?? [];
          return (
            <div className="border border-rose-200 bg-rose-50/40 p-5 mb-8">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-sans text-xs tracking-widest uppercase text-rose-700">V58 Credit Restoration</p>
                {affectedUsersQuery.isLoading && (
                  <span className="font-sans text-xs text-rose-400">Loading...</span>
                )}
                {!affectedUsersQuery.isLoading && (
                  <span className="font-sans text-xs text-rose-600 font-semibold">{affected.length} affected user{affected.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              <p className="font-sans text-sm text-charcoal mb-1">
                Restores credits lost during the V58 atomic deduction bug (June 4, 2026).
                Phantom deductions = <code className="text-xs bg-rose-100 px-1">total_used - actual_generation_count</code>.
              </p>
              <p className="font-sans text-xs text-charcoal-soft/60 mb-4">
                Idempotent — safe to run multiple times. Run Dry Run first to preview.
              </p>

              {/* Affected user list */}
              {affected.length > 0 && (
                <div className="mb-4 max-h-48 overflow-y-auto border border-rose-100 bg-white/60 divide-y divide-rose-50">
                  {affected.map((u) => (
                    <div key={u.userId} className="px-3 py-2 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-sans text-xs text-charcoal truncate">{u.email ?? `User #${u.userId}`}</p>
                        <p className="font-sans text-xs text-charcoal-soft/60">
                          {u.actualGenerations} actual gen{u.actualGenerations !== 1 ? "s" : ""} &middot; {u.totalUsed} total_used &middot; {u.creditsRemaining} remaining
                        </p>
                      </div>
                      <span className="font-sans text-xs font-semibold text-rose-600 shrink-0">
                        +{u.phantomDeductions} to restore
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {affected.length === 0 && !affectedUsersQuery.isLoading && (
                <p className="font-sans text-xs text-green-600 mb-4">No affected users found — all credits are reconciled.</p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => restoreCreditsMutation.mutate({ dryRun: true })}
                  disabled={restoreCreditsMutation.isPending || affected.length === 0}
                  className="font-sans text-xs border border-rose-300 px-4 py-2 text-rose-700 hover:border-rose-500 transition-colors disabled:opacity-50"
                >
                  {restoreCreditsMutation.isPending ? "Running..." : "Dry Run (preview)"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Restore credits for ${affected.length} affected user${affected.length !== 1 ? "s" : ""}? This is safe to run multiple times.`)) {
                      restoreCreditsMutation.mutate({ dryRun: false });
                    }
                  }}
                  disabled={restoreCreditsMutation.isPending || affected.length === 0}
                  className="font-sans text-xs border border-rose-600 bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {restoreCreditsMutation.isPending ? "Restoring..." : "Restore All Credits"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Send apology emails to ${affected.length} affected user${affected.length !== 1 ? "s" : ""}?`)) {
                      sendApologyMutation.mutate({ dryRun: false });
                    }
                  }}
                  disabled={sendApologyMutation.isPending || affected.length === 0}
                  className="font-sans text-xs border border-charcoal/40 bg-charcoal px-4 py-2 text-warm-white hover:bg-charcoal/80 transition-colors disabled:opacity-50"
                >
                  {sendApologyMutation.isPending ? "Sending..." : "Send Apology Emails"}
                </button>
                <button
                  onClick={() => sendApologyMutation.mutate({ dryRun: true })}
                  disabled={sendApologyMutation.isPending || affected.length === 0}
                  className="font-sans text-xs border border-charcoal/20 px-4 py-2 text-charcoal-soft hover:border-charcoal/40 transition-colors disabled:opacity-50"
                >
                  Dry Run Emails
                </button>
              </div>

              {/* Results */}
              {restoreResult && (
                <p className="font-sans text-xs text-charcoal-soft mt-3">
                  {restoreResult.isDryRun ? "Preview: " : "Restored: "}
                  <strong>{restoreResult.isDryRun ? restoreResult.dryRun : restoreResult.restored}</strong> users
                  {restoreResult.failed > 0 && <span className="text-rose-600">, {restoreResult.failed} failed</span>}
                </p>
              )}
              {apologyResult && (
                <p className="font-sans text-xs text-charcoal-soft mt-1">
                  {apologyResult.isDryRun ? "Email preview: " : "Emails sent: "}
                  <strong>{apologyResult.isDryRun ? apologyResult.dryRun : apologyResult.sent}</strong>
                  {apologyResult.noEmail > 0 && `, ${apologyResult.noEmail} no email`}
                  {apologyResult.failed > 0 && <span className="text-rose-600">, {apologyResult.failed} failed</span>}
                </p>
              )}
            </div>
          );
        })()}

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
