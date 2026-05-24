import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLMOpenAI } from "./_core/openaiLLM";
import { generateImageFal } from "./_core/falImageGeneration";
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

function buildCopyPrompt(
  archetype: string,
  mood: string,
  platform: string
): string {
  const archetypeDesc = ARCHETYPE_DESCRIPTIONS[archetype as Archetype] || "";
  const moodDesc = MOOD_DESCRIPTIONS[mood as Mood] || "";

  return `You are an editorial content writer for premium women's personal brands.

The user has the "${archetype.replace("_", " ")}" aesthetic (${archetypeDesc}) with a "${mood}" tone (${moodDesc}), posting on ${platform}.

Write exactly 3 short viral hook options for text overlay. Each hook must be under 12 words. No hashtags. No emojis. No exclamation marks. No hustle culture language. No corporate copy. No generic motivational quotes. Editorial tone only. Calm confidence, luxury, identity-signaling, emotionally intelligent.

Then write one caption of 2-3 sentences maximum with a soft call to action.

Then write exactly 5 relevant hashtags (no # symbol needed, just the words).

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

        // Generate copy
        const copyPrompt = buildCopyPrompt(archetype, mood, input.platform);
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

  // ─── Feedback ─────────────────────────────────────────────────────────────

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
