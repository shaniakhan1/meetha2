import { z } from "zod";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut, storageGetSignedUrl } from "./storage";
import { getSupabase } from "./_core/supabase";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, adminProcedure, router } from "./_core/trpc";
import { invokeLLMOpenAI } from "./_core/openaiLLM";
import { generateImageFal } from "./_core/falImageGeneration";
import { generateImageWithLora } from "./_core/falLoraTraining";
import { generateVideoFal } from "./_core/falVideoGeneration";
import {
  getProfile,
  upsertProfile,
  getUserGenerations,
  countUserGenerations,
  archiveOldGenerations,
  archiveGeneration,
  createGeneration,
  updateGenerationHook,
  getCredits,
  ensureCredits,
  decrementCredit,
  savePostabilityFeedback,
  updateAestheticDescriptors,
  updateAestheticPreviewUrl,
  updateShareBadge,
  getOrCreateReferralCode,
  getUserByReferralCode,
  getReferralsByUser,
  deleteUserAccount,
  updateAestheticBrief,
  updateLoraProfile,
  updateGenerationCardUrl,
  updateIdentityBriefCardUrl,
  updateTransformationCardUrl,
} from "./db";
import { generateAndSaveStyleCard } from "./styleCard";
import { renderIdentityBriefCard } from "./identityBriefCard";
import { buildCreateStudioPrompt } from "./createStudioPrompt";
import {
  ARCHETYPE_DESCRIPTIONS,
  MOOD_DESCRIPTIONS,
  type Archetype,
  type Mood,
  type Platform,
  type SceneCategory,
} from "../shared/types";

// ─── Prompt Recipes ───────────────────────────────────────────────────────────

const SCENE_PROMPTS: Record<string, string> = {
  morning_routine:
    "close-up of hands with warm deep brown skin wrapped around a ceramic cup, steam rising, soft amber morning light through sheer linen curtains, gold ring detail, intimate scale",
  travel_day:
    "a structured leather carry-on bag on a polished stone airport floor, warm honey light, gold hardware detail, editorial travel stillness, no people",
  quiet_luxury:
    "heavy silk draped over a curved velvet chair, afternoon light casting a long architectural shadow, amber and ivory tones, minimal and considered",
  founder_energy:
    "a thick leather journal open on a marble surface, gold pen resting across the page, warm morning window light, intentional workspace, no clutter",
  date_night:
    "a champagne coupe close-up, soft candlelight catching the rim, deep jewel-toned velvet in the background, warm amber bokeh, cinematic and unhurried",

  // ── CINEMATIC TEMPLATES ────────────────────────────────────────────────────
  // Scene composition leads. Camera position, movement, environment, imperfection.
  // Identity/LoRA trigger is injected LAST by the caller.
  // "photorealistic" and "beautiful" are intentionally absent — they collapse Flux into beauty-portrait mode.

  paparazzi_flash:
    "CAMERA: harsh direct flash from street level, slightly below eye line, off-center framing, subject not looking at camera. " +
    "MOVEMENT: woman caught mid-turn exiting upscale restaurant or bar at night, hair mid-swing, one hand raised, mid-stride. " +
    "ENVIRONMENT: blurred crowd behind her, wet street reflections, warm amber venue light spilling through glass doors, other guests blurred. " +
    "LIGHTING: overexposed flash highlights, mixed flash and ambient nightlife warmth, harsh shadows. " +
    "IMPERFECTION: slight motion blur, imperfect candid framing, partial body crop, asymmetric composition, documentary texture. " +
    "STYLE: 2000s paparazzi film grain, anti-AI texture, 35mm analog, editorial female-gaze, vertical 9:16 framing",

  digital_diary:
    "analog scrapbook aesthetic, one instant polaroid photo taped with a small piece of washi tape, handwritten note on lined paper beside it, dried flower or pressed petal detail, soft warm window light, linen or cork board surface, film grain texture, intimate and personal, feels like a page from a real woman's private journal, no faces, editorial stillness, warm cream and faded yellow tones, vertical 9:16 framing",

  bill_please:
    "CAMERA: eye-level shot across the restaurant table, slightly off-center, candid angle as if photographed by someone seated nearby. " +
    "MOVEMENT: woman's arm extended reaching for the check, hand mid-motion, slight blur on the gesture. " +
    "ENVIRONMENT: candlelit fine dining restaurant, white tablecloth, crystal glasses, other diners blurred in background, warm amber bokeh. " +
    "LIGHTING: warm candlelight from below, soft ambient restaurant glow, no flash. " +
    "IMPERFECTION: natural candid framing, slight depth-of-field softness on background, asymmetric crop. " +
    "STYLE: 35mm analog warmth, film grain, editorial female-gaze, quiet power, vertical 9:16 framing",

  silk_robe_room_service:
    "close-up still life of a luxury hotel room service tray on crisp white linen: silver dome lifted to reveal a croissant and fruit, a ceramic coffee cup with steam rising, a single white rose in a bud vase, gold cutlery, warm morning window light flooding in from the left, no people, the tray is the entire subject, editorial food and lifestyle photography, shallow depth of field, film grain, 35mm analog warmth, warm cream and ivory tones, vertical 9:16 framing",

  irish_goodbye:
    "CAMERA: low angle, shot from behind and below, subject walking away, no face visible. " +
    "MOVEMENT: woman mid-stride walking away from crowded venue at night, hair moving, coat or dress in motion, not looking back. " +
    "ENVIRONMENT: blurred noisy crowd behind her, warm amber streetlight or venue glow, wet pavement reflections, depth of field separating her from the crowd. " +
    "LIGHTING: warm backlight from venue, rim light on silhouette, ambient nightlife warmth. " +
    "IMPERFECTION: motion blur on background, asymmetric framing, partial crop of subject, documentary street energy. " +
    "STYLE: 35mm analog street photography, film grain, editorial female-gaze, vertical 9:16 framing",

  cleopatra_principle:
    "CAMERA: eye-level, centered but unhurried, slightly wide to include environment, not a close-up portrait. " +
    "MOVEMENT: woman completely still, one hand resting on armrest, absolute stillness as a power statement. " +
    "ENVIRONMENT: deep velvet chaise longue or wide linen sofa, warm afternoon light casting long architectural shadows, jewel-toned or cream fabric, interior depth. " +
    "LIGHTING: warm afternoon side light, long shadows, rich ambient warmth, no flash. " +
    "IMPERFECTION: slight depth-of-field softness, natural asymmetry, environmental context visible. " +
    "STYLE: 35mm analog warmth, film grain, shallow depth of field, editorial female-gaze, vertical 9:16 framing",

  silk_robe_retaliation:
    "CAMERA: shot from behind, no face visible, wide enough to include window and cityscape. " +
    "MOVEMENT: woman completely still at floor-to-ceiling windows, one hand resting on glass, silhouette against the light. " +
    "ENVIRONMENT: luxury hotel suite, floor-to-ceiling windows, city skyline or treetops at golden hour, robe catching warm amber light. " +
    "LIGHTING: golden hour backlight flooding through windows, rim light on silhouette, warm amber and ivory tones. " +
    "IMPERFECTION: deep focus on silhouette and light, natural asymmetry, environmental depth. " +
    "STYLE: 35mm analog warmth, film grain, editorial female-gaze, vertical 9:16 framing",

  motion_blur:
    "CAMERA: photographed through moving taxi or car window glass, exterior paparazzi angle, partial obstruction by window frame. " +
    "MOVEMENT: woman seen through wet glass mid-life, side profile barely visible, city passing behind her, she is not posing. " +
    "ENVIRONMENT: city at night, neon and amber light trails streaking across wet glass, wet pavement reflections, light smearing from streetlights and signs. " +
    "LIGHTING: mixed neon and amber city light through glass, lens bloom on streetlights, no flash, available light only. " +
    "IMPERFECTION: heavy horizontal motion streaks across glass, reflections partially obscuring face, off-center framing, shallow depth of field, accidental composition. " +
    "STYLE: heavy film grain, 35mm analog street photography, lens bloom, anti-AI texture, editorial female-gaze, vertical 9:16 framing",
};

// Digital Diary: overlay hook options
const DIGITAL_DIARY_HOOKS = [
  "wrote it down",
  "saved this one",
  "she kept it",
  "not for everyone",
  "private collection",
  "she remembered",
  "this stayed with her",
  "tucked away",
];

// Bill Please: overlay hook options
const BILL_PLEASE_HOOKS = [
  "i stopped arguing",
  "the bill was cheaper than the lesson",
  "she paid and left",
  "quietly covered it",
  "no discussion needed",
  "she already knew the total",
  "check, please",
  "i leave quietly now",
  "the table was hers",
];

// Silk Robe Room Service: overlay hook options
const SILK_ROBE_HOOKS = [
  "ordered for one",
  "room service and silence",
  "this is the life",
  "no one else in the frame",
  "she did not rush",
  "mornings like this",
  "room to herself",
  "no plans today",
  "quiet morning",
  "the good kind of alone",
];

// Caught Looking Expensive: overlay hook options
const PAPARAZZI_HOOKS = [
  "vanished softly",
  "peace changed my face",
  "she got quieter",
  "seen briefly",
  "out past my bedtime",
  "summer looked good on her",
  "she already knew",
  "calm women move differently",
  "soft is not the same as small",
  "being grounded looks expensive now",
];

// Irish Goodbye Theory: overlay hook options
const IRISH_GOODBYE_HOOKS = [
  "she left without saying goodbye",
  "i stopped explaining my exits",
  "left the way i arrived",
  "no announcement",
  "she was already gone",
  "the door closed quietly",
  "i do not do long goodbyes",
  "she slipped out",
  "mid-conversation, she was done",
  "the best exit is a quiet one",
];

// Cleopatra Principle: overlay hook options
const CLEOPATRA_HOOKS = [
  "she already decided",
  "the room adjusted to her",
  "she did not ask",
  "presence is a full-time job",
  "she was not waiting for permission",
  "calm is a power move",
  "she just sat there and won",
  "the stillness is the statement",
  "she did not need to speak",
  "the decision was already made",
];

// The Blur: overlay hook options
const MOTION_BLUR_HOOKS = [
  "she was always somewhere interesting",
  "the world blurred around her",
  "she moved and the city moved with her",
  "in motion",
  "she never stood still long enough to be ordinary",
  "the blur is the point",
  "she was already gone",
  "caught mid-stride",
  "the city couldn't keep up",
  "she moved like she had somewhere to be",
];

// Silk Robe Retaliation: overlay hook options
const SILK_ROBE_RETALIATION_HOOKS = [
  "my isolation is a luxury maintenance ritual",
  "she chose herself again",
  "this is not a phase",
  "ordered for one",
  "she stopped explaining her peace",
  "rich grandma energy, activated",
  "no one earned access to this morning",
  "she does not share her quiet",
  "the robe stays on",
  "this is what choosing yourself looks like",
];

const ARCHETYPE_VISUAL: Record<string, string> = {
  luxury_minimal:
    "extreme negative space, cream and warm ivory tones, one deliberate object, architectural stillness, nothing unnecessary in the frame",
  elegant_chaos:
    "layered textures in tension, silk against leather or stone, bold shadow and warm light simultaneously, editorial contradiction that resolves beautifully",
  soft_power:
    "warm diffused amber light, soft intimate framing, emotional depth without sentimentality, the feeling of being seen",
  dark_feminine:
    "deep shadows with rich jewel tones, dramatic chiaroscuro, moody and unhurried, mystery without explanation",
  ethereal:
    "gossamer light, translucent fabric catching light, soft lens flare, dreamlike luminosity, the feeling of something sacred",
};

const MOOD_VISUAL: Record<string, string> = {
  soft: "gentle bokeh, warm amber natural light, soft intimate shadows, close and tender scale",
  magnetic:
    "strong visual pull, confident centered framing, rich warm saturation, commanding without aggression",
  grounded:
    "warm earthy tones, stable grounded composition, natural linen and wood textures, unhurried and certain",
  untamed:
    "dynamic natural movement, windswept organic textures, raw beauty with editorial restraint, energy that refuses containment",
};

// Archetype-aware default scenes when no scene category is selected
const ARCHETYPE_DEFAULT_SCENE: Record<string, string> = {
  luxury_minimal:
    "a single gold ring resting on a smooth cream linen surface, soft window light casting a long quiet shadow, one deliberate object in an empty frame, nothing unnecessary",
  elegant_chaos:
    "a silk slip draped over the arm of a velvet chair, afternoon light cutting across the fabric, warm amber and deep ivory in tension, editorial and alive",
  soft_power:
    "close-up of hands with warm deep brown skin holding a ceramic cup, steam rising, soft amber morning light through sheer curtains, gold ring detail, intimate and unhurried",
  dark_feminine:
    "a deep jewel-toned velvet surface with a single candle flame, rich shadow and warm amber light, moody and deliberate, nothing explained",
  ethereal:
    "sheer linen curtain catching morning light, soft lens flare, translucent fabric moving, warm golden luminosity, the feeling of something sacred and unhurried",
};

/**
 * Build a soft physical anchor string from raw vision-extracted descriptors.
 * Rewrites raw descriptors (e.g. "curvy body type") into preservation-first language
 * that anchors identity without over-describing race or body traits.
 * Safe to call with null -- returns empty string.
 */
function buildPhysicalAnchor(rawDescriptors: string | null | undefined): string {
  if (!rawDescriptors) return "";

  // Rephrase body-type descriptors into preservation language
  const bodyPreservationMap: Array<[RegExp, string]> = [
    [/\bcurvy\b/gi, "natural curves preserved"],
    [/\bplus[- ]size\b/gi, "soft body proportions preserved"],
    [/\bpetite\b/gi, "petite frame preserved"],
    [/\bslim\b/gi, "slender frame preserved"],
    [/\bathletic\b/gi, "athletic build preserved"],
    [/\bfull[- ]figured\b/gi, "full figure preserved"],
    [/\bheavyset\b/gi, "natural body proportions preserved"],
  ];

  let anchored = rawDescriptors;
  for (const [pattern, replacement] of bodyPreservationMap) {
    anchored = anchored.replace(pattern, replacement);
  }

  // Wrap in preservation-first framing
  return `preserve subject's natural complexion and undertones, maintain authentic facial structure, ${anchored},`;
}

/**
 * Keywords in physical_descriptors that indicate a fuller or curvier body type.
 * When any of these are detected, strong body preservation is injected automatically
 * even if the user has not explicitly set a body_preference.
 */
