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
  luxury_minimal: "Still Frequency",
  elegant_chaos: "Electric Frequency",
  soft_power: "Magnetic Frequency",
  dark_feminine: "Deep Frequency",
  ethereal: "Light Frequency",
};

export const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
  luxury_minimal:
    "Stillness as power. Negative space that speaks. The room goes quiet when this energy enters.",
  elegant_chaos:
    "High voltage, soft landing. Contradictions that make sense only when you feel them.",
  soft_power:
    "Warmth with edges. People lean in without knowing why. Presence that does not announce itself.",
  dark_feminine:
    "Depth that cannot be measured. Unhurried, unshaken. Felt before it is seen.",
  ethereal:
    "Translucent and luminous. The frequency of something sacred. Light moving through silk.",
};

export const MOOD_LABELS: Record<Mood, string> = {
  soft: "Low and Warm",
  magnetic: "High and Clear",
  grounded: "Rooted and Steady",
  untamed: "Open and Moving",
};

export const MOOD_DESCRIPTIONS: Record<Mood, string> = {
  soft: "Slow, intimate, and deeply present. The frequency of a quiet morning that belongs only to you.",
  magnetic: "Effortlessly drawing. Clear signal, no static. Everything in the frame feels chosen.",
  grounded: "Unhurried and certain. The confidence of someone who has already decided.",
  untamed: "Uncontained and alive. Beauty that refuses to be organized. Wildness with taste.",
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
