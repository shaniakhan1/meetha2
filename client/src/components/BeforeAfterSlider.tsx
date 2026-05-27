import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  initialPosition?: number; // 0–100, default 42
  className?: string;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "undefined",
  afterLabel = "aligned",
  initialPosition = 42,
  className = "",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => updatePosition(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      updatePosition(e.touches[0].clientX);
    };
    const handleUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-sm select-none touch-none ${className}`}
      style={{ cursor: isDragging ? "ew-resize" : "col-resize" }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* After image (full width, bottom layer) */}
      <img
        src={afterSrc}
        alt="After — aligned"
        className="block w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Before image (clipped to left of divider) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeSrc}
          alt="Before — undefined"
          className="block h-full object-cover pointer-events-none"
          style={{ width: `${(100 / position) * 100}%`, maxWidth: "none" }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-px bg-white/80 pointer-events-none"
        style={{ left: `${position}%` }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M6 4L2 9L6 14" stroke="#2C1810" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 4L16 9L12 14" stroke="#2C1810" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Labels */}
      <div
        className="absolute bottom-4 left-4 px-2.5 py-1 rounded-sm text-xs tracking-widest uppercase font-sans text-white/90 pointer-events-none"
        style={{ background: "rgba(44,24,16,0.55)", backdropFilter: "blur(4px)" }}
      >
        {beforeLabel}
      </div>
      <div
        className="absolute bottom-4 right-4 px-2.5 py-1 rounded-sm text-xs tracking-widest uppercase font-sans text-white/90 pointer-events-none"
        style={{ background: "rgba(44,24,16,0.55)", backdropFilter: "blur(4px)" }}
      >
        {afterLabel}
      </div>
    </div>
  );
}
