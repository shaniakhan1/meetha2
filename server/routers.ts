import { z } from "zod";
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
    "hands wrapped around a ceramic coffee cup, soft morning light streaming through sheer curtains, steam rising, warm golden tones",
  travel_day:
    "a luxury carry-on suitcase wheel rolling on marble airport floor, soft bokeh, editorial travel aesthetic",
  quiet_luxury:
    "silk fabric draped over a velvet chair, afternoon light, architectural shadow, minimal luxury interior",
  founder_energy:
    "a leather notebook open on a marble desk, gold pen, morning light, clean workspace, editorial focus",
  date_night:
    "champagne flute close-up, soft candlelight, velvet table setting, warm amber tones, cinematic blur",
};

const ARCHETYPE_VISUAL: Record<string, string> = {
  luxury_minimal:
    "ultra-clean composition, extreme negative space, cream and ivory tones, architectural precision, restrained elegance",
  elegant_chaos:
    "layered textures, bold contrast, silk and leather, unexpected juxtapositions, editorial tension",
  soft_power:
    "warm diffused light, soft focus, intimate framing, emotional warmth, inviting depth",
  dark_feminine:
    "deep shadows, rich jewel tones, moody atmosphere, mysterious depth, dramatic chiaroscuro lighting",
  ethereal:
    "gossamer light, translucent fabrics, soft lens flare, dreamlike softness, pastel luminosity",
};

const MOOD_VISUAL: Record<string, string> = {
  soft: "gentle bokeh, warm natural light, soft shadows, intimate scale, tender atmosphere",
  magnetic:
    "strong visual pull, confident framing, rich saturation, commanding composition",
  grounded:
    "earthy tones, stable horizon, natural textures, calm and unhurried pacing",
  untamed:
    "dynamic movement, windswept textures, raw natural beauty, unrestrained energy",
};

function buildImagePrompt(
  archetype: string,
  mood: string,
  sceneCategory?: string | null
): string {
  const scene = sceneCategory
    ? SCENE_PROMPTS[sceneCategory] || "luxury lifestyle detail, close-up, editorial"
    : "perfume bottle on marble vanity, soft light, editorial still life";
  const archetypeStyle = ARCHETYPE_VISUAL[archetype] || "";
  const moodStyle = MOOD_VISUAL[mood] || "";

  return `${scene}, ${archetypeStyle}, ${moodStyle}, editorial female-gaze luxury aesthetic, cinematic lighting, subtle film grain, soft natural movement, realistic textures, elegant minimal composition, warm tones, atmospheric detail, no faces, no people, no bodies, no hands unless holding an object, vertical 9:16 framing, social-media-ready, high resolution`;
}

const PLATFORM_TONE: Record<string, string> = {
  tiktok: "TikTok-native: conversational, identity-led, first-person or second-person, feels like something a real woman would type not a brand. Short sentences. Direct.",
  reels: "Instagram Reels: slightly more polished than TikTok but still personal and emotionally observational. Feels curated but not corporate.",
  stories: "Instagram Stories: intimate, present-tense, like a thought you had this morning. Ultra-short. One breath.",
};

const ARCHETYPE_VOICE: Record<string, string> = {
  luxury_minimal: "Voice is restrained, precise, and quietly confident. Never tries too hard. Silence is part of the message.",
  elegant_chaos: "Voice has tension — beautiful contradictions, unexpected word pairings. Feels alive and slightly unpredictable.",
  soft_power: "Voice is warm but knowing. Emotionally intelligent. Feels like someone who sees you.",
  dark_feminine: "Voice is low, deliberate, and unhurried. Mystery without explanation. Never justifies itself.",
  ethereal: "Voice is dreamy and sensory. Evokes texture, light, and feeling more than logic.",
};

