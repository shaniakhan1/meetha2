export type Archetype =
  | "luxury_minimal"
  | "elegant_chaos"
  | "soft_power"
  | "dark_feminine"
  | "ethereal";

export type Mood = "soft" | "magnetic" | "grounded" | "untamed";

export type Platform = "tiktok" | "reels" | "stories";

export type SceneCategory =
  | "morning_routine"
  | "travel_day"
  | "quiet_luxury"
  | "founder_energy"
  | "date_night"
  | "paparazzi_flash"
  | "digital_diary"
  | "bill_please"
  | "silk_robe_room_service"
  | "irish_goodbye"
  | "cleopatra_principle"
  | "silk_robe_retaliation"
  | "motion_blur";

export type PostabilityResponse = "yes" | "maybe" | "no";

export type VideoFormat = "tiktok_reels" | "square" | "landscape";

export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  tiktok_reels: "TikTok / Reels",
  square: "Square",
  landscape: "Landscape",
};

export const VIDEO_FORMAT_DESCRIPTIONS: Record<VideoFormat, string> = {
  tiktok_reels: "9:16 vertical - TikTok, Instagram Reels, YouTube Shorts",
  square: "1:1 - Instagram feed, Facebook",
  landscape: "16:9 horizontal - YouTube, Facebook cover",
};

// Maps video format to Fal/image aspect ratio string
export const VIDEO_FORMAT_ASPECT: Record<VideoFormat, string> = {
  tiktok_reels: "portrait_16_9",  // 9:16 vertical
  square: "square_hd",
  landscape: "landscape_16_9",
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  luxury_minimal: "Quiet Luxury",
  elegant_chaos: "Warm Editorial",
  soft_power: "Magnetic Minimalist",
  dark_feminine: "Sculpted Glamour",
  ethereal: "Soft Contrast",
};

export const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
  luxury_minimal:
    "Extreme negative space. Cream, ivory, and warm stone. One deliberate piece. Nothing unnecessary.",
  elegant_chaos:
    "Rich texture, layered warmth. Amber, cognac, and deep camel. Structured silhouettes with one undone element.",
  soft_power:
    "Clean lines, warm neutrals. Cashmere and linen. Understated jewelry. The look that does not try.",
  dark_feminine:
    "Deep jewel tones and warm blacks. Velvet, leather, and heavy silk. Bold lip, strong brow, minimal eye.",
  ethereal:
    "Soft whites, blush, and warm ivory. Lightweight fabrics. Diffused light. Delicate metals and minimal contrast.",
};

export const MOOD_LABELS: Record<Mood, string> = {
  soft: "Intimate and Warm",
  magnetic: "Sharp and Polished",
  grounded: "Grounded and Certain",
  untamed: "Alive and Uncontained",
};

export const MOOD_DESCRIPTIONS: Record<Mood, string> = {
  soft: "Soft light, close framing, warm tones. Styling is intimate and layered. The camera moves slowly.",
  magnetic: "High contrast, precise styling, clean lines. Every element is deliberate. Nothing is accidental.",
  grounded: "Natural light, relaxed silhouettes, warm textures. Unhurried. The confidence of someone who has already decided.",
  untamed: "Movement, texture, and energy. Styling is bold and layered. The frame cannot fully contain it.",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "Feed Post",
  reels: "Portrait",
  stories: "Stories",
};

// Human-readable format descriptions shown in UI
export const PLATFORM_DESCRIPTIONS: Record<Platform, string> = {
  tiktok: "Square or landscape",
  reels: "4:5 portrait",
  stories: "9:16 full screen",
};

export const SCENE_LABELS: Record<SceneCategory, string> = {
  morning_routine: "Morning Ritual",
  travel_day: "In Motion",
  quiet_luxury: "Quiet Wealth",
  founder_energy: "The Work",
  date_night: "Evening Energy",
  paparazzi_flash: "Caught Looking Expensive",
  digital_diary: "Digital Diary",
  bill_please: "Bill, Please",
  silk_robe_room_service: "Room Service",
  irish_goodbye: "The Goodbye",
  cleopatra_principle: "The Cleopatra Principle",
  silk_robe_retaliation: "The Robe Reset",
  motion_blur: "The Blur",
};
