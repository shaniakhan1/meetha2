import { forwardRef } from "react";

export type StyleBriefCardData = {
  hook: string | null;
  title?: string;
  palette?: string;
  metals?: string;
  makeup?: string;
  lighting?: string;
  presence?: string;
};

export type StyleBriefCardProps = {
  imageUrl: string;
  brief: StyleBriefCardData;
};

/**
 * StyleBriefCard
 *
 * A self-contained shareable card combining:
 *   - 4:3 generated image with gradient scrim
 *   - Hook text overlay (template captions only; null for Create Studio)
 *   - MEETHA wordmark
 *   - Cream identity brief panel (Palette / Metals / Makeup / Lighting / Presence)
 *
 * IMPORTANT: All colors use rgb/rgba/hex only — NO Tailwind CSS variables,
 * NO oklch — so html2canvas can capture this component without color errors.
 */
const StyleBriefCard = forwardRef<HTMLDivElement, StyleBriefCardProps>(
  function StyleBriefCard({ imageUrl, brief }, ref) {
    const rows = [
      ["Palette", brief.palette],
      ["Metals", brief.metals],
      ["Makeup", brief.makeup],
      ["Lighting", brief.lighting],
      ["Presence", brief.presence],
    ].filter(([, value]) => Boolean(value)) as [string, string][];

    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          maxWidth: "420px",
          margin: "0 auto",
          backgroundColor: "#fbf8f1",
          border: "1px solid #d8cbb8",
          fontFamily: "Inter, ui-sans-serif, system-ui",
          color: "#4b4740",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        {/* ── Image section ── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4/3",
            overflow: "hidden",
            backgroundColor: "#1a0f09",
          }}
        >
          <img
            src={imageUrl}
            alt="Generated Meetha style"
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 38%",
            }}
          />

          {/* Bottom gradient scrim */}
          <div
            style={{
              position: "absolute",
              inset: "auto 0 0 0",
              height: "50%",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0.18), rgba(0,0,0,0))",
            }}
          />

          {/* Hook text + MEETHA wordmark */}
          <div
            style={{
              position: "absolute",
              left: 24,
              bottom: 28,
              right: 24,
            }}
          >
            {brief.hook && (
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 22,
                  lineHeight: 1.18,
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.97)",
                  textShadow: "0 1px 14px rgba(0,0,0,0.55)",
                  margin: 0,
                }}
              >
                {brief.hook}
              </p>
            )}
            <p
              style={{
                marginTop: brief.hook ? 12 : 0,
                fontSize: 11,
                letterSpacing: "0.28em",
                color: "rgba(255,255,255,0.45)",
                textTransform: "uppercase",
                fontFamily: "Inter, ui-sans-serif, system-ui",
                fontWeight: 400,
                margin: brief.hook ? "12px 0 0 0" : "0",
              }}
            >
              MEETHA
            </p>
          </div>
        </div>

        {/* ── Identity brief panel ── */}
        <div style={{ padding: "28px" }}>
          <h2
            style={{
              color: "#c79b74",
              fontSize: 13,
              letterSpacing: "0.26em",
              fontWeight: 400,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {brief.title ?? "Your Identity Brief"}
          </h2>

          {rows.length > 0 && (
            <dl style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "84px 1fr",
                    gap: 16,
                  }}
                >
                  <dt
                    style={{
                      color: "#d4ad8b",
                      fontSize: 14,
                      lineHeight: 1.45,
                      fontWeight: 400,
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    style={{
                      color: "#625f59",
                      fontSize: 14,
                      lineHeight: 1.45,
                      margin: 0,
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    );
  }
);

export default StyleBriefCard;
