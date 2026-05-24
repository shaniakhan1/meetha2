import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase puts the token in the URL hash after magic link click
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Exchange the hash fragment for a session
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          // Try to get session from URL hash directly
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken) {
            const { data: sessionData, error: sessionSetError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken ?? "",
            });

            if (sessionSetError || !sessionData.session) {
              setError("Sign-in link has expired. Please request a new one.");
              return;
            }

            await exchangeWithServer(sessionData.session.access_token);
            return;
          }

          setError("Sign-in link has expired. Please request a new one.");
          return;
        }

        await exchangeWithServer(data.session.access_token);
      } catch (err) {
        console.error("[AuthCallback] Error:", err);
        setError("Something went wrong. Please try signing in again.");
      }
    };

    const exchangeWithServer = async (accessToken: string) => {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_token: accessToken }),
      });

      if (!res.ok) {
        setError("Failed to establish session. Please try again.");
        return;
      }

      // Redirect to home — the app will route to onboarding or dashboard
      navigate("/");
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-px bg-gold mx-auto mb-8" />
          <h1 className="font-serif font-light text-2xl text-charcoal mb-3">
            Link expired.
          </h1>
          <p className="font-sans font-light text-sm text-charcoal-soft mb-8 leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => navigate("/sign-in")}
            className="btn-luxury"
          >
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <span className="font-serif text-lg tracking-widest text-charcoal block mb-6">
          MEETHA
        </span>
        <div className="w-8 h-px bg-gold mx-auto mb-4 animate-pulse" />
        <p className="font-sans font-light text-xs text-charcoal-soft tracking-widest uppercase">
          Signing you in...
        </p>
      </div>
    </div>
  );
}
