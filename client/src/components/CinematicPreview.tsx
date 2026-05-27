import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PLATFORM_LABELS, type Platform } from "@shared/types";

interface CinematicPreviewProps {
  imageUrl: string;
  hook: string | null;
  animated?: boolean;
  /** "hooks" step shows a small thumbnail; "preview" step shows the full cinematic view */
  size?: "thumb" | "full";
  platform?: string;
}

/**
 * Renders a cinematic image preview with:
 * - Correct 9:16 vertical aspect ratio
 * - Optional hook text overlay with platform-safe typography
 * - Gradient scrim so text is always legible
 * - CSS Ken Burns slow zoom animation (Starter+ tier)
 * - Subtle film grain overlay
 * - Format badge (Feed Post / Portrait / Stories)
 */
const CinematicPreview = forwardRef<HTMLDivElement, CinematicPreviewProps>(function CinematicPreview({
  imageUrl,
  hook,
  animated = false,
  size = "full",
  platform,
}, ref) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Expose the card DOM node to parent via ref
  useImperativeHandle(ref, () => cardRef.current as HTMLDivElement);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  const isThumb = size === "thumb";

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden bg-charcoal select-none ${
        isThumb ? "aspect-[9/16] max-h-56 w-full" : "aspect-[9/16] w-full max-w-sm mx-auto"
      }`}
      style={{ borderRadius: "2px" }}
    >
      {/* ── Image ── */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Generated cinematic content"
        crossOrigin="anonymous"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${animated ? "cinematic-zoom" : ""}`}
        draggable={false}
      />

      {/* ── Film grain overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
          opacity: 0.35,
          mixBlendMode: "overlay",
        }}
      />

      {/* ── Bottom gradient scrim ── */}
      {hook && (
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: "55%",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 45%, transparent 100%)",
          }}
        />
      )}

      {/* ── Top gradient scrim (subtle) ── */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "25%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 100%)",
        }}
      />

      {/* ── Format badge ── */}
      {platform && !isThumb && (
        <div className="absolute top-4 left-4">
          <span
            className="font-sans text-white/70 tracking-[0.15em] uppercase"
            style={{ fontSize: "9px" }}
          >
            {PLATFORM_LABELS[platform as Platform] ?? platform}
          </span>
        </div>
      )}

      {/* ── Hook text overlay + MEETHA branding ── */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col items-center justify-end ${
          isThumb ? "pb-4 px-3" : "pb-10 px-8"
        }`}
      >
        {hook && (
          <p
            className="text-white leading-tight font-serif text-center"
            style={{
              fontSize: isThumb ? "clamp(0.75rem, 3vw, 1rem)" : "clamp(1.15rem, 5vw, 1.6rem)",
              textShadow: "0 1px 8px rgba(0,0,0,0.6), 0 2px 24px rgba(0,0,0,0.3)",
              letterSpacing: "0.01em",
              fontWeight: 300,
            }}
          >
            {hook}
          </p>
        )}
        {/* MEETHA wordmark — always visible */}
        {!isThumb && (
          <p
            className="text-white/40 font-sans tracking-[0.2em] uppercase"
            style={{ fontSize: "8px", marginTop: hook ? "12px" : "0" }}
          >
            M  E  E  T  H  A
          </p>
        )}
      </div>

      {/* ── Loading shimmer ── */}
      {!loaded && (
        <div className="absolute inset-0 bg-sand/30 animate-pulse" />
      )}
    </div>
  );
});

export default CinematicPreview;
