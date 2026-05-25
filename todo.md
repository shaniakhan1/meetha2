# Meetha MVP TODO

## Phase 1: Schema & Design System
- [x] Global design system: CSS variables, typography, warm palette (Cormorant Garamond + Inter)
- [x] Database schema: profiles, generations, credits, postability_feedback
- [x] DB migration applied

## Phase 2: Backend
- [x] DB helpers: profiles, generations, credits, feedback
- [x] tRPC router: profile (get/upsert)
- [x] tRPC router: generate (image + hooks/caption)
- [x] tRPC router: generations (list, save, selectHook)
- [x] tRPC router: credits (get, decrement, ensureCredits)
- [x] tRPC router: feedback (save postability response)

## Phase 3: Landing Page & Auth
- [x] Landing page hero: "Cinematic social content without filming."
- [x] Landing page archetype teaser section
- [x] Landing page pricing/CTA section ($0 free / $19 Starter / $39 Pro)
- [x] Auth-protected routes (generation, dashboard, onboarding, profile)
- [x] Post-login redirect logic (onboarding if new, dashboard if returning)

## Phase 4: Onboarding Flow
- [x] Archetype selection screen (Luxury Minimal, Elegant Chaos, Soft Power, Dark Feminine, Ethereal)
- [x] Mood selection screen (Soft, Magnetic, Grounded, Untamed)
- [x] Aesthetic intelligence insight display after archetype selection
- [x] Save archetype + mood to profile
- [x] Onboarding runs once, skipped if already complete

## Phase 5: Generation Screen
- [x] Platform selector (TikTok, Reels, Stories)
- [x] Scene category selector (Morning Routine, Travel Day, Quiet Luxury, Founder Energy, Date Night)
- [x] No open text input anywhere in generation flow
- [x] AI image generation (vertical, faceless, archetype+mood+scene prompt recipes)
- [x] AI hook generation (exactly 3 editorial hooks)
- [x] AI caption generation (1 caption + hashtags)
- [x] Hook selection UI
- [x] Regenerate button
- [x] Credit deduction on generation

## Phase 6: Export & History
- [x] Image preview with selected hook overlay
- [x] Download button (saves to device)
- [x] Copy caption + hashtags button
- [x] Re-download option from history grid
- [x] Postability prompt: "Would you post this?" (Yes / Maybe / No)
- [x] Store postability feedback
- [x] History dashboard: grid layout (not list/feed)
- [x] History item: thumbnail, hook overlay, platform badge, expand on tap

## Phase 7: Profile & Credits
- [x] Profile page: editable archetype + mood
- [x] Credits display in dashboard (progress bar)
- [x] Free tier: 5 generations
- [x] Stripe payment links: Starter $19/mo, Pro $39/mo
- [x] Credit gate: block generation when 0 credits remain, show upgrade prompt

## Phase 8: Polish & Tests
- [x] Mobile-first responsive layout throughout (max-w-480px container)
- [x] Warm luxury typography (serif headlines, clean sans body)
- [x] Full-screen hero moments on landing page
- [x] TypeScript: zero errors
- [x] Vitest: all tests passing (auth + stripe env)
- [x] Error states and loading skeletons

## V2 Features

- [x] Dev preview mode — bypass auth, credits, and Stripe for owner testing
- [x] Caption + hook LLM prompt rewrite — social-native voice, no em-dashes, no wellness clichés
- [x] Hook overlay rendered directly on image preview (TikTok/Reels safe zone typography)
- [x] Animated cinematic preview — CSS Ken Burns zoom, parallax, film grain
- [x] Baseline aesthetic upload — 3-5 reference images, GPT-4o Vision descriptor extraction, injected into prompts
- [x] Fal.ai real video generation for Pro tier (Kling v1.6)
- [x] Referral credit mechanic — invite a friend, both get 3 extra generations
  - [x] DB helpers: getOrCreateReferralCode, createReferral, completeReferral, getReferralsByUser
  - [x] tRPC: referral.getLink (protected), referral.getReferrer (public)
  - [x] Dashboard: referral card with copy link + completion count
  - [x] SignIn: referral banner, store ref code in sessionStorage
  - [x] Auth: completeReferral called on session exchange (awards 3 credits to both parties)
  - [x] Magic link flow: POST /api/auth/magic-link accepts referral_code, creates pending referral row
- [x] Updated tier structure: Free=stills only, Starter=stills+animated, Pro=stills+animated+real video

## V3 Features

