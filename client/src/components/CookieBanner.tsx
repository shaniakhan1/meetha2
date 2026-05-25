import { useState, useEffect } from "react";
import { Link } from "wouter";

const COOKIE_KEY = "meetha_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) {
      // Small delay so it doesn't flash immediately on load
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none"
      style={{ animation: "slideUp 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards" }}
    >
      <div
        className="max-w-lg mx-auto bg-charcoal text-cream border border-charcoal/80 p-5 shadow-xl pointer-events-auto"
        style={{ borderRadius: 0 }}
      >
        <p className="font-sans text-xs text-cream/80 leading-relaxed mb-4">
          Meetha uses cookies to keep you signed in and remember your preferences. We do not sell your data.{" "}
          <Link
            href="/privacy"
            className="text-gold underline underline-offset-2 hover:text-cream transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 py-2 font-sans text-xs tracking-[0.12em] uppercase bg-gold text-charcoal hover:bg-gold/90 transition-colors"
            style={{ transform: "scale(1)", transition: "transform 160ms cubic-bezier(0.23,1,0.32,1)" }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 py-2 font-sans text-xs tracking-[0.12em] uppercase border border-cream/30 text-cream/60 hover:text-cream hover:border-cream/60 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