const FULLER_BODY_KEYWORDS = [
  "full", "curvy", "plus", "round", "wide", "broad", "thick", "heavy",
  "large", "ample", "voluptuous", "wide-hipped", "soft body", "fuller",
  "bigger", "rounder", "substantial",
];

function detectFullerBody(physicalDescriptors: string | null | undefined): boolean {
  if (!physicalDescriptors) return false;
  const lower = physicalDescriptors.toLowerCase();
  return FULLER_BODY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * System-level body preservation modifier.
 *
 * Injected at the FRONT of every image generation prompt (before scene, archetype,
 * aesthetic layers) so it carries maximum weight in the diffusion model's attention.
 *
 * Three tiers:
 * 1. Explicit body_type saved by user: use their exact preference text verbatim.
 * 2. Auto-detect fuller/curvier body from physical_descriptors: inject full preservation block.
 * 3. No body data at all: inject a minimal baseline anchor to resist the model's default slim bias.
 *
 * This is NOT about making anyone thinner or larger -- it is about making the
 * generated person recognizable as the same person who uploaded the training photos.
 */
function buildBodyPreservationModifier(
  bodyType: string | null | undefined,
  physicalDescriptors: string | null | undefined
): string {
  // Tier 1: user has an explicit body preference -- use it verbatim as the primary anchor
  if (bodyType && bodyType.trim().length > 0) {
    return `IDENTITY PRESERVATION: ${bodyType}. Preserve her exact natural body proportions, weight distribution, silhouette, frame width, arm fullness, bust and waist relationship, facial fullness, and physical presence. Do not slim, elongate, editorialize, or alter her natural body composition in any way.`;
  }

  // Tier 2: physical descriptors indicate a fuller or curvier body -- auto-inject full preservation
  if (detectFullerBody(physicalDescriptors)) {
    return `IDENTITY PRESERVATION: Preserve her exact natural body proportions, frame width, arm fullness, bust and waist relationship, facial fullness, and physical presence. Do not slim, elongate, editorialize, or alter her natural body composition. The subject has a fuller natural frame -- preserve it completely.`;
  }

  // Tier 3: no body data -- inject minimal baseline to resist model's default editorial-slim bias
  return `IDENTITY PRESERVATION: Preserve her natural body proportions and physical presence. Do not slim, elongate, or alter her natural body composition.`;
}

// Template scenes that define their own complete, self-contained prompts.
// These must NOT have the standard no-face/no-body/wardrobe suffix appended.
const SELF_CONTAINED_SCENES = new Set([
  "paparazzi_flash",
  "digital_diary",
  "bill_please",
  "silk_robe_room_service",
  "irish_goodbye",
  "cleopatra_principle",
  "silk_robe_retaliation",
  "motion_blur",
]);

function buildImagePrompt(
  archetype: string,
  mood: string,
  sceneCategory?: string | null,
  aestheticDescriptors?: string | null,
  niche?: string | null,
  audience?: string | null,
  bodyType?: string | null,
  physicalDescriptors?: string | null
): string {
  const scene = sceneCategory
    ? SCENE_PROMPTS[sceneCategory] || (ARCHETYPE_DEFAULT_SCENE[archetype] ?? ARCHETYPE_DEFAULT_SCENE.soft_power)
    : (ARCHETYPE_DEFAULT_SCENE[archetype] ?? ARCHETYPE_DEFAULT_SCENE.soft_power);

  // Template scenes are complete prompts -- return them as-is with cinematic quality suffix
  // Deliberately avoid "high resolution" and "photorealistic" to prevent beauty-portrait collapse
  if (sceneCategory && SELF_CONTAINED_SCENES.has(sceneCategory) && SCENE_PROMPTS[sceneCategory]) {
    // Still inject body preservation into template scenes -- they show full bodies
    const bodyPreservation = buildBodyPreservationModifier(bodyType, physicalDescriptors);
    return `${bodyPreservation} ${scene}, documentary realism, film grain, analog texture, imperfect focus, mood over sharpness, no beauty retouching, no over-sharpened faces, no sterile AI polish, no studio lighting, no clean background`;
  }

  const archetypeStyle = ARCHETYPE_VISUAL[archetype] || "";
  const moodStyle = MOOD_VISUAL[mood] || "";
  const aestheticLayer = aestheticDescriptors
    ? `calibrated to this specific aesthetic: ${aestheticDescriptors},`
    : "warm honey skin tones where hands are visible, gold jewelry details,";

  const nicheLayer = niche ? `visual world of a ${niche} creator,` : "";
  // Body preservation modifier injected at the front -- strongest signal for identity accuracy
  const bodyPreservationModifier = buildBodyPreservationModifier(bodyType, physicalDescriptors);
  // Physical anchor from vision-extracted descriptors (complexion, facial structure)
  const physicalAnchorLayer = buildPhysicalAnchor(physicalDescriptors);
  return `${bodyPreservationModifier} ${scene}, ${archetypeStyle}, ${moodStyle}, ${aestheticLayer} ${nicheLayer} ${physicalAnchorLayer} editorial female-gaze aesthetic, focus on wardrobe styling, fabric texture, jewelry detail, and atmospheric lighting, cinematic lighting, subtle film grain, realistic textures, warm amber tones, atmospheric depth, no faces, no full bodies, hands only when naturally holding an object, vertical 9:16 framing, social-media-ready, photorealistic, high resolution`;
}

const PLATFORM_TONE: Record<string, string> = {
  tiktok: "TikTok-native: conversational, identity-led, first-person or second-person, feels like something a real woman would type not a brand. Short sentences. Direct.",
  reels: "Instagram Reels: slightly more polished than TikTok but still personal and emotionally observational. Feels curated but not corporate.",
  stories: "Instagram Stories: intimate, present-tense, like a thought you had this morning. Ultra-short. One breath.",
};

const ARCHETYPE_VOICE: Record<string, string> = {
  luxury_minimal: "Still frequency. Voice is restrained and precise. One sentence does more than a paragraph. Silence is part of the message. Never explains itself.",
  elegant_chaos: "Electric frequency. Voice has beautiful tension. Unexpected word pairings. Contradictions that resolve into something true. Feels alive.",
  soft_power: "Magnetic frequency. Voice is warm but knowing. Emotionally intelligent without being soft. Feels like someone who has already figured it out.",
  dark_feminine: "Deep frequency. Voice is low, deliberate, unhurried. Mystery without explanation. Never justifies itself. Never performs.",
  ethereal: "Light frequency. Voice is sensory and translucent. Evokes texture, warmth, and feeling more than logic. Sacred without being religious.",
};

// ─── Hook Validation ────────────────────────────────────────────────────────
const BANNED_HOOK_WORDS = [
  "whispers", "gilded", "multitudes", "fathom", "luminous", "essence", "depth",
  "amid", "profound", "transcend", "resonate", "tapestry", "curated",
  "intentional", "authentic", "narrative", "embody", "embodies", "embark",
  "cultivate", "elevate", "elevates", "harness", "embrace", "unleash",
  "radiate", "radiates", "exude", "exudes", "in a world", "reminder that",
  "it's giving", "slay", "main character", "that girl", "boss", "level up",
  "this is your sign", "you deserve", "romanticize",
];

function isGoodHook(hook: string): boolean {
  const lower = hook.toLowerCase();
  if (hook.trim().split(/\s+/).length > 8) return false;
  return !BANNED_HOOK_WORDS.some((w) => lower.includes(w));
}

function hooksAreValid(hooks: string[]): boolean {
  return hooks.length === 3 && hooks.every(isGoodHook);
}

function buildCopyPrompt(
  archetype: string,
  mood: string,
  platform: string,
  aestheticDescriptors?: string | null,
  niche?: string | null,
  audience?: string | null,
  voiceStyle?: string | null,
  sceneCategory?: string | null
): string {
  // Digital Diary template: override hooks with the analog diary list
  if (sceneCategory === "digital_diary") {
    const hookOptions = DIGITAL_DIARY_HOOKS.slice(0, 6).map((h) => `"${h}"`).join(", ");
    const voiceCtx = voiceStyle
      ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the caption to match this.`
      : "";
    return `You are writing copy for a woman creator. The image is a "Digital Diary" page: analog polaroid taped with washi tape, handwritten note, dried flower, warm window light. It looks like a page from a real woman's private journal.${voiceCtx}

Choose exactly 3 hooks from this list (return them verbatim, do not modify): ${hookOptions}

Then write one caption:
- 1-2 short sentences. Plain everyday words only.
- No em-dashes, no exclamation marks, no questions
- BANNED WORDS: whispers, gilded, multitudes, luminous, essence, depth, profound, transcend, resonate, tapestry, curated, intentional, authentic, narrative, embody, elevate, harness, embrace, unleash, radiate, exude, magic, effortless, memories, cherish, treasure, precious
- Sounds like a note she wrote to herself, not a caption for an audience
- Short and specific. States one small true thing.
- Ends quietly with a statement, never a question or CTA

GOOD caption examples:
"kept this one."
"some things you just write down."
"she saved it. that is all."

BAD caption examples (never write like this):
"Cherishing precious memories captured in time." -- brand-speak
"These moments are the essence of her journey." -- abstract, AI-sounding
"Treasured whispers of a beautiful soul." -- meaningless

Then write exactly 5 hashtags:
- No # symbol
- No generic tags (no instagood, photooftheday, lifestyle, memories, aesthetic)
- Should feel like tags a real creator at this frequency would actually use

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
  }

  // Bill Please template
  if (sceneCategory === "bill_please") {
    const hookOptions = BILL_PLEASE_HOOKS.slice(0, 6).map((h) => `"${h}"`).join(", ");
    const voiceCtx = voiceStyle
      ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the caption to match this.`
      : "";
    return `You are writing copy for a woman creator. The image is "Bill, Please": she is at a fine dining restaurant, paying the check, calm and unbothered. The gesture is confident and final. She is not performing. She is just done.${voiceCtx}

Choose exactly 3 hooks from this list (return them verbatim, do not modify): ${hookOptions}

Then write one caption:
- 1-2 short sentences. Plain everyday words only.
- No em-dashes, no exclamation marks, no questions
- BANNED WORDS: whispers, gilded, multitudes, luminous, essence, depth, profound, transcend, resonate, tapestry, curated, intentional, authentic, narrative, embody, elevate, harness, embrace, unleash, radiate, exude, magic, effortless, empower
- No brand-speak, no affirmations, no motivational quotes
- Sounds like a real woman typing into her phone, not a copywriter
- States something true about not needing to argue, covering it quietly, or the feeling of being done with something
- Ends with a quiet statement, never a question or CTA

GOOD caption examples:
"i stopped arguing about the bill a long time ago."
"some things are cheaper to just pay for."
"she covered it and left. that was the whole story."

BAD caption examples (never write like this):
"Her grace transcends the moment." -- abstract, AI-sounding
"Effortless elegance at every table." -- brand-speak
"She radiates quiet power." -- meaningless

Then write exactly 5 hashtags:
- No # symbol
- No generic tags (no instagood, photooftheday, lifestyle, finedining, womenempowerment)
- Should feel like tags a real creator at this frequency would actually use

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
  }

  // Silk Robe Room Service template
  if (sceneCategory === "silk_robe_room_service") {
    const hookOptions = SILK_ROBE_HOOKS.slice(0, 6).map((h) => `"${h}"`).join(", ");
    const voiceCtx = voiceStyle
      ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the caption to match this.`
      : "";
    return `You are writing copy for a woman creator. The image is "Silk Robe Room Service": luxury hotel suite, silk robe, morning light, room service tray, she is alone and completely unbothered. This is not a performance. This is just her morning.${voiceCtx}

Choose exactly 3 hooks from this list (return them verbatim, do not modify): ${hookOptions}

Then write one caption:
- 1-2 short sentences. Plain everyday words only.
- No em-dashes, no exclamation marks, no questions
- BANNED WORDS: whispers, gilded, multitudes, luminous, essence, depth, profound, transcend, resonate, tapestry, curated, intentional, authentic, narrative, embody, elevate, harness, embrace, unleash, radiate, exude, magic, effortless, serene, bliss, tranquil
- No brand-speak, no affirmations, no motivational quotes
- Sounds like a real woman typing into her phone, not a hotel Instagram account
- States something true about being alone and content, ordering for one, or the pleasure of a morning with no agenda
- Ends with a quiet statement, never a question or CTA

GOOD caption examples:
"ordered for one and it was perfect."
"no plans today and it shows."
"she does not rush anymore. it is a whole thing."

BAD caption examples (never write like this):
"Serenity in every sip." -- brand-speak
"She radiates tranquil luxury." -- meaningless, AI-sounding
"Morning bliss is her essence." -- abstract, no one talks like this

Then write exactly 5 hashtags:
- No # symbol
- No generic tags (no instagood, photooftheday, lifestyle, hotellife, morningvibes)
- Should feel like tags a real creator at this frequency would actually use

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
  }

  // Irish Goodbye Theory template
  if (sceneCategory === "irish_goodbye") {
    const hookOptions = IRISH_GOODBYE_HOOKS.slice(0, 6).map((h) => `"${h}"`).join(", ");
    const voiceCtx = voiceStyle
      ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the caption to match this.`
      : "";
    return `You are writing copy for a woman creator. The image is "The Irish Goodbye": she is walking away from a crowded party or restaurant at night, seen from behind, mid-stride, not looking back. The crowd is blurred. She is sharp. She left without saying goodbye and felt nothing but relief.${voiceCtx}

Choose exactly 3 hooks from this list (return them verbatim, do not modify): ${hookOptions}

Then write one caption:
- 1-2 short sentences. Plain everyday words only.
- No em-dashes, no exclamation marks, no questions
- BANNED WORDS: whispers, gilded, multitudes, luminous, essence, depth, profound, transcend, resonate, tapestry, curated, intentional, authentic, narrative, embody, elevate, harness, embrace, unleash, radiate, exude, magic, effortless, ethereal
- No brand-speak, no affirmations, no motivational quotes
- Sounds like a real woman typing into her phone, not a copywriter
- States something true about leaving quietly, not explaining exits, or the relief of being done
- Ends with a quiet statement, never a question or CTA

GOOD caption examples:
"i stopped doing long goodbyes. nobody noticed."
"she was gone before anyone realized she was leaving."
"the best exit is the one nobody sees coming."

BAD caption examples (never write like this):
"She transcends the noise with effortless grace." -- abstract, AI-sounding
"Her essence whispers of quiet departures." -- meaningless
"Luminous in her exit." -- no one talks like this

Then write exactly 5 hashtags:
- No # symbol
- No generic tags (no instagood, photooftheday, lifestyle, nightout, girlsnight)
- Should feel like tags a real creator at this frequency would actually use

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
  }

  // Cleopatra Principle template
  if (sceneCategory === "cleopatra_principle") {
    const hookOptions = CLEOPATRA_HOOKS.slice(0, 6).map((h) => `"${h}"`).join(", ");
    const voiceCtx = voiceStyle
      ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the caption to match this.`
      : "";
    return `You are writing copy for a woman creator. The image is "The Cleopatra Principle": she is lounging on a velvet chaise or wide sofa, looking directly into the lens with absolute calm certainty. No smile. No performance. Just presence. The stillness of someone who has already decided everything.${voiceCtx}

Choose exactly 3 hooks from this list (return them verbatim, do not modify): ${hookOptions}

Then write one caption:
- 1-2 short sentences. Plain everyday words only.
- No em-dashes, no exclamation marks, no questions
- BANNED WORDS: whispers, gilded, multitudes, luminous, essence, depth, profound, transcend, resonate, tapestry, curated, intentional, authentic, narrative, embody, elevate, harness, embrace, unleash, radiate, exude, magic, effortless, queen, goddess, divine
- No brand-speak, no affirmations, no motivational quotes
- Sounds like a real woman typing into her phone, not a copywriter
- States something true about presence, not needing to explain herself, or the power of already having decided
- Ends with a quiet statement, never a question or CTA

GOOD caption examples:
"she did not say a word and the room got the message."
"the decision was already made before she walked in."
"calm is not passive. she just does not announce it."

BAD caption examples (never write like this):
"Her divine feminine energy radiates effortlessly." -- brand-speak, no one talks like this
"She embodies the essence of quiet power." -- abstract, AI-sounding
"Luminous queen energy." -- meaningless

Then write exactly 5 hashtags:
- No # symbol
- No generic tags (no instagood, photooftheday, lifestyle, queenenergy, womenempowerment)
- Should feel like tags a real creator at this frequency would actually use

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
  }

  // Silk Robe Retaliation template (Rich Grandma Energy)
  if (sceneCategory === "silk_robe_retaliation") {
    const hookOptions = SILK_ROBE_RETALIATION_HOOKS.slice(0, 6).map((h) => `"${h}"`).join(", ");
    const voiceCtx = voiceStyle
      ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the caption to match this.`
      : "";
    return `You are writing copy for a woman creator. The image is "Silk Robe Retaliation": luxury hotel suite, silk robe, morning light, room service tray, she is completely alone and completely at peace. This is Rich Grandma Energy. She chose herself and she is not explaining it.${voiceCtx}

Choose exactly 3 hooks from this list (return them verbatim, do not modify): ${hookOptions}

Then write one caption:
- 1-2 short sentences. Plain everyday words only.
- No em-dashes, no exclamation marks, no questions
- BANNED WORDS: whispers, gilded, multitudes, luminous, essence, depth, profound, transcend, resonate, tapestry, curated, intentional, authentic, narrative, embody, elevate, harness, embrace, unleash, radiate, exude, magic, effortless, serene, bliss, tranquil, healing
- No brand-speak, no affirmations, no motivational quotes
- Sounds like a real woman typing into her phone, not a wellness brand
- States something true about choosing yourself, protecting your peace, or the specific pleasure of a morning with no one in it
- Ends with a quiet statement, never a question or CTA

GOOD caption examples:
"my isolation is not a phase. it is a maintenance ritual."
"she stopped sharing her mornings and started looking like this."
"rich grandma energy is just choosing yourself before anyone asks."

BAD caption examples (never write like this):
"She radiates serene luxury in her sacred morning ritual." -- brand-speak
"Blissful tranquility is her essence." -- meaningless, AI-sounding
"She embraces her healing journey." -- wellness-speak, no one wants this

Then write exactly 5 hashtags:
- No # symbol
- No generic tags (no instagood, photooftheday, lifestyle, morningvibes, selfcare)
- Should feel like tags a real creator at this frequency would actually use

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
  }

  // The Blur: motion blur street photography copy
  if (sceneCategory === "motion_blur") {
    const hookOptions = MOTION_BLUR_HOOKS.slice(0, 6).map((h) => `"${h}"`).join(", ");
    const voiceCtx = voiceStyle
      ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the caption to match this.`
      : "";
    return `You are writing copy for a woman creator. The image is "The Blur": intentional motion blur street photography, she is mid-stride through a city at night, the only sharp element in the frame, light trails and neon reflections streaking behind her. The energy of someone always somewhere interesting.${voiceCtx}

Choose exactly 3 hooks from this list (return them verbatim, do not modify): ${hookOptions}

Then write one caption:
- 1-2 short sentences. Plain everyday words only.
- No em-dashes, no exclamation marks, no questions
- BANNED WORDS: whispers, gilded, multitudes, luminous, essence, depth, profound, transcend, resonate, tapestry, curated, intentional, authentic, narrative, embody, elevate, harness, embrace, unleash, radiate, exude, magic, effortless
- No brand-speak, no affirmations, no motivational quotes
- Sounds like a real woman typing into her phone, not a copywriter
- States something true about being in motion, always moving, or the specific energy of someone who never stays still
- Ends with a quiet statement, never a question or CTA

GOOD caption examples:
"she was always somewhere interesting. the city just tried to keep up."
"i stopped waiting and started moving. the blur is the point."
"she never stood still long enough to be ordinary."

BAD caption examples (never write like this):
"She radiates kinetic energy through the urban landscape." -- brand-speak
"Her luminous presence blurs the boundaries of time." -- meaningless, AI-sounding

Then write exactly 5 hashtags:
- No # symbol
- No generic tags (no instagood, photooftheday, lifestyle, cityvibes)
- Should feel like tags a real creator at this frequency would actually use

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
  }

  // Paparazzi Flash template: override hooks with the subtle overlay list
  if (sceneCategory === "paparazzi_flash") {
    const hookOptions = PAPARAZZI_HOOKS.slice(0, 6).map((h) => `"${h}"`).join(", ");
    const voiceCtx = voiceStyle
      ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the caption to match this exactly.`
      : "";
    return `You are writing copy for a woman creator. The image is a "Caught Looking Expensive" flash photo: harsh direct flash, film grain, candid nightlife, she looks effortlessly stunning and does not care that she was caught.${voiceCtx}

Choose exactly 3 hooks from this list (return them verbatim, do not modify): ${hookOptions}

Then write one caption:
- 1-2 short sentences. Plain everyday words only.
- No em-dashes, no exclamation marks, no questions
- No abstract or poetic language. BANNED WORDS: whispers, gilded, multitudes, fathom, luminous, essence, depth, amid, profound, transcend, resonate, tapestry, curated, intentional, authentic, narrative, embody, elevate, harness, embrace, unleash, radiate, exude, effortless beauty, magic, dims, captured
- No brand-speak, no affirmations, no motivational quotes, no Pinterest wellness
- Sounds like a real woman typing into her phone caption box, not a copywriter
- States a simple observable fact about her life. Does not explain it. Does not perform.
- Ends quietly with a statement, never a question or CTA

GOOD caption examples (copy this exact register):
"she got quieter and started looking better. not a coincidence."
"peace is a full-time job and it shows."
"i stopped explaining myself and started looking like this."

BAD caption examples (never write like this):
"Moments captured when the night dims. Effortless beauty is its own magic." -- too poetic, brand-speak, no one talks like this
"Her presence whispers louder than words." -- abstract, AI-sounding
"Luminous in the chaos." -- meaningless, sounds like a wall quote

Then write exactly 5 hashtags:
- No # symbol
- No generic tags (no instagood, photooftheday, lifestyle, nightvibes, effortlessstyle, candidelegance, flashphotography, filmgrain)
- Should feel like tags a real creator at this frequency would actually use
- Mix of niche-specific and broader reach

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
  }
  const archetypeDesc = ARCHETYPE_DESCRIPTIONS[archetype as Archetype] || "";
  const moodDesc = MOOD_DESCRIPTIONS[mood as Mood] || "";
  const platformTone = PLATFORM_TONE[platform] || PLATFORM_TONE.reels;
  const archetypeVoice = ARCHETYPE_VOICE[archetype] || "";
  const frequencyContext = aestheticDescriptors
    ? `\n\nThis creator's personal frequency calibration (extracted from her uploaded reference images): ${aestheticDescriptors}. Let this inform the specificity and cultural grounding of the copy. Her world is specific. Write from inside it.`
    : "";
  const nicheContext = niche || audience
    ? `\n\nCreator context: ${niche ? `She creates content about ${niche}.` : ""} ${audience ? `She speaks to ${audience}.` : ""} Ground the hooks and caption in this specific world. The copy should feel native to her niche, not generic luxury content.`
    : "";
  const voiceContext = voiceStyle
    ? `\n\nVoice style (how she writes online): ${voiceStyle}. Calibrate the tone, length, and energy of the copy to match this exactly.`
    : "";

  return `You are writing copy for a woman creator who has a specific, calibrated voice. You write the way she thinks, not the way a brand talks to her.

Creator's frequency: "${archetype.replace(/_/g, " ")}" - ${archetypeDesc}
Current energy: "${mood}" - ${moodDesc}
Platform: ${platform.toUpperCase()} - ${platformTone}
Voice calibration: ${archetypeVoice}${frequencyContext}${nicheContext}${voiceContext}

Write exactly 3 hook options for text overlay on a cinematic lifestyle image.

Hook rules - read every rule before writing:
- 1 to 6 words. Never longer.
- Plain everyday words only. No thesaurus words. No poetic vocabulary.
- Sounds like a text message or a note to herself, not a quote on a wall
- No metaphors, no symbolism, no abstract nouns (no "silence", "multitudes", "whispers", "gilded", "fathom", "depth", "luminous", "essence")
- No em-dashes, no ellipses, no exclamation marks
- No Pinterest wellness ("this is your sign", "you deserve", "romanticize")
- No hustle language ("level up", "boss", "main character", "that girl")
- No AI phrases ("in a world where", "reminder that", "it's giving", "slay")
- No motivational quotes, no affirmations, no calls to action
- States a simple observable fact about her life. Does not explain it.

GOOD examples (copy this exact register and length):
"calm women move differently"
"peace changed my face"
"she already knew"
"outfit repeating is confident"
"she got quieter"
"out past my bedtime"
"seen briefly"

BAD examples (never write like this):
"Gold whispers louder than gilded noise" - too poetic, fake-deep
"Her silence contains multitudes they can't fathom" - sounds like AI trying to be literary
"The light finds depth amid the simplicity" - abstract, no one talks like this
"Luxury is not always what you add" - too long, sounds like a brand tagline

If you cannot write something a real woman would type into her phone caption box, write nothing. Simple is always better.

Then write one caption:
- 1-3 short sentences. Plain words. Conversational.
- No em-dashes, no exclamation marks, no questions
- No abstract or poetic language (no "whispers", "gilded", "multitudes", "luminous", "depth", "essence")
- Sounds like something she would actually type, not something a brand copywriter would write
- Observational: states something true about her life or a simple contrast between her and everyone else
- Ends with a quiet statement. Not a question. Not a CTA.

Then write exactly 5 hashtags:
- No # symbol
- Mix of niche-specific and broader reach
- No generic tags (no instagood, photooftheday, lifestyle)
- Should feel like tags a real creator at this frequency would use

Respond in this exact JSON format:
{
  "hooks": ["hook one", "hook two", "hook three"],
  "caption": "The caption text here.",
  "hashtags": ["word1", "word2", "word3", "word4", "word5"]
}`;
}

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Profile ──────────────────────────────────────────────────────────────

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return (await getProfile(ctx.user.id)) ?? null;
    }),
    /**
     * Backfill: copies the latest generation's card_url to profile.transformation_card_url.
     * Used to fix existing users whose Gen 1 card was never persisted to the profile.
     */
    backfillStyleCard: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await getProfile(ctx.user.id);
      // Only backfill if profile doesn't already have a transformation_card_url
      if (profile?.transformation_card_url) return { skipped: true };
      const generations = await getUserGenerations(ctx.user.id, { limit: 50 });
      // Find the most recent generation that has a card_url
      const withCard = generations.find((g) => g.card_url);
      if (!withCard?.card_url) return { skipped: true };
      await updateTransformationCardUrl(ctx.user.id, withCard.card_url);
      return { backfilled: true, cardUrl: withCard.card_url };
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          archetype: z
            .enum([
              "luxury_minimal",
              "elegant_chaos",
              "soft_power",
              "dark_feminine",
              "ethereal",
            ])
            .optional(),
          mood: z.enum(["soft", "magnetic", "grounded", "untamed"]).optional(),
          onboardingComplete: z.boolean().optional(),
          niche: z.string().optional().nullable(),
          audience: z.string().optional().nullable(),
          voiceStyle: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertProfile({
          userId: ctx.user.id,
          archetype: input.archetype ?? "luxury_minimal",
          mood: input.mood ?? "soft",
          onboardingComplete: input.onboardingComplete ?? false,
          niche: input.niche,
          audience: input.audience,
          voiceStyle: input.voiceStyle,
        });
      }),

    /**
     * Create a Stripe Checkout Session for the $19 retrain add-on.
     * Returns the Stripe-hosted checkout URL.
     */
    createRetrainCheckout: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { createRetrainCheckoutSession } = await import("./stripeWebhook");
        const url = await createRetrainCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          origin: input.origin,
        });
        return { url };
      }),

    /**
     * Create a Stripe Checkout Session for a Membership subscription.
     * priceId: Stripe price ID for monthly or annual plan.
     */
    createSubscriptionCheckout: protectedProcedure
      .input(z.object({ origin: z.string(), priceId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { createSubscriptionCheckoutSession } = await import("./stripeWebhook");
        const url = await createSubscriptionCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          priceId: input.priceId,
          origin: input.origin,
        });
        return { url };
      }),

    /**
     * Check if the current user has an unused retrain purchase.
     */
    retrainStatus: protectedProcedure.query(async ({ ctx }) => {
      const { hasUnusedRetrainPurchase } = await import("./stripeWebhook");
      const credits = await getCredits(ctx.user.id);
      const hasUnused = await hasUnusedRetrainPurchase(ctx.user.id);
      return {
        freeLoraUsed: credits?.free_lora_used ?? false,
        hasUnusedPurchase: hasUnused,
        canRetrain: !(credits?.free_lora_used ?? false) || hasUnused,
      };
    }),

    /**
     * Toggle the "Shared with Meetha" badge on downloaded images.
     * Free tier always gets the badge. Starter/Pro can opt in or out.
     */
    setBodyType: protectedProcedure
      .input(z.object({ bodyType: z.string().max(120) }))
      .mutation(async ({ ctx, input }) => {
        const { updateBodyType } = await import("./db");
        await updateBodyType(ctx.user.id, input.bodyType);
        return { ok: true };
      }),

    setShareBadge: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        // Only Starter/Pro users can turn the badge off
        const credits = await getCredits(ctx.user.id);
        if (!credits || credits.tier === "free") {
          throw new Error("Upgrade to Starter or Pro to control the Meetha badge.");
        }
        await updateShareBadge(ctx.user.id, input.enabled);
        return { success: true };
      }),

    /**
     * Returns the user's saved Aesthetic Brief (color palette, metals, fabrics, etc.)
     * Generated by aestheticRead and persisted to profiles.aesthetic_brief.
     */
    getAestheticBrief: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getProfile(ctx.user.id);
      return profile?.aesthetic_brief ?? null;
    }),

  }),

  // ─── Credits ──────────────────────────────────────────────────────────────

  credits: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return (await ensureCredits(ctx.user.id)) ?? null;
    }),

    /**
     * Free-tier retry: restore 1 credit and archive the bad generation.
     * Only works once per user (free_retry_used gate). Only available to free tier.
     */
    requestFreeRetry: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const credits = await ensureCredits(ctx.user.id);
        if (credits.tier !== "free") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only available on the free tier." });
        }
        if (credits.free_retry_used) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Free retry already used." });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = getSupabase() as any;
        // Archive the bad generation
        await archiveGeneration(input.generationId, ctx.user.id);
        // Restore 1 credit and mark retry as used
        await sb
          .from("credits")
          .update({
            credits_remaining: credits.credits_remaining + 1,
            free_retry_used: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Generations ──────────────────────────────────────────────────────────

  generations: router({
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 20;
        const offset = input?.offset ?? 0;
        const [items, total] = await Promise.all([
          getUserGenerations(ctx.user.id, { limit, offset }),
          countUserGenerations(ctx.user.id),
        ]);
        return { items, total, limit, offset };
      }),

    selectHook: protectedProcedure
      .input(
        z.object({
          generationId: z.number(),
          selectedHook: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await updateGenerationHook({ generationId: input.generationId, selectedHook: input.selectedHook });
        return { success: true };
      }),

    /** Poll for the style card URL once background generation completes. */
    getCardUrl: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .query(async ({ ctx, input }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = getSupabase() as any;
        const { data } = await sb
          .from("generations")
          .select("id, user_id, card_url, card_key")
          .eq("id", input.generationId)
          .eq("user_id", ctx.user.id)
          .maybeSingle();
        return {
          cardUrl: (data?.card_url as string | null) ?? null,
          cardKey: (data?.card_key as string | null) ?? null,
        };
      }),

    /**
     * Regenerate only the copy (hooks, caption, hashtags) for an existing generation.
     * Does NOT spend a credit - the image already exists.
     */
    regenerateCopy: protectedProcedure
      .input(
        z.object({
          generationId: z.number(),
          platform: z.enum(["tiktok", "reels", "stories"]).default("reels"),
          sceneCategory: z
            .enum(["morning_routine", "travel_day", "quiet_luxury", "founder_energy", "date_night", "paparazzi_flash", "digital_diary", "bill_please", "silk_robe_room_service", "irish_goodbye", "cleopatra_principle", "silk_robe_retaliation", "motion_blur"])
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await getProfile(ctx.user.id);
        const archetype = profile?.archetype ?? "luxury_minimal";
        const mood = profile?.mood ?? "soft";
        const copyPrompt = buildCopyPrompt(
          archetype, mood, input.platform,
          profile?.aesthetic_descriptors ?? null,
          profile?.niche ?? null,
          profile?.audience ?? null,
          profile?.voice_style ?? null,
          input.sceneCategory ?? null
        );
        const copyResponse = await invokeLLMOpenAI({
          messages: [{ role: "user", content: copyPrompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "content_copy",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  hooks: { type: "array", items: { type: "string" }, description: "Exactly 3 editorial hook options" },
                  caption: { type: "string", description: "One caption 2-3 sentences" },
                  hashtags: { type: "array", items: { type: "string" }, description: "Exactly 5 hashtags without # symbol" },
                },
                required: ["hooks", "caption", "hashtags"],
                additionalProperties: false,
              },
            },
          },
        });
        let hooks: string[] = [];
        let caption = "";
        let hashtags: string[] = [];
        try {
          const content = copyResponse.choices?.[0]?.message?.content;
          const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
          hooks = parsed.hooks?.slice(0, 3) ?? [];
          caption = parsed.caption ?? "";
          hashtags = parsed.hashtags?.slice(0, 5) ?? [];
        } catch {
          hooks = ["calm women move differently", "she already knew", "peace changed my face"];
          caption = "She got quieter. Everything else got louder.";
          hashtags = ["quietluxury", "softpower", "editoriallife", "luxurylifestyle", "cinematic"];
        }
        if (!hooksAreValid(hooks)) {
          try {
            const retryPrompt = `${copyPrompt}\n\nCRITICAL: Every hook MUST be 1-6 plain words. No poetic vocabulary. Write like: "she got quieter" or "out past my bedtime". Nothing else.`;
            const retryRes = await invokeLLMOpenAI({ messages: [{ role: "user", content: retryPrompt }], response_format: { type: "json_schema", json_schema: { name: "content_copy", strict: true, schema: { type: "object", properties: { hooks: { type: "array", items: { type: "string" } }, caption: { type: "string" }, hashtags: { type: "array", items: { type: "string" } } }, required: ["hooks", "caption", "hashtags"], additionalProperties: false } } } });
            const rc = retryRes.choices?.[0]?.message?.content;
            const rp = JSON.parse(typeof rc === "string" ? rc : JSON.stringify(rc));
            if (hooksAreValid(rp.hooks ?? [])) { hooks = rp.hooks.slice(0, 3); caption = rp.caption ?? caption; hashtags = rp.hashtags?.slice(0, 5) ?? hashtags; }
          } catch { /* keep original */ }
        }
        return { hooks, caption, hashtags };
      }),

    /**
     * Generates a personalised real-world styling brief from the user's archetype,
     * mood, calibration descriptors, and the scene that was just generated.
     * Does NOT cost a credit - it is intelligence derived from data that already exists.
     */
    aestheticRead: protectedProcedure
      .input(
        z.object({
          archetype: z.string(),
          mood: z.string(),
          sceneCategory: z.string().optional().nullable(),
          aestheticDescriptors: z.string().optional().nullable(),
          loraPhysicalDescriptors: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const archetypeVisual = ARCHETYPE_VISUAL[input.archetype] ?? "";
        const moodVisual = MOOD_VISUAL[input.mood] ?? "";
        const sceneLabel = input.sceneCategory
          ? input.sceneCategory.replace(/_/g, " ")
          : "editorial luxury";

        const calibrationContext = [
          input.aestheticDescriptors ? `Calibrated aesthetic: ${input.aestheticDescriptors}.` : "",
          input.loraPhysicalDescriptors ? `Physical descriptors from her photos: ${input.loraPhysicalDescriptors}.` : "",
        ].filter(Boolean).join(" ");

        // STEP 1: Structured diagnostic pass (data first)
        const diagnosticPrompt = `You are a professional colorist and personal stylist. Analyze the following aesthetic profile and produce a precise color and styling diagnostic. This is the data layer -- be clinical, specific, and direct. No poetry, no metaphors.

Aesthetic profile:
- Style archetype: ${input.archetype.replace(/_/g, " ")} (${archetypeVisual})
- Energy state: ${input.mood} (${moodVisual})
- Scene context: ${sceneLabel}
${calibrationContext ? `- ${calibrationContext}` : ""}

Rules:
- BANNED WORDS: frequency, energy, essence, luminous, transcend, curated, intentional, authentic, elevate, radiate, exude, magic, effortless, serene, healing, sacred, mystical, divine, goddess, feminine, embody
- Be a diagnostician. Use precise technical terms.
- undertone: warm/cool/neutral, and the specific undertone (e.g. "warm golden undertone", "cool pink undertone")
- contrast_level: high/medium/low contrast between skin, hair, and eyes
- best_metals: one of warm gold / silver / rose gold / mixed metals, with a specific reason
- ideal_whites_blacks: whether pure white or off-white works better, whether true black or soft black works better
- makeup_intensity: low/medium/high, and which feature to lead with
- lighting_direction: best light direction for her coloring (e.g. "side lighting from the left", "overhead diffused")
- dominant_feature: the one feature that should be the focal point in styling
- fabric_weight: light/medium/heavy, and which specific fabrics suit her coloring best
- avoid_colors: 2-3 specific colors that wash her out or clash with her undertone (be specific: "cool grey", "orange-red", "neon yellow")
- lipstick_family: the exact lipstick family that works best (e.g. "warm berry and brick reds", "nude rose", "deep plum")
- jewelry_guidance: how to wear jewelry — scale, layering, and finish (e.g. "chunky warm gold, stacked, no silver")
- silhouette_guidance: which silhouettes flatter her coloring and archetype (e.g. "structured shoulders, clean lines, minimal volume")
- contrast_recommendation: how to use contrast in her outfits (e.g. "high contrast works — pair warm ivory with deep chocolate")
- shopping_notes: 2-3 specific shopping rules she can use immediately (e.g. "avoid anything with a cool grey undertone", "always choose the warmer shade")

Respond in this exact JSON format:
{
  "undertone": "specific undertone description",
  "contrast_level": "high/medium/low with brief explanation",
  "best_metals": "specific metal recommendation with reason",
  "ideal_whites_blacks": "which whites and blacks work best",
  "makeup_intensity": "intensity level and lead feature",
  "lighting_direction": "specific light direction and quality",
  "dominant_feature": "the feature to lead with in styling",
  "fabric_weight": "weight and specific fabric types",
  "avoid_colors": "2-3 specific colors to avoid",
  "lipstick_family": "exact lipstick family that works best",
  "jewelry_guidance": "scale, layering, and finish guidance",
  "silhouette_guidance": "silhouettes that flatter her coloring and archetype",
  "contrast_recommendation": "how to use contrast in her outfits",
  "shopping_notes": "2-3 specific shopping rules she can use immediately"
}`;

        // STEP 2: Editorial translation pass (luxury writing second)
        const editorialPrompt = (diagnostic: Record<string, string>) => `You are a Vogue creative director. Translate the following color diagnostic into elegant, specific editorial styling language. Write like you are briefing a model before a shoot. Short, direct, no wellness language.

Diagnostic data:
- Undertone: ${diagnostic.undertone}
- Contrast: ${diagnostic.contrast_level}
- Best metals: ${diagnostic.best_metals}
- Whites/blacks: ${diagnostic.ideal_whites_blacks}
- Makeup intensity: ${diagnostic.makeup_intensity}
- Lighting: ${diagnostic.lighting_direction}
- Dominant feature: ${diagnostic.dominant_feature}
- Fabric weight: ${diagnostic.fabric_weight}

Scene context: ${sceneLabel}

Rules:
- BANNED WORDS: frequency, energy, essence, luminous, transcend, curated, intentional, authentic, elevate, radiate, exude, magic, effortless, serene, healing, sacred, mystical, divine, goddess, feminine, embody
- No em dashes. No exclamation marks. No wellness-speak.
- Be specific. Say "warm ivory and deep camel" not "neutral tones". Say "red or deep berry lip" not "bold lip".
- Fabrics must name specific materials (silk, cashmere, linen, velvet, heavyweight jersey, crepe, organza). Never satin.
- Metals: say exactly warm yellow gold, silver, or rose gold and how to wear it.
- Lighting: describe a real setup she can recreate at home.

Respond in this exact JSON format:
{
  "color_palette": "2-3 specific colors that belong in her frame",
  "metals": "which metal and how to wear it",
  "fabrics": "2-3 specific fabric types",
  "makeup": "one specific makeup direction",
  "lighting": "exact lighting setup she can recreate",
  "hair": "one specific hair direction: structure, texture, finish"
}`;

        try {
          // Run step 1: diagnostic
          const diagnosticResponse = await invokeLLMOpenAI({
            messages: [{ role: "user", content: diagnosticPrompt }],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "color_diagnostic",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    undertone: { type: "string" },
                    contrast_level: { type: "string" },
                    best_metals: { type: "string" },
                    ideal_whites_blacks: { type: "string" },
                    makeup_intensity: { type: "string" },
                    lighting_direction: { type: "string" },
                    dominant_feature: { type: "string" },
                    fabric_weight: { type: "string" },
                    avoid_colors: { type: "string" },
                    lipstick_family: { type: "string" },
                    jewelry_guidance: { type: "string" },
                    silhouette_guidance: { type: "string" },
                    contrast_recommendation: { type: "string" },
                    shopping_notes: { type: "string" },
                  },
                  required: ["undertone", "contrast_level", "best_metals", "ideal_whites_blacks", "makeup_intensity", "lighting_direction", "dominant_feature", "fabric_weight", "avoid_colors", "lipstick_family", "jewelry_guidance", "silhouette_guidance", "contrast_recommendation", "shopping_notes"],
                  additionalProperties: false,
                },
              },
            },
          });
          const diagContent = diagnosticResponse.choices?.[0]?.message?.content;
          const diagnostic = JSON.parse(typeof diagContent === "string" ? diagContent : JSON.stringify(diagContent)) as Record<string, string>;

          // Run step 2: editorial translation
          const editorialResponse = await invokeLLMOpenAI({
            messages: [{ role: "user", content: editorialPrompt(diagnostic) }],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "editorial_brief",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    color_palette: { type: "string" },
                    metals: { type: "string" },
                    fabrics: { type: "string" },
                    makeup: { type: "string" },
                    lighting: { type: "string" },
                    hair: { type: "string" },
                  },
                  required: ["color_palette", "metals", "fabrics", "makeup", "lighting", "hair"],
                  additionalProperties: false,
                },
              },
            },
          });
          const editContent = editorialResponse.choices?.[0]?.message?.content;
          const editorial = JSON.parse(typeof editContent === "string" ? editContent : JSON.stringify(editContent)) as {
            color_palette: string;
            metals: string;
            fabrics: string;
            makeup: string;
            lighting: string;
            hair: string;
          };

          // Save full brief (diagnostic + editorial) to profile
          const briefData = {
            undertone: diagnostic.undertone,
            contrast_level: diagnostic.contrast_level,
            best_metals: diagnostic.best_metals,
            ideal_whites_blacks: diagnostic.ideal_whites_blacks,
            makeup_intensity: diagnostic.makeup_intensity,
            lighting_direction: diagnostic.lighting_direction,
            dominant_feature: diagnostic.dominant_feature,
            fabric_weight: diagnostic.fabric_weight,
            avoid_colors: diagnostic.avoid_colors,
            lipstick_family: diagnostic.lipstick_family,
            jewelry_guidance: diagnostic.jewelry_guidance,
            silhouette_guidance: diagnostic.silhouette_guidance,
            contrast_recommendation: diagnostic.contrast_recommendation,
            shopping_notes: diagnostic.shopping_notes,
            palette: editorial.color_palette,
            metals: editorial.metals,
            fabrics: editorial.fabrics,
            makeup: editorial.makeup,
            lighting: editorial.lighting,
            hair: editorial.hair,
            generatedAt: new Date().toISOString(),
          };

          await updateAestheticBrief(ctx.user.id, briefData).catch(() => { /* non-fatal */ });

          // Generate Identity Brief card (async, non-blocking)
          (async () => {
            try {
              const { getUserGenerations: getGens } = await import("./db");
              const gens = await getGens(ctx.user.id, { limit: 1 });
              const rawHeroUrl = gens[0]?.image_url ?? null;
              // Resolve relative /manus-storage/ paths to full URL for canvas image loading
              const heroUrl = rawHeroUrl
                ? rawHeroUrl.startsWith("http")
                  ? rawHeroUrl
                  : `https://meetha.studio${rawHeroUrl}`
                : null;
              const cardBuffer = await renderIdentityBriefCard(briefData, heroUrl);
              const key = `identity-brief/${ctx.user.id}-${Date.now()}.png`;
              const { url } = await storagePut(key, cardBuffer, "image/png");
              await updateIdentityBriefCardUrl(ctx.user.id, url);
              console.log(`[aestheticRead] Identity Brief card saved: ${url}`);
            } catch (e) {
              console.error("[aestheticRead] Identity Brief card generation failed:", e);
            }
          })();

          // Return combined result for immediate display
          return {
            // Diagnostic fields (shown in structured section)
            undertone: diagnostic.undertone,
            contrast_level: diagnostic.contrast_level,
            best_metals: diagnostic.best_metals,
            ideal_whites_blacks: diagnostic.ideal_whites_blacks,
            makeup_intensity: diagnostic.makeup_intensity,
            lighting_direction: diagnostic.lighting_direction,
            dominant_feature: diagnostic.dominant_feature,
            fabric_weight: diagnostic.fabric_weight,
            avoid_colors: diagnostic.avoid_colors,
            lipstick_family: diagnostic.lipstick_family,
            jewelry_guidance: diagnostic.jewelry_guidance,
            silhouette_guidance: diagnostic.silhouette_guidance,
            contrast_recommendation: diagnostic.contrast_recommendation,
            shopping_notes: diagnostic.shopping_notes,
            // Editorial fields (shown in prose section)
            color_palette: editorial.color_palette,
            metals: editorial.metals,
            fabrics: editorial.fabrics,
            makeup: editorial.makeup,
            lighting: editorial.lighting,
            hair: editorial.hair,
          };
        } catch {
          // Graceful fallback
          return {
            undertone: "Warm golden undertone.",
            contrast_level: "Medium contrast.",
            best_metals: "Warm yellow gold.",
            ideal_whites_blacks: "Off-white and soft black.",
            makeup_intensity: "Medium. Lead with the lip.",
            lighting_direction: "Side lighting from the left, late afternoon.",
            dominant_feature: "Eyes and bone structure.",
            fabric_weight: "Medium weight. Silk, crepe, heavyweight jersey.",
            avoid_colors: "Cool grey, neon yellow, icy lavender.",
            lipstick_family: "Warm berry and brick reds.",
            jewelry_guidance: "Chunky warm gold, stacked. No silver.",
            silhouette_guidance: "Structured shoulders, clean lines, minimal volume.",
            contrast_recommendation: "High contrast works. Pair warm ivory with deep chocolate.",
            shopping_notes: "Always choose the warmer shade. Avoid cool grey undertones. Cashmere and silk over synthetic.",
            color_palette: "Warm ivory, deep camel, amber gold.",
            metals: "Warm yellow gold. Stack bangles or layer chains.",
            fabrics: "Silk, heavyweight jersey, crepe.",
            makeup: "Bold lip in red or deep berry. Strong brow. Minimal eye.",
            lighting: "Late afternoon window, light source to your left or right. Hard directional, not diffused.",
            hair: "Sleek and structured.",
          };
        }
      }),

    /**
     * Soft-deletes (archives) a single generation owned by the current user.
     * Sets archived = true so it disappears from the grid without destroying the row.
     */
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const supabase = getSupabase();
        const { error } = await (supabase as any)
          .from("generations")
          .update({ archived: true, archived_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("user_id", ctx.user.id);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        return { success: true };
      }),

    /**
     * Returns how many times each template (sceneCategory) has been used in the last 7 days.
     * Public procedure - used for social proof counters on the Templates page.
     */
    templateCounts: publicProcedure.query(async () => {
      const supabase = getSupabase();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("generations")
        .select("scene_category")
        .not("scene_category", "is", null)
        .gte("created_at", sevenDaysAgo);
      if (error) return {} as Record<string, number>;
      const counts: Record<string, number> = {};
      for (const row of (data ?? [])) {
        const cat = row.scene_category as string;
        counts[cat] = (counts[cat] ?? 0) + 1;
      }
      return counts;
    }),
  }),

  // ─── Generate ─────────────────────────────────────────────────────────────

  generate: router({
    content: protectedProcedure
      .input(
        z.object({
          platform: z.enum(["tiktok", "reels", "stories"]),
          sceneCategory: z
            .enum([
              "morning_routine",
              "travel_day",
              "quiet_luxury",
              "founder_energy",
              "date_night",
              "paparazzi_flash",
              "digital_diary",
              "bill_please",
              "silk_robe_room_service",
              "irish_goodbye",
              "cleopatra_principle",
              "silk_robe_retaliation",
              "motion_blur",
            ])
            .optional(),
          videoFormat: z.enum(["tiktok_reels", "square", "landscape"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check credits (still image = 1 credit)
        const STILL_COST = 1;
        const userCredits = await ensureCredits(ctx.user.id);
        if (!userCredits || userCredits.credits_remaining < STILL_COST) {
          throw new Error("No credits remaining. Please upgrade to continue.");
        }

        // LoRA paywall: free tier gets exactly 1 LoRA generation, then must upgrade
        const profileForGate = await getProfile(ctx.user.id);
        const wantsLora = profileForGate?.lora_status === "ready" && profileForGate.lora_weights_url;
        if (wantsLora && userCredits.tier === "free" && userCredits.free_lora_used) {
          throw new Error("LORA_PAYWALL");
        }

        // Get profile for archetype + mood
        const profile = await getProfile(ctx.user.id);
        const archetype = profile?.archetype ?? "luxury_minimal";
        const mood = profile?.mood ?? "soft";

        // Generate image via Fal.ai FLUX 1.1 Pro Ultra
        // Pass physical descriptors for base-model path identity anchoring
        const imagePrompt = buildImagePrompt(archetype, mood, input.sceneCategory, profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null, profile?.body_type ?? null, profile?.lora_physical_descriptors ?? null);
        // Map video format to Fal image_size
        const VIDEO_FORMAT_SIZE: Record<string, "portrait_4_3" | "portrait_16_9" | "square_hd" | "landscape_16_9"> = {
          tiktok_reels: "portrait_16_9",
          square: "square_hd",
          landscape: "landscape_16_9",
        };
        const imageSize = input.videoFormat ? VIDEO_FORMAT_SIZE[input.videoFormat] : "portrait_4_3";
        // Use LoRA generation if user has a trained model, otherwise fall back to FLUX Ultra
        let imageUrl: string;
        let imageKey: string;
        let usedLora = false;
        if (profile?.lora_status === "ready" && profile.lora_weights_url && profile.lora_trigger_phrase) {
          try {
            const loraResult = await generateImageWithLora({
              prompt: imagePrompt,
              loraWeightsUrl: profile.lora_weights_url,
              triggerPhrase: profile.lora_trigger_phrase,
              imageSize,
              physicalDescriptors: profile.lora_physical_descriptors ?? null,
            });
            // Save the LoRA-generated image to our storage
            const imageResponse = await fetch(loraResult.url);
            if (!imageResponse.ok) throw new Error(`LoRA image fetch failed: ${imageResponse.status}`);
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            const { storagePut } = await import("./storage");
            const saved = await storagePut(`generated/${Date.now()}.jpg`, imageBuffer, "image/jpeg");
            imageUrl = saved.url;
            imageKey = saved.key;
            usedLora = true;
          } catch (loraErr) {
            // LoRA URL may have expired or changed format -- fall back to FLUX Ultra gracefully
            console.warn("[generate.content] LoRA generation failed, falling back to FLUX Ultra:", loraErr instanceof Error ? loraErr.message : String(loraErr));
            // Rebuild prompt with physical anchor for base model fallback
            const fallbackPrompt = buildImagePrompt(archetype, mood, input.sceneCategory, profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null, profile?.body_type ?? null, profile?.lora_physical_descriptors ?? null);
            const falResult = await generateImageFal({ prompt: fallbackPrompt, imageSize });
            imageUrl = falResult.url;
            imageKey = falResult.key;
          }
        } else {
          const falResult = await generateImageFal({ prompt: imagePrompt, imageSize });
          imageUrl = falResult.url;
          imageKey = falResult.key;
        }
        void usedLora; // suppress unused var warning
        // Generate copy (pass aesthetic descriptors + niche/audience if available)
        const copyPrompt = buildCopyPrompt(archetype, mood, input.platform, profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null, profile?.voice_style ?? null, input.sceneCategory ?? null);
        const copyResponse = await invokeLLMOpenAI({
          messages: [{ role: "user", content: copyPrompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "content_copy",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  hooks: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exactly 3 editorial hook options",
                  },
                  caption: { type: "string", description: "One caption 2-3 sentences" },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exactly 5 hashtags without # symbol",
                  },
                },
                required: ["hooks", "caption", "hashtags"],
                additionalProperties: false,
              },
            },
          },
        });

        let hooks: string[] = [];
        let caption = "";
        let hashtags: string[] = [];

        try {
          const content = copyResponse.choices?.[0]?.message?.content;
          const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
          hooks = parsed.hooks?.slice(0, 3) ?? [];
          caption = parsed.caption ?? "";
          hashtags = parsed.hashtags?.slice(0, 5) ?? [];
                } catch {
          hooks = ["Calm women move differently.", "Luxury is a state of mind.", "Less. Always less."];
          caption = "Curated for the woman who has already arrived.";
          hashtags = ["quietluxury", "editoriallife", "softpower", "luxurylifestyle", "cinematic"];
        }
        // Server-side hook validation: if any hook fails quality check, retry once with a stricter prompt
        if (!hooksAreValid(hooks)) {
          try {
            const retryPrompt = `${copyPrompt}\n\nCRITICAL: The previous response contained banned words or was too long. Every hook MUST be 1-6 plain words. No poetic vocabulary. No abstract nouns. Write exactly like: "she got quieter" or "calm women move differently" or "out past my bedtime". Nothing else is acceptable.`;
            const retryResponse = await invokeLLMOpenAI({
              messages: [{ role: "user", content: retryPrompt }],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "content_copy",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      hooks: { type: "array", items: { type: "string" }, description: "Exactly 3 hooks, 1-6 plain words each" },
                      caption: { type: "string", description: "One caption 1-3 sentences" },
                      hashtags: { type: "array", items: { type: "string" }, description: "Exactly 5 hashtags" },
                    },
                    required: ["hooks", "caption", "hashtags"],
                    additionalProperties: false,
                  },
                },
              },
            });
            const retryContent = retryResponse.choices?.[0]?.message?.content;
            const retryParsed = JSON.parse(typeof retryContent === "string" ? retryContent : JSON.stringify(retryContent));
            if (hooksAreValid(retryParsed.hooks ?? [])) {
              hooks = retryParsed.hooks.slice(0, 3);
              caption = retryParsed.caption ?? caption;
              hashtags = retryParsed.hashtags?.slice(0, 5) ?? hashtags;
            }
          } catch {
            // Retry failed - keep original hooks, they are still usable
          }
        }
        // Deduct 1 credit for still image
        await decrementCredit(ctx.user.id, STILL_COST);

        // Mark free LoRA quota as used after first successful LoRA generation
        if (wantsLora && userCredits.tier === "free" && !userCredits.free_lora_used) {
          const sb = getSupabase() as any;
          await sb.from("credits").update({ free_lora_used: true }).eq("user_id", ctx.user.id);
        }

        // Save generation
        const generation = await createGeneration({
          userId: ctx.user.id,
          imageUrl,
          imageKey,
          archetype,
          mood,
          platform: input.platform,
          sceneCategory: input.sceneCategory ?? null,
          hooks: JSON.stringify(hooks),
          caption,
        });

        const [updatedCredits, generationNumber] = await Promise.all([
          getCredits(ctx.user.id),
          countUserGenerations(ctx.user.id),
        ]);

        // Generate style card in background for every generation
        // Does not block the response -- card_url is stored on the generation record
        void (async () => {
          try {
            const profile = await getProfile(ctx.user.id);
            const { cardUrl, cardKey } = await generateAndSaveStyleCard({
              generationId: generation.id,
              userId: ctx.user.id,
              imageUrl,
              archetype,
              mood,
              sceneCategory: input.sceneCategory ?? null,
              aestheticDescriptors: profile?.aesthetic_descriptors ?? null,
              niche: profile?.niche ?? null,
              hook: hooks[0] ?? null,
            });
            await updateGenerationCardUrl({
              generationId: generation.id,
              cardUrl,
              cardKey,
            });
            // Persist the latest style card URL to the profile so it
            // shows permanently in Profile > "Your Visual Identity"
            await updateTransformationCardUrl(ctx.user.id, cardUrl);
          } catch (err) {
            console.error("[styleCard] background generation failed:", err);
          }
        })();

        return {
          generation,
          generationNumber,
          hooks,
          caption,
          hashtags,
          creditsRemaining: updatedCredits?.credits_remaining ?? 0,
        };
      }),

    /**
     * Voice-to-content: accepts a base64 audio blob, transcribes via Whisper,
     * extracts the emotional core, then generates copy + image from the transcript.
     * Returns the same shape as generate.content so the existing hooks/preview flow works.
     */
    fromVoice: protectedProcedure
      .input(
        z.object({
          audioBase64: z.string(), // base64-encoded audio (webm/mp4/wav)
          mimeType: z.string().default("audio/webm"),
          platform: z.enum(["tiktok", "reels", "stories"]).default("reels"),
          sceneCategory: z
            .enum([
              "morning_routine",
              "travel_day",
              "quiet_luxury",
              "founder_energy",
              "date_night",
              "paparazzi_flash",
              "digital_diary",
              "bill_please",
              "silk_robe_room_service",
              "irish_goodbye",
              "cleopatra_principle",
              "silk_robe_retaliation",
              "motion_blur",
            ])
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check credits (voice-to-content = 1 credit, same as still)
        const VOICE_COST = 1;
        const userCredits = await ensureCredits(ctx.user.id);
        if (!userCredits || userCredits.credits_remaining < VOICE_COST) {
          throw new Error("No credits remaining. Please upgrade to continue.");
        }

        // 1. Upload audio to storage so transcribeAudio can fetch it via URL
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp4") ? "m4a" : "wav";
        const { url: audioStorageUrl } = await storagePut(
          `voice/${ctx.user.id}-${Date.now()}.${ext}`,
          audioBuffer,
          input.mimeType
        );

        // Resolve the storage URL to an absolute URL for the transcription service
        const absoluteAudioUrl = audioStorageUrl.startsWith("/")
          ? `http://localhost:${process.env.PORT ?? 3000}${audioStorageUrl}`
          : audioStorageUrl;

        // 2. Transcribe via Whisper
        const transcriptionResult = await transcribeAudio({
          audioUrl: absoluteAudioUrl,
          language: "en",
          prompt: "Creator talking about their day, a feeling, or a moment they want to share on social media.",
        });

        if ("error" in transcriptionResult) {
          throw new Error(`Transcription failed: ${transcriptionResult.error}`);
        }

        const transcript = transcriptionResult.text.trim();

        // 3. Extract emotional core and scene context from transcript via LLM
        const extractionResponse = await invokeLLMOpenAI({
          messages: [
            {
              role: "system",
              content: `You are a frequency extraction system for a content creation tool. A creator just spoke a thought out loud. Extract the emotional core, the scene or setting implied, and any specific details that should inform the visual and copy.

Return JSON with:
- emotionalCore: the central feeling or truth (1-2 sentences max)
- sceneContext: what environment or moment is implied (1 sentence, or null if unclear)
- keyDetails: array of 2-4 specific words or phrases from their speech that capture the vibe
- suggestedScene: one of [morning_routine, travel_day, quiet_luxury, founder_energy, date_night] or null`,
            },
            {
              role: "user",
              content: `Transcript: "${transcript}"`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "voice_extraction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  emotionalCore: { type: "string" },
                  sceneContext: { type: ["string", "null"] as unknown as "string" },
                  keyDetails: { type: "array", items: { type: "string" } },
                  suggestedScene: { type: ["string", "null"] as unknown as "string" },
                },
                required: ["emotionalCore", "sceneContext", "keyDetails", "suggestedScene"],
                additionalProperties: false,
              },
            },
          },
        });

        let emotionalCore = transcript;
        let suggestedScene: string | null = null;
        let keyDetails: string[] = [];
        try {
          const extracted = JSON.parse(
            typeof extractionResponse.choices?.[0]?.message?.content === "string"
              ? extractionResponse.choices[0].message.content
              : JSON.stringify(extractionResponse.choices?.[0]?.message?.content)
          );
          emotionalCore = extracted.emotionalCore ?? transcript;
          suggestedScene = extracted.suggestedScene ?? null;
          keyDetails = extracted.keyDetails ?? [];
        } catch {
          // fall through with raw transcript
        }

        // 4. Get profile for archetype + mood
        const profile = await getProfile(ctx.user.id);
        const archetype = profile?.archetype ?? "luxury_minimal";
        const mood = profile?.mood ?? "soft";

        // Use suggested scene from voice if no explicit scene was provided
        const effectiveScene = input.sceneCategory ?? suggestedScene ?? null;

        // 5. Build image prompt with voice context injected
        // When voice details are present, build a scene-first prompt that makes the
        // described environment the primary directive, with archetype as the filter.
        let imagePrompt: string;
        if (keyDetails.length > 0) {
          const archetypeStyle = ARCHETYPE_VISUAL[archetype] || "";
          const moodStyle = MOOD_VISUAL[mood] || "";
          const aestheticLayer = profile?.aesthetic_descriptors
            ? `calibrated to this specific aesthetic: ${profile.aesthetic_descriptors},`
            : "warm honey skin tones where hands are visible, gold jewelry details,";
          const nicheLayer = profile?.niche ? `visual world of a ${profile.niche} creator,` : "";
          // Body preservation modifier injected at the front -- strongest signal for identity accuracy
          const bodyPreservationVoice = buildBodyPreservationModifier(profile?.body_type, profile?.lora_physical_descriptors);
          const physicalAnchorVoice = buildPhysicalAnchor(profile?.lora_physical_descriptors ?? null);
          imagePrompt = `${bodyPreservationVoice} ${keyDetails.join(", ")}, ${archetypeStyle}, ${moodStyle}, ${aestheticLayer} ${nicheLayer} ${physicalAnchorVoice} editorial female-gaze luxury aesthetic, cinematic lighting, subtle film grain, realistic textures, warm amber tones, atmospheric depth, no faces, no full bodies, hands only when naturally holding an object, vertical 9:16 framing, social-media-ready, photorealistic, high resolution`;
        } else {
          imagePrompt = buildImagePrompt(archetype, mood, effectiveScene, profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null, profile?.body_type ?? null, profile?.lora_physical_descriptors ?? null);
        }
        // Use LoRA generation if user has a trained model, otherwise fall back to FLUX Ultra
        let imageUrl: string;
        let imageKey: string;
        if (profile?.lora_status === "ready" && profile.lora_weights_url && profile.lora_trigger_phrase) {
          try {
            const loraResult = await generateImageWithLora({
              prompt: imagePrompt,
              loraWeightsUrl: profile.lora_weights_url,
              triggerPhrase: profile.lora_trigger_phrase,
              physicalDescriptors: profile.lora_physical_descriptors ?? null,
            });
            const imageResponse = await fetch(loraResult.url);
            if (!imageResponse.ok) throw new Error(`LoRA image fetch failed: ${imageResponse.status}`);
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            const { storagePut: sp } = await import("./storage");
            const saved = await sp(`generated/${Date.now()}.jpg`, imageBuffer, "image/jpeg");
            imageUrl = saved.url;
            imageKey = saved.key;
          } catch (loraErr) {
            // LoRA URL may have expired or changed format -- fall back to FLUX Ultra gracefully
            console.warn("[generate.voice] LoRA generation failed, falling back to FLUX Ultra:", loraErr instanceof Error ? loraErr.message : String(loraErr));
            const falResult = await generateImageFal({ prompt: imagePrompt });
            imageUrl = falResult.url;
            imageKey = falResult.key;
          }
        } else {
          const falResult = await generateImageFal({ prompt: imagePrompt });
          imageUrl = falResult.url;
          imageKey = falResult.key;
        }

        // 6. Build copy prompt with voice context as additional grounding
        const voiceCopyContext = `\n\nThis creator just said: "${transcript}"\n\nEmotional core extracted: ${emotionalCore}\n\nWrite copy that feels like a distillation of this moment. The hooks and caption should feel like something she would say after this exact thought. Ground the copy in her actual words and feeling, not generic aesthetic language.`;
        const baseCopyPrompt = buildCopyPrompt(archetype, mood, input.platform, profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null, profile?.voice_style ?? null, input.sceneCategory ?? null);
        const voiceCopyPrompt = baseCopyPrompt + voiceCopyContext;

        const copyResponse = await invokeLLMOpenAI({
          messages: [{ role: "user", content: voiceCopyPrompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "content_copy",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  hooks: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exactly 3 editorial hook options",
                  },
                  caption: { type: "string", description: "One caption 2-3 sentences" },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exactly 5 hashtags without # symbol",
                  },
                },
                required: ["hooks", "caption", "hashtags"],
                additionalProperties: false,
              },
            },
          },
        });

        let hooks: string[] = [];
        let caption = "";
        let hashtags: string[] = [];

        try {
          const content = copyResponse.choices?.[0]?.message?.content;
          const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
          hooks = parsed.hooks?.slice(0, 3) ?? [];
          caption = parsed.caption ?? "";
          hashtags = parsed.hashtags?.slice(0, 5) ?? [];
                } catch {
          hooks = ["Calm women move differently.", "Luxury is a state of mind.", "Less. Always less."];
          caption = "Curated for the woman who has already arrived.";
          hashtags = ["quietluxury", "editoriallife", "softpower", "luxurylifestyle", "cinematic"];
        }
        if (!hooksAreValid(hooks)) {
          try {
            const retryPrompt = `${voiceCopyPrompt}\n\nCRITICAL: Every hook MUST be 1-6 plain words. No poetic vocabulary. Write like: "she got quieter" or "out past my bedtime". Nothing else.`;
            const retryRes = await invokeLLMOpenAI({ messages: [{ role: "user", content: retryPrompt }], response_format: { type: "json_schema", json_schema: { name: "content_copy", strict: true, schema: { type: "object", properties: { hooks: { type: "array", items: { type: "string" } }, caption: { type: "string" }, hashtags: { type: "array", items: { type: "string" } } }, required: ["hooks", "caption", "hashtags"], additionalProperties: false } } } });
            const rc = retryRes.choices?.[0]?.message?.content;
            const rp = JSON.parse(typeof rc === "string" ? rc : JSON.stringify(rc));
            if (hooksAreValid(rp.hooks ?? [])) { hooks = rp.hooks.slice(0, 3); caption = rp.caption ?? caption; hashtags = rp.hashtags?.slice(0, 5) ?? hashtags; }
          } catch { /* keep original */ }
        }
        // 7. Deduct 1 credit for voice-to-content
        await decrementCredit(ctx.user.id, VOICE_COST);

        const generation = await createGeneration({
          userId: ctx.user.id,
          imageUrl,
          imageKey,
          archetype,
          mood,
          platform: input.platform,
          sceneCategory: effectiveScene ?? null,
          hooks: JSON.stringify(hooks),
          caption,
        });

        const [updatedCredits, generationNumber] = await Promise.all([
          getCredits(ctx.user.id),
          countUserGenerations(ctx.user.id),
        ]);

        return {
          generation,
          generationNumber,
          hooks,
          caption,
          hashtags,
          creditsRemaining: updatedCredits?.credits_remaining ?? 0,
          transcript, // Return transcript so UI can show what was captured
        };
      }),
  }),

  // ─── Create Studio ──────────────────────────────────────────────────────────

  createStudio: router({
    /**
     * Generate a cinematic styling image from occasion + energy + refinements.
     * Architecturally separate from generate.content (template flow).
     */
    generate: protectedProcedure
      .input(
        z.object({
          occasion: z.enum([
            "rooftop_dinner",
            "private_reservation",
            "airport_lounge",
            "international_arrival",
            "mediterranean_morning",
            "hotel_balcony",
            "beach_club_arrival",
            "coffee_meeting",
            "birthday_dinner",
            "luxury_casual",
            "nyc_winter",
            "pilates_morning",
          ]),
          energy: z.enum([
            "quiet_luxury",
            "soft_power",
            "editorial",
            "magnetic",
            "old_money",
            "minimalist",
            "cinematic",
            "femme_fatale",
            "rich_grandma",
          ]),
          refinements: z.object({
            warmCool: z.enum(["warm", "cool"]).nullable().default(null),
            metalTone: z.enum(["gold", "silver"]).nullable().default(null),
            motionStyle: z.enum(["motion", "static"]).nullable().default(null),
            shootStyle: z.enum(["candid", "editorial"]).nullable().default(null),
            makeupLevel: z.enum(["glam", "natural"]).nullable().default(null),
          }).default(() => ({ warmCool: null, metalTone: null, motionStyle: null, shootStyle: null, makeupLevel: null })),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const STILL_COST = 1;
        const userCredits = await ensureCredits(ctx.user.id);
        if (!userCredits || userCredits.credits_remaining < STILL_COST) {
          throw new Error("No credits remaining. Please upgrade to continue.");
        }
        const profile = await getProfile(ctx.user.id);
        const archetype = profile?.archetype ?? "luxury_minimal";
        const mood = profile?.mood ?? "soft";

        const imagePrompt = buildCreateStudioPrompt(
          input.occasion,
          input.energy,
          input.refinements as any,
          archetype,
          mood,
          profile?.aesthetic_descriptors ?? null,
          profile?.body_type ?? null,
          profile?.lora_physical_descriptors ?? null
        );

        let imageUrl: string;
        let imageKey: string;
        if (profile?.lora_status === "ready" && profile.lora_weights_url && profile.lora_trigger_phrase) {
          try {
            const loraResult = await generateImageWithLora({
              prompt: imagePrompt,
              loraWeightsUrl: profile.lora_weights_url,
              triggerPhrase: profile.lora_trigger_phrase,
              physicalDescriptors: profile.lora_physical_descriptors ?? null,
            });
            const imageResponse = await fetch(loraResult.url);
            if (!imageResponse.ok) throw new Error(`LoRA image fetch failed: ${imageResponse.status}`);
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            const { storagePut: sp } = await import("./storage");
            const saved = await sp(`generated/${Date.now()}.jpg`, imageBuffer, "image/jpeg");
            imageUrl = saved.url;
            imageKey = saved.key;
          } catch (loraErr) {
            console.warn("[createStudio] LoRA failed, falling back to FLUX Ultra:", loraErr instanceof Error ? loraErr.message : String(loraErr));
            const falResult = await generateImageFal({ prompt: imagePrompt });
            imageUrl = falResult.url;
            imageKey = falResult.key;
          }
        } else {
          const falResult = await generateImageFal({ prompt: imagePrompt });
          imageUrl = falResult.url;
          imageKey = falResult.key;
        }

        // Generate copy (hooks + caption + hashtags) — same pipeline as generate.content
        // so the frontend onGenerationSuccess handler receives the same shape.
        const studioSceneLabel = `${input.occasion.replace(/_/g, " ")} ${input.energy.replace(/_/g, " ")}`;
        const studioCopyPrompt = buildCopyPrompt(archetype, mood, "reels", profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null, profile?.voice_style ?? null, studioSceneLabel);
        let hooks: string[] = [];
        let caption = "";
        let hashtags: string[] = [];
        try {
          const copyResponse = await invokeLLMOpenAI({
            messages: [{ role: "user", content: studioCopyPrompt }],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "content_copy",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    hooks: { type: "array", items: { type: "string" }, description: "Exactly 3 editorial hook options" },
                    caption: { type: "string", description: "One caption 2-3 sentences" },
                    hashtags: { type: "array", items: { type: "string" }, description: "Exactly 5 hashtags without # symbol" },
                  },
                  required: ["hooks", "caption", "hashtags"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = copyResponse.choices?.[0]?.message?.content;
          const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
          hooks = parsed.hooks?.slice(0, 3) ?? [];
          caption = parsed.caption ?? "";
          hashtags = parsed.hashtags?.slice(0, 5) ?? [];
        } catch {
          hooks = ["calm women move differently", "she already knew", "out past my bedtime"];
          caption = "She got quieter. Everything else got louder.";
          hashtags = ["quietluxury", "softpower", "editoriallife", "luxurylifestyle", "cinematic"];
        }

        // Deduct credit
        await decrementCredit(ctx.user.id, STILL_COST);

        const gen = await createGeneration({
          userId: ctx.user.id,
          imageUrl,
          imageKey,
          archetype,
          mood,
          platform: "reels",
          sceneCategory: `studio_${input.occasion}_${input.energy}`,
          hooks: JSON.stringify(hooks),
          caption,
        });

        const [updatedCredits, generationNumber] = await Promise.all([
          getCredits(ctx.user.id),
          countUserGenerations(ctx.user.id),
        ]);

        // Generate style card in background
        void (async () => {
          try {
            const { cardUrl, cardKey } = await generateAndSaveStyleCard({
              generationId: gen.id,
              userId: ctx.user.id,
              imageUrl,
              archetype,
              mood,
              sceneCategory: `studio_${input.occasion}_${input.energy}`,
              aestheticDescriptors: profile?.aesthetic_descriptors ?? null,
              niche: profile?.niche ?? null,
              hook: hooks[0] ?? null,
            });
            await updateGenerationCardUrl({ generationId: gen.id, cardUrl, cardKey });
            await updateTransformationCardUrl(ctx.user.id, cardUrl);
          } catch (err) {
            console.error("[createStudio] style card generation failed:", err);
          }
        })();

        return {
          generation: gen,
          generationNumber,
          hooks,
          caption,
          hashtags,
          creditsRemaining: updatedCredits?.credits_remaining ?? 0,
        };
      }),
  }),

  // ─── Signature Scene (viral template, free once) ──────────────────────────

  signatureScene: router({
    /**
     * Check if the user has already used their free "Yes to All" Signature Scene generation.
     */
    status: protectedProcedure.query(async ({ ctx }) => {
      const sb = getSupabase() as any;
      const { data } = await sb
        .from("signature_scene_uses")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("scene_key", "yes_to_all")
        .limit(1);
      return { used: !!(data && data.length > 0) };
    }),

    /**
     * Check if the user has used the second Signature Scene (Quiet Wealth).
     */
    statusTwo: protectedProcedure.query(async ({ ctx }) => {
      const sb = getSupabase() as any;
      const { data } = await sb
        .from("signature_scene_uses")
        .select("id, scene_key")
        .eq("user_id", ctx.user.id)
        .eq("scene_key", "quiet_wealth");
      return { used: !!(data && data.length > 0) };
    }),

    /**
     * Generate the second Signature Scene: Quiet Wealth.
     * Free once per user, no credits deducted.
     */
    generateTwo: protectedProcedure.mutation(async ({ ctx }) => {
      const sb = getSupabase() as any;
      const { data: existing } = await sb
        .from("signature_scene_uses")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("scene_key", "quiet_wealth");

      if (existing && existing.length > 0) {
        throw new Error("You have already used your free Quiet Wealth scene.");
      }

      const profile = await getProfile(ctx.user.id);
      const archetype = profile?.archetype ?? "luxury_minimal";
      const mood = profile?.mood ?? "soft";

      const aestheticLayer = profile?.aesthetic_descriptors
        ? `calibrated to this specific aesthetic: ${profile.aesthetic_descriptors},`
        : "warm honey deep brown skin tones where hands are visible, layered gold jewelry,";
      const archetypeStyle = ARCHETYPE_VISUAL[archetype] || ARCHETYPE_VISUAL.soft_power;

      // Quiet Wealth image: a private moment of ease, not performance
      const quietWealthPrompt = `a woman's hands resting on crisp white linen beside a ceramic espresso cup, a single white peony, a slim leather card holder, morning light through sheer curtains, ${archetypeStyle}, ${MOOD_VISUAL[mood] || MOOD_VISUAL.grounded}, ${aestheticLayer} editorial female-gaze quiet luxury aesthetic, cinematic lighting, cool white and warm cream tones, atmospheric depth, no faces, no full bodies, vertical 9:16 framing, photorealistic, high resolution, the feeling of a woman who does not need to announce anything`;

      const { url: imageUrl, key: imageKey } = await generateImageFal({ prompt: quietWealthPrompt });

      const archetypeVoice = ARCHETYPE_VOICE[archetype] || "";
      const nicheContext = profile?.niche || profile?.audience
        ? `\n\nCreator context: ${profile.niche ? `She creates content about ${profile.niche}.` : ""} ${profile.audience ? `She speaks to ${profile.audience}.` : ""}`
        : "";

      const quietWealthCopyPrompt = `You are writing copy for the Quiet Wealth scene. The image shows a private morning: espresso, white peony, linen, morning light. No performance. No announcement. Just the texture of a life that is already full.

Creator's frequency: "${archetype.replace(/_/g, " ")}" - ${ARCHETYPE_DESCRIPTIONS[archetype as Archetype] || ""}
Current energy: "${mood}" - ${MOOD_DESCRIPTIONS[mood as Mood] || ""}
Voice calibration: ${archetypeVoice}${nicheContext}

Write exactly 3 hooks for text overlay on this image.

Hook rules:
- Under 10 words each
- No em-dashes, no ellipses as pauses, no exclamation marks
- No Pinterest wellness language, no hustle language, no AI constructions
- Sounds like something she would say to herself, not a brand
- Must feel like a woman who does not need to explain herself

Examples of the right frequency:
"luxury is what you remove"
"she wears the same thing twice a week"
"the people who feel the most luxurious are rarely trying"
"outfit repeating is confident"
"some people are building beautiful lives inside nervous systems that never rest"

Then write one caption:
- 1-3 sentences maximum
- No em-dashes
- Reads like a real thought she had this morning
- Ends with a quiet statement, not a CTA

Then write exactly 5 hashtags (no # symbol, niche-specific, editorial).

Respond in this exact JSON format:
{"hooks": ["hook one", "hook two", "hook three"], "caption": "The caption.", "hashtags": ["word1", "word2", "word3", "word4", "word5"]}`;

      const copyResponse = await invokeLLMOpenAI({
        messages: [{ role: "user", content: quietWealthCopyPrompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "content_copy",
            strict: true,
            schema: {
              type: "object",
              properties: {
                hooks: { type: "array", items: { type: "string" } },
                caption: { type: "string" },
                hashtags: { type: "array", items: { type: "string" } },
              },
              required: ["hooks", "caption", "hashtags"],
              additionalProperties: false,
            },
          },
        },
      });

      let hooks: string[] = [];
      let caption = "";
      let hashtags: string[] = [];
      try {
        const content = copyResponse.choices?.[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        hooks = parsed.hooks?.slice(0, 3) ?? [];
        caption = parsed.caption ?? "";
        hashtags = parsed.hashtags?.slice(0, 5) ?? [];
      } catch {
        hooks = ["luxury is what you remove", "she wears the same thing twice a week", "the people who feel the most luxurious are rarely trying"];
        caption = "Some people are building beautiful lives inside nervous systems that never get to rest. Luxury is not always what you add.";
        hashtags = ["quietluxury", "softlife", "luxurylifestyle", "softpower", "capsulewardrobe"];
      }

      // Mark as used with scene_key
      await sb.from("signature_scene_uses").insert({ user_id: ctx.user.id, scene_key: "quiet_wealth" });

      const generation = await createGeneration({
        userId: ctx.user.id,
        imageUrl,
        imageKey,
        archetype,
        mood,
        platform: "reels",
        sceneCategory: "quiet_luxury",
        hooks: JSON.stringify(hooks),
        caption,
      });

      const updatedCredits = await getCredits(ctx.user.id);

      return {
        generation,
        hooks,
        caption,
        hashtags,
        creditsRemaining: updatedCredits?.credits_remaining ?? 0,
        isSignatureScene: true,
      };
    }),

    /**
     * Generate the Signature Scene. Free once per user, no credits deducted.
     * Returns the same shape as generate.content.
     */
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      // Check if already used (scope to yes_to_all scene)
      const sb = getSupabase() as any;
      const { data: existing } = await sb
        .from("signature_scene_uses")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("scene_key", "yes_to_all")
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("You have already used your free Signature Scene generation.");
      }

      const profile = await getProfile(ctx.user.id);
      const archetype = profile?.archetype ?? "luxury_minimal";
      const mood = profile?.mood ?? "soft";

      // Locked Signature Scene image prompt - hand-crafted for maximum impact
      const aestheticLayer = profile?.aesthetic_descriptors
        ? `calibrated to this specific aesthetic: ${profile.aesthetic_descriptors},`
        : "warm honey deep brown skin tones where hands are visible, layered gold jewelry,";
      const archetypeStyle = ARCHETYPE_VISUAL[archetype] || ARCHETYPE_VISUAL.soft_power;

      const signatureImagePrompt = `a woman's hands resting on a marble surface surrounded by intentional objects: a gold pen, an open leather journal, a champagne coupe catching afternoon light, a passport, a folded silk scarf, ${archetypeStyle}, ${MOOD_VISUAL[mood] || MOOD_VISUAL.grounded}, ${aestheticLayer} editorial female-gaze luxury aesthetic, cinematic lighting, subtle film grain, warm amber tones, atmospheric depth, no faces, no full bodies, vertical 9:16 framing, photorealistic, high resolution, the feeling of a woman who has already decided`;

      const { url: imageUrl, key: imageKey } = await generateImageFal({ prompt: signatureImagePrompt });

      // Locked Signature Scene copy prompt
      const archetypeVoice = ARCHETYPE_VOICE[archetype] || "";
      const nicheContext = profile?.niche || profile?.audience
        ? `\n\nCreator context: ${profile.niche ? `She creates content about ${profile.niche}.` : ""} ${profile.audience ? `She speaks to ${profile.audience}.` : ""}`
        : "";

      const signatureCopyPrompt = `You are writing copy for the Signature Scene - a specific, curated moment that represents a woman who has said yes to everything aligned with her. The image shows her world: journal, champagne, passport, gold pen, silk. She has already decided. She is not waiting.

Creator's frequency: "${archetype.replace(/_/g, " ")}" - ${ARCHETYPE_DESCRIPTIONS[archetype as Archetype] || ""}
Current energy: "${mood}" - ${MOOD_DESCRIPTIONS[mood as Mood] || ""}
Voice calibration: ${archetypeVoice}${nicheContext}

Write exactly 3 hooks for text overlay on this image.

Hook rules:
- Under 10 words each
- No em-dashes, no ellipses as pauses, no exclamation marks
- No Pinterest wellness language, no hustle language, no AI constructions
- Sounds like something she would say to herself, not a brand
- Culturally specific and grounded
- Must feel like a woman who has already arrived, not one who is trying

Examples of the right frequency:
"yes to all of it"
"she decided, and then it happened"
"i stopped asking for permission"
"everything i said yes to this year"
"she already knew"

Then write one caption:
- 1-3 sentences maximum
- No em-dashes
- Reads like a real thought she had this morning
- Ends with a quiet statement, not a CTA

Then write exactly 5 hashtags (no # symbol, niche-specific, editorial).

Respond in this exact JSON format:
{"hooks": ["hook one", "hook two", "hook three"], "caption": "The caption.", "hashtags": ["word1", "word2", "word3", "word4", "word5"]}`;

      const copyResponse = await invokeLLMOpenAI({
        messages: [{ role: "user", content: signatureCopyPrompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "content_copy",
            strict: true,
            schema: {
              type: "object",
              properties: {
                hooks: { type: "array", items: { type: "string" } },
                caption: { type: "string" },
                hashtags: { type: "array", items: { type: "string" } },
              },
              required: ["hooks", "caption", "hashtags"],
              additionalProperties: false,
            },
          },
        },
      });

      let hooks: string[] = [];
      let caption = "";
      let hashtags: string[] = [];
      try {
        const content = copyResponse.choices?.[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        hooks = parsed.hooks?.slice(0, 3) ?? [];
        caption = parsed.caption ?? "";
        hashtags = parsed.hashtags?.slice(0, 5) ?? [];
      } catch {
        hooks = ["yes to all of it", "she already knew", "i stopped asking for permission"];
        caption = "The version of me that says yes to everything aligned. She showed up this year.";
        hashtags = ["quietluxury", "editoriallife", "softpower", "yestoall", "sheknew"];
      }

      // Mark as used (no credits deducted)
      await sb.from("signature_scene_uses").insert({ user_id: ctx.user.id, scene_key: "yes_to_all" });

      // Save generation (platform = reels as default for portrait format)
      const generation = await createGeneration({
        userId: ctx.user.id,
        imageUrl,
        imageKey,
        archetype,
        mood,
        platform: "reels",
        sceneCategory: "quiet_luxury",
        hooks: JSON.stringify(hooks),
        caption,
      });

      const updatedCredits = await getCredits(ctx.user.id);

      return {
        generation,
        hooks,
        caption,
        hashtags,
        creditsRemaining: updatedCredits?.credits_remaining ?? 0,
        isSignatureScene: true,
      };
    }),
  }),

  // ─── Video Generation ─────────────────────────────────────────────────────

  video: router({
    /**
     * Animate Me: converts an existing still generation into a 5-second cinematic clip.
     * Available to Starter and Pro tier users. Costs 5 credits.
     */
    animateMe: protectedProcedure
      .input(
        z.object({
          generationId: z.number(),
          imageUrl: z.string(),
          archetype: z.string(),
          mood: z.string(),
          sceneCategory: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ANIMATE_COST = 5;
        const userCredits = await getCredits(ctx.user.id);
        if (!userCredits || userCredits.tier === "free") {
          throw new Error("Animate Me is available on Starter and Pro plans.");
        }
        if (userCredits.credits_remaining < ANIMATE_COST) {
          throw new Error(`Not enough credits. Animate Me costs ${ANIMATE_COST} credits.`);
        }

        // Build a gentle motion prompt
        const motionPrompt = `Slow cinematic camera drift, gentle parallax, soft light shift, luxury lifestyle aesthetic, no people, no faces, editorial film quality, ${input.archetype.replace(/_/g, " ")} aesthetic, ${input.mood} energy${input.sceneCategory ? ", " + input.sceneCategory.replace(/_/g, " ") : ""}`;

        // Resolve relative storage URL to a full public URL for Fal.ai
        let resolvedImageUrl = input.imageUrl;
        if (input.imageUrl.startsWith("/manus-storage/")) {
          const key = input.imageUrl.replace("/manus-storage/", "");
          resolvedImageUrl = await storageGetSignedUrl(key);
        }

        const { url: videoUrl } = await generateVideoFal({
          imageUrl: resolvedImageUrl,
          prompt: motionPrompt,
        });

        // Deduct credits
        await decrementCredit(ctx.user.id, ANIMATE_COST);

        return { videoUrl };
      }),

    generate: protectedProcedure
      .input(
        z.object({
          generationId: z.number(),
          imageUrl: z.string(),
          archetype: z.string(),
          mood: z.string(),
          sceneCategory: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Only Pro tier users can generate video (costs 5 credits)
        const VIDEO_COST = 5;
        const userCredits = await getCredits(ctx.user.id);
        if (!userCredits || userCredits.tier !== "pro") {
          throw new Error("Video generation is available on the Pro plan only.");
        }
        if (userCredits.credits_remaining < VIDEO_COST) {
          throw new Error("Not enough credits for video generation. You need 5 credits.");
        }

        // Build a cinematic motion prompt from archetype + scene
        const motionPrompt = `Slow cinematic camera movement, gentle parallax, subtle zoom in, soft light shift, luxury lifestyle aesthetic, no people, no faces, editorial film quality, ${input.archetype.replace(/_/g, " ")} aesthetic, ${input.mood} energy${input.sceneCategory ? ", " + input.sceneCategory.replace(/_/g, " ") : ""}`;

        // Fal.ai needs a full public URL, not a relative /manus-storage/ path
        let resolvedImageUrl = input.imageUrl;
        if (input.imageUrl.startsWith("/manus-storage/")) {
          const key = input.imageUrl.replace("/manus-storage/", "");
          resolvedImageUrl = await storageGetSignedUrl(key);
        }

        const { url: videoUrl } = await generateVideoFal({
          imageUrl: resolvedImageUrl,
          prompt: motionPrompt,
        });

        // Deduct 5 credits for video generation
        await decrementCredit(ctx.user.id, VIDEO_COST);

        return { videoUrl };
      }),
  }),

  // ─── Aesthetic Upload ───────────────────────────────────────────────────────

  aesthetic: router({
    /** Generate a sample preview image from the user's calibrated aesthetic */
    preview: protectedProcedure
      .mutation(async ({ ctx }) => {
        const profile = await getProfile(ctx.user.id);
        if (!profile) throw new Error("Profile not found");
        const archetype = (profile.archetype as string) || "soft_power";
        const mood = (profile.mood as string) || "grounded";
        const aestheticDescriptors = profile.aesthetic_descriptors ?? null;
        const niche = (profile.niche as string | null) ?? null;
        // Use the default archetype scene as the preview base
        const previewPrompt = buildImagePrompt(archetype, mood, null, aestheticDescriptors, niche, null);
        const result = await generateImageFal({ prompt: previewPrompt });
        // Store preview URL in profile
        await updateAestheticPreviewUrl(ctx.user.id, result.url);
        return { url: result.url };
      }),
    analyzeAndSave: protectedProcedure
      .input(
        z.object({
          // Array of base64-encoded image data URLs (data:image/jpeg;base64,...)
          images: z.array(z.string()).min(1).max(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Upload each base64 image to storage so we can use them as reference images later
        const uploadedUrls: string[] = [];
        for (const dataUrl of input.images) {
          try {
            const base64Match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
            if (base64Match) {
              const mimeType = base64Match[1] as string;
              const base64Data = base64Match[2] as string;
              const buffer = Buffer.from(base64Data, "base64");
              const ext = mimeType.split("/")[1] ?? "jpg";
              const { url } = await storagePut(
                `calibration/${ctx.user.id}/${Date.now()}.${ext}`,
                buffer,
                mimeType
              );
              uploadedUrls.push(url);
            }
          } catch {
            // Non-fatal: if upload fails, continue with remaining images
          }
        }
        // Save uploaded URLs to profile so they can be shown back in the UI
        if (uploadedUrls.length > 0) {
          const sb = getSupabase() as any;
          await sb
            .from("profiles")
            .update({ reference_image_urls: uploadedUrls, updated_at: new Date().toISOString() })
            .eq("user_id", ctx.user.id);
        }
        // Build GPT-4o Vision message with all uploaded images
        const imageContents = input.images.map((dataUrl) => ({
          type: "image_url" as const,
          image_url: { url: dataUrl, detail: "low" as const },
        }));

        const systemPrompt = `You are a frequency calibration system for a content creation tool used by women creators.
Your job is to extract a precise, specific aesthetic profile from the uploaded reference images so that AI-generated content can be tuned to match this creator's exact visual world.

Analyze the images and extract:
- Skin tone (be specific and warm: e.g. "deep warm brown skin with golden undertones", "rich dark brown skin", "warm medium brown", "deep ebony"). This is critical for image generation to match the creator's actual appearance.
- Jewelry and accessory style (e.g. "layered gold chains, gold hoops, warm metal hardware", "minimal silver", "no visible jewelry")
- Texture and material preferences (e.g. "linen, marble, velvet, raw silk", "concrete and leather", "cashmere and glass")
- Color palette and warmth temperature (e.g. "warm amber and ivory throughout", "deep jewel tones with warm shadows", "cool neutral with one warm accent")
- Environment and setting energy (e.g. "warm cream interiors with natural light", "moody dark spaces with candle warmth", "outdoor natural settings with golden hour light")

DO NOT describe faces or full bodies. Focus on skin tone, hands, styling details, objects, environments, textures, and light.
Return a single dense paragraph of 4-6 sentences that can be injected directly into image generation prompts.
Be hyper-specific and visual. No generic phrases. This paragraph will be used word-for-word in AI image prompts, so precision matters.`;

        const visionResponse = await invokeLLMOpenAI({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text" as const, text: "Analyze these reference images and extract the aesthetic calibration profile:" },
                ...imageContents,
              ],
            },
          ],
        });

        const descriptors = visionResponse.choices?.[0]?.message?.content ?? "";

        if (descriptors) {
          await updateAestheticDescriptors(ctx.user.id, descriptors as string);
        }

        return { success: true, descriptors, referenceImageUrls: uploadedUrls };
      }),
  }),

  // ─── Referrals ─────────────────────────────────────────────────────

  referral: router({
    /** Get the user's referral link and stats. */
    getLink: protectedProcedure.query(async ({ ctx }) => {
      const code = await getOrCreateReferralCode(ctx.user.id);
      const referrals = await getReferralsByUser(ctx.user.id);
      const completed = referrals.filter((r) => r.completed).length;
      return { code, completed, total: referrals.length };
    }),

    /** Get the referrer info from a code (used on sign-in page). */
    getReferrer: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const user = await getUserByReferralCode(input.code);
        if (!user) return null;
        return { name: user.name ?? "a friend" };
      }),
  }),

  account: router({
    delete: protectedProcedure
      .mutation(async ({ ctx }) => {
        await deleteUserAccount(ctx.user.id, ctx.user.open_id);
        return { success: true };
      }),
  }),

  feedback: router({
    savePostability: protectedProcedure
      .input(
        z.object({
          generationId: z.number(),
          response: z.enum(["yes", "maybe", "no"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await savePostabilityFeedback({
          userId: ctx.user.id,
          generationId: input.generationId,
          response: input.response,
        });
        return { success: true };
      }),
  }),

  // ─── Admin ────────────────────────────────────────────────────────────────

  admin: router({
    /**
     * List all users with their LoRA status, credit balance, and generation count.
     * Admin only.
     */
    listUsers: adminProcedure.query(async () => {
      const sb = getSupabase() as any;
      const { data: users } = await sb
        .from("users")
        .select("id, email, name, created_at, role")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!users) return [];
      const results = await Promise.all(
        users.map(async (u: any) => {
          const profile = await getProfile(u.id);
          const credits = await getCredits(u.id);
          const genCount = await countUserGenerations(u.id);
          return {
            id: u.id as number,
            email: u.email as string,
            name: (u.name ?? "") as string,
            role: (u.role ?? "user") as string,
            createdAt: u.created_at as string,
            loraStatus: (profile?.lora_status ?? null) as string | null,
            loraWeightsUrl: (profile?.lora_weights_url ?? null) as string | null,
            creditsRemaining: (credits?.credits_remaining ?? 0) as number,
            generationCount: genCount as number,
            archetype: (profile?.archetype ?? null) as string | null,
            mood: (profile?.mood ?? null) as string | null,
          };
        })
      );
      return results;
    }),

    /**
     * Reset a user's LoRA status to null so they can retrain from scratch.
     * Also clears the weights URL and request ID.
     */
    resetLora: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await updateLoraProfile(input.userId, {
          loraStatus: null,
          loraWeightsUrl: null,
          loraTriggerPhrase: null,
          loraTrainingRequestId: null,
          loraPhysicalDescriptors: null,
        });
        return { success: true };
      }),

    /**
     * Adjust a user's credit balance by a delta (positive = add, negative = deduct).
     */
    adjustCredits: adminProcedure
      .input(z.object({ userId: z.number(), delta: z.number() }))
      .mutation(async ({ input }) => {
        const sb = getSupabase() as any;
        const credits = await getCredits(input.userId);
        const current = credits?.credits_remaining ?? 0;
        const newBalance = Math.max(0, current + input.delta);
        await sb
          .from("credits")
          .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", input.userId);
        return { success: true, newBalance };
      }),

    /**
     * Force-regenerate the styling brief for a specific user.
     */
    regenerateBrief: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const profile = await getProfile(input.userId);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "User profile not found" });
        const archetypeVisual = ARCHETYPE_VISUAL[profile.archetype ?? "luxury_minimal"] ?? "";
        const moodVisual = MOOD_VISUAL[profile.mood ?? "soft"] ?? "";
        const calibrationContext = [
          profile.aesthetic_descriptors ? `Calibrated aesthetic: ${profile.aesthetic_descriptors}.` : "",
          profile.lora_physical_descriptors ? `Physical descriptors: ${profile.lora_physical_descriptors}.` : "",
        ].filter(Boolean).join(" ");
        // Step 1: diagnostic
        const diagPrompt = `You are a professional colorist. Analyze this aesthetic profile and produce a precise color diagnostic. Be clinical and specific.\n\nArchetype: ${profile.archetype ?? "luxury_minimal"} (${archetypeVisual})\nMood: ${profile.mood ?? "soft"} (${moodVisual})\n${calibrationContext ? `Context: ${calibrationContext}` : ""}\n\nReturn JSON: { undertone, contrast_level, best_metals, ideal_whites_blacks, makeup_intensity, lighting_direction, dominant_feature, fabric_weight }`;
        const diagRes = await invokeLLMOpenAI({
          messages: [{ role: "user", content: diagPrompt }],
          response_format: { type: "json_schema", json_schema: { name: "diag", strict: true, schema: { type: "object", properties: { undertone: { type: "string" }, contrast_level: { type: "string" }, best_metals: { type: "string" }, ideal_whites_blacks: { type: "string" }, makeup_intensity: { type: "string" }, lighting_direction: { type: "string" }, dominant_feature: { type: "string" }, fabric_weight: { type: "string" } }, required: ["undertone", "contrast_level", "best_metals", "ideal_whites_blacks", "makeup_intensity", "lighting_direction", "dominant_feature", "fabric_weight"], additionalProperties: false } } },
        });
        const diagContent = diagRes.choices?.[0]?.message?.content;
        const diag = JSON.parse(typeof diagContent === "string" ? diagContent : JSON.stringify(diagContent)) as Record<string, string>;
        // Step 2: editorial
        const editPrompt = `You are a Vogue creative director. Translate this color diagnostic into elegant editorial styling language. Short, direct, no wellness language. No satin. Never use em dashes (\u2014) or en dashes (\u2013). Use periods instead.\n\nDiagnostic: ${JSON.stringify(diag)}\n\nReturn JSON: { color_palette, metals, fabrics, makeup, lighting, hair }`;
        const editRes = await invokeLLMOpenAI({
          messages: [{ role: "user", content: editPrompt }],
          response_format: { type: "json_schema", json_schema: { name: "brief", strict: true, schema: { type: "object", properties: { color_palette: { type: "string" }, metals: { type: "string" }, fabrics: { type: "string" }, makeup: { type: "string" }, lighting: { type: "string" }, hair: { type: "string" } }, required: ["color_palette", "metals", "fabrics", "makeup", "lighting", "hair"], additionalProperties: false } } },
        });
        const editContent = editRes.choices?.[0]?.message?.content;
        const edit = JSON.parse(typeof editContent === "string" ? editContent : JSON.stringify(editContent)) as Record<string, string>;
        await updateAestheticBrief(input.userId, {
          undertone: diag.undertone,
          contrast_level: diag.contrast_level,
          best_metals: diag.best_metals,
          ideal_whites_blacks: diag.ideal_whites_blacks,
          makeup_intensity: diag.makeup_intensity,
          lighting_direction: diag.lighting_direction,
          dominant_feature: diag.dominant_feature,
          fabric_weight: diag.fabric_weight,
          palette: edit.color_palette,
          metals: edit.metals,
          fabrics: edit.fabrics,
          makeup: edit.makeup,
          lighting: edit.lighting,
          hair: edit.hair,
          generatedAt: new Date().toISOString(),
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

