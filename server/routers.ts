import { z } from "zod";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut, storageGetSignedUrl } from "./storage";
import { getSupabase } from "./_core/supabase";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLMOpenAI } from "./_core/openaiLLM";
import { generateImageFal } from "./_core/falImageGeneration";
import { generateVideoFal } from "./_core/falVideoGeneration";
import {
  getProfile,
  upsertProfile,
  getUserGenerations,
  createGeneration,
  updateGenerationHook,
  getCredits,
  ensureCredits,
  decrementCredit,
  savePostabilityFeedback,
  updateAestheticDescriptors,
  getOrCreateReferralCode,
  getUserByReferralCode,
  getReferralsByUser,
  deleteUserAccount,
} from "./db";
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
};

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

function buildImagePrompt(
  archetype: string,
  mood: string,
  sceneCategory?: string | null,
  aestheticDescriptors?: string | null,
  niche?: string | null,
  audience?: string | null
): string {
  const scene = sceneCategory
    ? SCENE_PROMPTS[sceneCategory] || (ARCHETYPE_DEFAULT_SCENE[archetype] ?? ARCHETYPE_DEFAULT_SCENE.soft_power)
    : (ARCHETYPE_DEFAULT_SCENE[archetype] ?? ARCHETYPE_DEFAULT_SCENE.soft_power);
  const archetypeStyle = ARCHETYPE_VISUAL[archetype] || "";
  const moodStyle = MOOD_VISUAL[mood] || "";
  const aestheticLayer = aestheticDescriptors
    ? `calibrated to this specific aesthetic: ${aestheticDescriptors},`
    : "warm honey skin tones where hands are visible, gold jewelry details,";

  const nicheLayer = niche ? `visual world of a ${niche} creator,` : "";
  return `${scene}, ${archetypeStyle}, ${moodStyle}, ${aestheticLayer} ${nicheLayer} editorial female-gaze luxury aesthetic, cinematic lighting, subtle film grain, realistic textures, warm amber tones, atmospheric depth, no faces, no full bodies, hands only when naturally holding an object, vertical 9:16 framing, social-media-ready, photorealistic, high resolution`;
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

function buildCopyPrompt(
  archetype: string,
  mood: string,
  platform: string,
  aestheticDescriptors?: string | null,
  niche?: string | null,
  audience?: string | null
): string {
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

  return `You are a content voice for women creators who have a specific, calibrated aesthetic frequency. You write copy that sounds like it came from a real woman who has already arrived, not a brand trying to reach her.

Creator's frequency: "${archetype.replace(/_/g, " ")}" — ${archetypeDesc}
Current energy: "${mood}" — ${moodDesc}
Platform: ${platform.toUpperCase()} — ${platformTone}
Voice calibration: ${archetypeVoice}${frequencyContext}${nicheContext}

Write exactly 3 hook options for text overlay on a cinematic lifestyle image.

Hook rules:
- Under 10 words each
- No em-dashes, no ellipses as pauses, no exclamation marks
- No Pinterest wellness language ("this is your sign", "you deserve", "romanticize your life", "soft life")
- No hustle language ("level up", "boss", "grind", "main character", "that girl")
- No AI constructions ("in a world where", "reminder that", "friendly reminder", "it's giving")
- No generic motivational quotes
- Specific and observational, not aspirational-generic
- Sounds like something she would say to herself, not something a brand would say to her
- Culturally specific and grounded, not racially neutral or whitewashed

Examples of the right frequency:
"the version of me that has time"
"soft is not the same as small"
"i stopped explaining myself and everything changed"
"this is what slow looks like"
"calm women move differently"
"peace changed my face"
"being grounded looks expensive now"
"i don't chase. i attract."
"she already knew"

Then write one caption:
- 1-3 sentences maximum
- No em-dashes
- Reads like a real thought she had this morning, not a content strategy
- Ends with a soft question or a quiet statement, never a hard CTA
- Platform-appropriate (see tone above)
- Specific and grounded, not vague and inspirational

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
        });
      }),
  }),

  // ─── Credits ──────────────────────────────────────────────────────────────

  credits: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return (await ensureCredits(ctx.user.id)) ?? null;
    }),
  }),

  // ─── Generations ──────────────────────────────────────────────────────────

  generations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return (await getUserGenerations(ctx.user.id)) ?? [];
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
            ])
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check credits
        const userCredits = await ensureCredits(ctx.user.id);
        if (!userCredits || userCredits.credits_remaining <= 0) {
          throw new Error("No credits remaining. Please upgrade to continue.");
        }

        // Get profile for archetype + mood
        const profile = await getProfile(ctx.user.id);
        const archetype = profile?.archetype ?? "luxury_minimal";
        const mood = profile?.mood ?? "soft";

        // Generate image via Fal.ai FLUX 1.1 Pro
        const imagePrompt = buildImagePrompt(archetype, mood, input.sceneCategory, profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null);
        const { url: imageUrl, key: imageKey } = await generateImageFal({ prompt: imagePrompt });

        // Generate copy (pass aesthetic descriptors + niche/audience if available)
        const copyPrompt = buildCopyPrompt(archetype, mood, input.platform, profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null);
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

        // Deduct credit
        await decrementCredit(ctx.user.id);

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

        const updatedCredits = await getCredits(ctx.user.id);

        return {
          generation,
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
            ])
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check credits
        const userCredits = await ensureCredits(ctx.user.id);
        if (!userCredits || userCredits.credits_remaining <= 0) {
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
        const voiceImageContext = keyDetails.length > 0
          ? `${profile?.aesthetic_descriptors ? profile.aesthetic_descriptors + ", " : ""}voice-inspired visual context: ${keyDetails.join(", ")}`
          : profile?.aesthetic_descriptors ?? null;
        const imagePrompt = buildImagePrompt(archetype, mood, effectiveScene, voiceImageContext, profile?.niche ?? null, profile?.audience ?? null);
        const { url: imageUrl, key: imageKey } = await generateImageFal({ prompt: imagePrompt });

        // 6. Build copy prompt with voice context as additional grounding
        const voiceCopyContext = `\n\nThis creator just said: "${transcript}"\n\nEmotional core extracted: ${emotionalCore}\n\nWrite copy that feels like a distillation of this moment. The hooks and caption should feel like something she would say after this exact thought. Ground the copy in her actual words and feeling, not generic aesthetic language.`;
        const baseCopyPrompt = buildCopyPrompt(archetype, mood, input.platform, profile?.aesthetic_descriptors ?? null, profile?.niche ?? null, profile?.audience ?? null);
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

        // 7. Deduct credit and save generation
        await decrementCredit(ctx.user.id);

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

        const updatedCredits = await getCredits(ctx.user.id);

        return {
          generation,
          hooks,
          caption,
          hashtags,
          creditsRemaining: updatedCredits?.credits_remaining ?? 0,
          transcript, // Return transcript so UI can show what was captured
        };
      }),
  }),

  // ─── Signature Scene (viral template, free once) ──────────────────────────

  signatureScene: router({
    /**
     * Check if the user has already used their free Signature Scene generation.
     */
    status: protectedProcedure.query(async ({ ctx }) => {
      const sb = getSupabase() as any;
      const { data } = await sb
        .from("signature_scene_uses")
        .select("id")
        .eq("user_id", ctx.user.id)
        .single();
      return { used: !!data };
    }),

    /**
     * Generate the Signature Scene. Free once per user, no credits deducted.
     * Returns the same shape as generate.content.
     */
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      // Check if already used
      const sb = getSupabase() as any;
      const { data: existing } = await sb
        .from("signature_scene_uses")
        .select("id")
        .eq("user_id", ctx.user.id)
        .single();

      if (existing) {
        throw new Error("You have already used your free Signature Scene generation.");
      }

      const profile = await getProfile(ctx.user.id);
      const archetype = profile?.archetype ?? "luxury_minimal";
      const mood = profile?.mood ?? "soft";

      // Locked Signature Scene image prompt — hand-crafted for maximum impact
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

      const signatureCopyPrompt = `You are writing copy for the Signature Scene — a specific, curated moment that represents a woman who has said yes to everything aligned with her. The image shows her world: journal, champagne, passport, gold pen, silk. She has already decided. She is not waiting.

Creator's frequency: "${archetype.replace(/_/g, " ")}" — ${ARCHETYPE_DESCRIPTIONS[archetype as Archetype] || ""}
Current energy: "${mood}" — ${MOOD_DESCRIPTIONS[mood as Mood] || ""}
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
      await sb.from("signature_scene_uses").insert({ user_id: ctx.user.id });

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

  // ─── Video Generation (Pro tier) ───────────────────────────────────────────

  video: router({
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
        // Only Pro tier users can generate video
        const userCredits = await getCredits(ctx.user.id);
        if (!userCredits || userCredits.tier !== "pro") {
          throw new Error("Video generation is available on the Pro plan only.");
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

        return { videoUrl };
      }),
  }),

  // ─── Aesthetic Upload ───────────────────────────────────────────────────────

  aesthetic: router({
    analyzeAndSave: protectedProcedure
      .input(
        z.object({
          // Array of base64-encoded image data URLs (data:image/jpeg;base64,...)
          images: z.array(z.string()).min(1).max(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
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

        return { success: true, descriptors };
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
});

export type AppRouter = typeof appRouter;