- [x] Watermark on free-tier downloads — lowercase "meetha" serif, bottom-right, semi-transparent white; removed on Starter+
- [x] Resend email integration — wire magic link delivery via Resend transactional email
- [x] Frequency language rebrand — archetypes renamed to frequency states, moods to energy states, onboarding copy rewritten
- [x] Image prompt rewrite — skin tone aware, frequency-calibrated, aesthetic descriptors injected, sharper scene prompts
- [x] Copy prompt rewrite — frequency voice system, RGE-inspired hook examples, anti-generic rules, culturally grounded
- [x] Aesthetic calibration system prompt rewrite — explicitly extracts skin tone, gold jewelry, warmth, environment for injection into image prompts
- [x] Landing page rewrite — broad pain-point-led copy, frequency language, output example section, not niche-specific

## V4 Features

- [x] Remove all Khanundrum Studios references (landing page, footer, nav eyebrow)
- [x] Voice-to-content: tap to record, Whisper transcription, generate post from spoken thought
- [x] Platform labels renamed to format names (Feed Post, Portrait, Stories) in shared/types.ts, CinematicPreview.tsx, and Home.tsx
- [x] Baseline calibration re-upload: calibration section added to Profile page, archetype-aware default scenes replace perfume bottle fallback
- [x] Privacy Policy page (/privacy)
- [x] Terms of Service page (/terms)
- [x] Account deletion flow in Profile settings with tRPC procedure
- [x] Cookie/data notice banner on first visit — built
- [x] Footer legal links on landing page and inside app
- [x] SEO: meta title, description, Open Graph tags in index.html
- [x] sitemap.xml served at /sitemap.xml
- [x] robots.txt allowing all crawlers

## V5 Features

- [x] Google OAuth sign-in via Supabase (add to SignIn page alongside magic link)
- [x] Onboarding: add niche + audience screen (content type + who you speak to)
- [x] Save niche + audience to profiles table (schema migration in Supabase)
- [x] Inject niche + audience into image and copy prompts
- [x] Signature Scene viral template: featured card on generate screen, locked prompt recipe, free-once mechanic

## Deferred / Future

- [x] Cookie/data notice banner on first visit (built: slides up after 1.2s, localStorage persist, accept/decline, links to Privacy Policy)
- [x] End-to-end verification of calibration re-upload with skin-tone-aware extraction (manual QA — requires real photos, deferred to user testing)

## V6 Features

- [x] Aesthetic preview in Profile: generate a sample image from calibrated aesthetic + archetype + mood, with refresh button

## V7 Features

- [x] Video format selector: when Animated Video selected, swap FORMAT to TikTok/Reels (9:16), Square (1:1), Landscape (16:9) options; generate source image at correct aspect ratio

## V8 Features

- [x] Voice-to-scene grounding: voice transcript becomes primary visual directive, archetype becomes filter/tone
- [x] Reference image conditioning: pass user's calibration photo to Fal as subject anchor so generated images look like the actual user
- [x] Store calibration photo URLs in profiles.reference_image_urls for reuse in generation

## V8 Follow-up (requires Supabase migration — user action required)

- [x] Run Supabase migration: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reference_image_urls JSONB (delivered to user as SQL to run)
- [x] Existing calibrated users must recalibrate to get reference_image_urls populated (user must recalibrate in Profile after migration)

## V9 Features

- [x] FLUX Pro 1.1 Ultra upgrade (switch model ID in falImageGeneration.ts)
- [x] Watermark fix: paid users no watermark by default; free users watermark; paid users get optional "Share with Meetha badge" toggle in Profile
- [x] Caption/hook copy prompt rewrite: short declarative sentences, observational contrast, no over-explanation, user's actual voice calibration
- [x] Weighted credit system: 1 credit = still image, 5 credits = video; update credit deduction logic
- [ ] Credit top-up modal: when credits hit zero, show clean top-up prompt (not hard wall)
- [x] Simplified one-tap generate: zero-decision default path, Customize toggle for advanced options (scene, format, video vs still)
- [x] Kling Animate Me mode: Animate Me button on preview converts still to 5-sec Kling clip (Starter+, 5 credits)
- [ ] Voice calibration questions in onboarding: 3 quick questions about how user talks online (casual/polished, funny/serious, short/storytelling)
- [x] New Signature Scene: "Quiet Wealth" — private morning, espresso, white peony, linen, free once
- [x] Revert reference image conditioning (remove flux-pro/v1.1/redux, restore clean faceless FLUX generation)
