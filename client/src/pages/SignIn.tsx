import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Step = "email" | "sent";

export default function SignIn() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read referral code from URL query param
  const refCode = new URLSearchParams(window.location.search).get("ref") ?? undefined;

  const referrerQuery = trpc.referral.getReferrer.useQuery(
    { code: refCode! },
    { enabled: !!refCode }
  );
  const referrerName = referrerQuery.data?.name;

  useEffect(() => {
    if (refCode) {
      sessionStorage.setItem("meetha_ref_code", refCode);
    }
  }, [refCode]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (oauthError) {
        setError("Google sign-in failed. Please try again or use email below.");
        setGoogleLoading(false);
      }
      // On success, Supabase redirects the browser - no further action needed here
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

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
        <a href="/" className="font-serif text-lg tracking-widest text-charcoal hover:opacity-70 transition-opacity">MEETHA</a>
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
                Sign in to start creating.
              </p>
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-sand bg-warm-white hover:bg-white hover:border-gold/40 transition-all duration-200 px-4 py-3.5 mb-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <span className="w-4 h-4 border border-charcoal border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                  <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                  <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                  <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                </svg>
              )}
              <span className="font-sans text-sm text-charcoal">
                {googleLoading ? "Redirecting..." : "Continue with Google"}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-px bg-sand" />
              <span className="font-sans text-xs text-charcoal-soft/50 tracking-widest uppercase">or</span>
              <div className="flex-1 h-px bg-sand" />
            </div>

            {/* Magic Link Form */}
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