function buildCopyPrompt(
  archetype: string,
  mood: string,
  platform: string,
  aestheticDescriptors?: string | null
): string {
  const archetypeDesc = ARCHETYPE_DESCRIPTIONS[archetype as Archetype] || "";
  const moodDesc = MOOD_DESCRIPTIONS[mood as Mood] || "";
  const platformTone = PLATFORM_TONE[platform] || PLATFORM_TONE.reels;
  const archetypeVoice = ARCHETYPE_VOICE[archetype] || "";
  const aestheticContext = aestheticDescriptors
    ? `\n\nUser's personal aesthetic calibration (from their uploaded reference images): ${aestheticDescriptors}. Let this subtly inform the emotional specificity of the copy.`
    : "";

  return `You are a social content writer for women creators with strong personal aesthetics. You write copy that feels like it came from a real woman, not a brand or an AI.

The creator's aesthetic identity: "${archetype.replace(/_/g, " ")}" — ${archetypeDesc}
Her current energy: "${mood}" — ${moodDesc}
Platform: ${platform.toUpperCase()} — ${platformTone}
Voice direction: ${archetypeVoice}${aestheticContext}

Write exactly 3 hook options for text overlay on a cinematic lifestyle image. Rules:
- Each hook is under 10 words
- No em-dashes, no ellipses used as pauses, no exclamation marks
- No Pinterest wellness phrases ("this is your sign", "you deserve", "romanticize your life")
- No hustle language ("level up", "boss", "grind", "main character")
- No AI-sounding constructions ("in a world where", "reminder that", "friendly reminder")
- No generic motivational quotes
- Identity-based, not aspirational-generic. Feels like something SHE would say, not something a brand would say to her.
- Calm, specific, emotionally observational

Good examples of the right tone:
"the version of me that has time"
"soft is not the same as small"
"i stopped explaining myself and everything changed"
"this is what slow looks like"
"she moves at her own pace and it shows"

Then write one caption. Rules:
- 1-3 sentences maximum
- No em-dashes
- Conversational but considered. Feels like a real thought, not a content strategy.
- Ends with either a soft question or a quiet statement, never a hard CTA like "link in bio" or "shop now"
- Platform-appropriate tone (see above)

Then write exactly 5 hashtags. Rules:
- No # symbol
- Mix of niche-specific and broader reach
- No generic tags like "instagood" or "photooftheday"
- Should feel like tags a real creator in this aesthetic would use

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
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertProfile({
          userId: ctx.user.id,
          archetype: input.archetype ?? "luxury_minimal",
          mood: input.mood ?? "soft",
          onboardingComplete: input.onboardingComplete ?? false,
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
        const imagePrompt = buildImagePrompt(archetype, mood, input.sceneCategory);
        const { url: imageUrl, key: imageKey } = await generateImageFal({ prompt: imagePrompt });

        // Generate copy (pass aesthetic descriptors if available)
        const copyPrompt = buildCopyPrompt(archetype, mood, input.platform, profile?.aesthetic_descriptors ?? null);
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

        const { url: videoUrl } = await generateVideoFal({
          imageUrl: input.imageUrl,
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

        const systemPrompt = `You are an aesthetic calibration system for a luxury content creation app.
Analyze the uploaded reference images and extract a concise aesthetic profile.
Focus ONLY on:
- Skin tone warmth (e.g. "warm honey undertones", "cool porcelain", "deep warm brown")
- Jewelry and accessory style (e.g. "gold hardware", "minimal silver", "layered gold chains", "no visible jewelry")
- Texture preferences (e.g. "linen and marble", "velvet and silk", "raw concrete and leather")
- Environment/setting palette (e.g. "warm cream interiors", "moody dark spaces", "bright minimal white")
- Overall warmth temperature (e.g. "warm golden tones throughout", "cool neutral palette", "high contrast warm/dark")

DO NOT describe faces, bodies, or people. Focus on objects, environments, textures, and styling cues.
Return a single concise paragraph of 3-5 sentences that can be injected into image generation prompts.
Be specific and visual. No generic phrases.`;

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
