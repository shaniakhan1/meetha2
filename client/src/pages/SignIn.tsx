import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type Step = "email" | "sent";

export default function SignIn() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read referral code from URL query param
  const refCode = new URLSearchParams(window.location.search).get("ref") ?? undefined;

  // Look up referrer name if code present
  const referrerQuery = trpc.referral.getReferrer.useQuery(
    { code: refCode! },
    { enabled: !!refCode }
  );
  const referrerName = referrerQuery.data?.name;

  // Store referral code in sessionStorage so AuthCallback can pass it along
  useEffect(() => {
    if (refCode) {
      sessionStorage.setItem("meetha_ref_code", refCode);
    }
  }, [refCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          redirectTo: window.location.origin,
          ...(refCode ? { referralCode: refCode } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStep("sent");
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <button
          onClick={() => navigate("/")}
          className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors"
        >
          Back
        </button>
        <span className="font-serif text-lg tracking-widest text-charcoal">MEETHA</span>
        <div className="w-10" />
      </div>

      {/* Referral banner */}
      {refCode && (
        <div className="mx-6 mb-2 px-4 py-3 border border-gold/40 bg-gold/5 text-center">
          <p className="font-sans text-xs text-charcoal-soft">
            {referrerName
              ? `${referrerName} invited you.`
              : "You were invited."}{" "}
            <span className="text-gold">Sign up and you both get 3 free generations.</span>
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        {step === "email" ? (
          <div className="w-full max-w-sm">
            {/* Headline */}
            <div className="text-center mb-10">
              <h1 className="font-serif font-light text-3xl text-charcoal mb-3">
                Enter your world.
              </h1>
              <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
                We will send a sign-in link to your email.
                <br />
                No password required.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full bg-transparent border border-sand px-4 py-3.5 font-sans text-sm text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              {error && (
                <p className="font-sans text-xs text-red-400 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-luxury w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Sign-In Link"}
              </button>
            </form>

            <p className="mt-8 text-center font-sans font-light text-xs text-charcoal-soft/60 leading-relaxed">
              By continuing, you agree to Meetha's terms of service.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm text-center">
            {/* Sent confirmation */}
            <div className="mb-8">
              <div className="w-12 h-px bg-gold mx-auto mb-8" />
              <h1 className="font-serif font-light text-3xl text-charcoal mb-4">
                Check your inbox.
              </h1>
              <p className="font-sans font-light text-sm text-charcoal-soft leading-relaxed">
                A sign-in link has been sent to
              </p>
              <p className="font-serif text-sm text-charcoal mt-1 mb-6">{email}</p>
              <p className="font-sans font-light text-xs text-charcoal-soft/70 leading-relaxed">
                Click the link in your email to sign in.
                <br />
                The link expires in 1 hour.
              </p>
            </div>

            <button
              onClick={() => { setStep("email"); setError(null); }}
              className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
