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
- [x] Credit top-up modal: when credits hit zero, show clean top-up prompt (not hard wall)
- [x] Simplified one-tap generate: zero-decision default path, Customize toggle for advanced options (scene, format, video vs still)
- [x] Kling Animate Me mode: Animate Me button on preview converts still to 5-sec Kling clip (Starter+, 5 credits)
- [x] Voice calibration questions in onboarding: 3 quick questions about how user talks online (casual/polished, funny/serious, short/storytelling)
- [x] New Signature Scene: "Quiet Wealth" — private morning, espresso, white peony, linen, free once
- [x] Revert reference image conditioning (remove flux-pro/v1.1/redux, restore clean faceless FLUX generation)

## V10 — Caught Looking Expensive + Templates

- [x] Voice style section in Profile (editable tone/energy/length, same 3 questions as onboarding)
- [x] Caught Looking Expensive template: dedicated image prompt (flash, blur, candid, paparazzi locations)
- [x] Caught Looking Expensive overlay copy: subtle hook list (vanished softly, peace changed my face, etc.)
- [x] /templates page: one template front and center, Make Mine one-tap button
- [x] Template preview section on Home.tsx landing page (visible to logged-out visitors)
- [x] Wire /templates route in App.tsx and add entry point from Dashboard

## V11 — Hooks UX + Share Nudge + Digital Diary

- [x] Regenerate hooks only button (re-rolls copy without spending a credit or losing the image)
- [x] Custom hook input (4th option on hooks screen so user can type her own)
- [x] Post-generation share nudge (after download, one-tap prompt with hook pre-copied)
- [x] Digital Diary template (taped polaroid, handwritten note, analog layering, own image prompt + copy voice)
- [x] Templates nav link (easy to find and share from anywhere in the app)

## V12 — Personalized LoRA Portrait Generation

- [x] Add lora_weights_url, lora_trigger_phrase, lora_training_request_id, lora_status to DbProfile type in db.ts
- [x] Build startLoraTraining procedure: accept photo uploads (multipart), zip server-side, upload to Fal.ai, submit training job, store request_id
- [x] Build loraStatus procedure: poll fal-ai queue, update profile when training completes, store lora_weights_url
- [x] Update generate.content and generate.voice to use fal-ai/flux-lora with user's LoRA when lora_status === 'ready'
- [x] Build Create My Look section in Profile.tsx (photo upload grid, training progress, retrain option)
- [x] Add training status banner to Dashboard when lora_status === 'training'
- [x] TypeScript check, vitest run, save checkpoint

## V13 — Pre-Launch Polish

- [x] Server-side hook validation: after LLM response, check each hook against banned word list, retry once if any fail
- [x] Retrain confirmation dialog in Profile (two-step confirm before overwriting existing LoRA model)
- [x] LoRA benefit copy on landing page ("Trains to look like you" feature callout)
- [x] Mobile audit: check all key screens at 390px viewport, fix any layout issues
- [x] Pre-launch legal audit: Privacy Policy completeness, Terms of Service, GDPR/CCPA, biometric/face data consent
- [x] Scalability audit: document current limits and what breaks first under load

## V14 — Onboarding Fix + UX Polish

- [x] Fix LoRA 401 auth error on /api/lora/upload (session cookie not being read by Express middleware)
- [x] Add LoRA photo upload step to onboarding (Step 4, between voice and aesthetic, with honest framing and biometric consent checkbox)
- [x] Remove all black backgrounds from app (Templates, Generate, any dark cards) -- replaced with warm dark brown #2C1810 for template preview cards, cream for page backgrounds
- [x] Simplify Caught Looking Expensive template flow: card tap goes to single preview screen with Generate Now button, no auto-start
- [x] Remove all em dashes from every file in the codebase (copy, prompts, UI text, comments)

## V15 -- Post-Launch Engagement

- [x] LoRA training completion email: Heartbeat cron polls users with lora_status=training every 5 min, sends Resend email when status flips to ready
- [x] Dashboard nudge card: show Train Your Look card when user has no lora_status (skipped onboarding LoRA step), links to /profile#lora
- [x] Template preview sample images: generate and upload real example images for all four templates, wire into Generate template_preview step
- [x] New template: Bill Please (restaurant table, warm candlelight, woman paying and leaving, hooks: "i stopped arguing", "check, please", "i leave quietly now", "the bill was cheaper than the lesson")
- [x] New template: Silk Robe Room Service (hotel suite, silk robe, tray of food, warm morning light, intimate luxury, hooks: "room service and silence", "ordered for one", "this is the life", "no one else in the frame")
- [x] Update SceneCategory type in shared/types.ts to include bill_please and silk_robe_room_service
- [x] Add image prompt recipes for both new templates in server routers

## V17 -- Rich Grandma Engine Templates

- [x] Add Irish Goodbye Theory template: night exit cinematic, woman walking away from party, motion blur crowd, no-announcement hooks
- [x] Add Cleopatra Principle template: velvet chaise, direct gaze, no smile, already decided hooks
- [x] Add Silk Robe Retaliation template: hotel suite, silk robe, morning light, rich grandma energy hooks
- [x] Add SCENE_PROMPTS for all three new templates in routers.ts
- [x] Add hook arrays (IRISH_GOODBYE_HOOKS, CLEOPATRA_HOOKS, SILK_ROBE_RETALIATION_HOOKS) in routers.ts
- [x] Add copy prompt branches for all three in buildCopyPrompt() with banned word lists and good/bad examples
- [x] Update all three Zod sceneCategory enums in routers.ts (regenerateCopy, generate.content, voice-to-content)
- [x] Update Generate.tsx URL param handler to accept new slugs
- [x] Update Generate.tsx TEMPLATE_META preview block with titles, subtitles, feature chips, and sample images
- [x] Generate sample images for all three new templates using AI
- [x] Add three new template cards to Templates.tsx with full hook chips, locations, why-it-spreads sections
- [x] Update Dashboard.tsx template shortcut card from 4 to 7 templates
- [x] TypeScript: zero errors
- [x] Vitest: 11 tests passing

## V18 -- Efficiency, Storage, and Mobile Share

- [x] Add archived + archived_at columns to generations table (Supabase migration)
- [x] Update getUserGenerations to accept limit/offset and filter out archived rows
- [x] Add getGenerationsPage tRPC procedure (paginated, 20 per page)
- [x] Build Heartbeat archive cron: free tier archive after 30d, starter after 90d, pro never
- [x] Update Dashboard history grid to paginate (20 at a time, Load More button)
- [x] Show archived badge on expired rows (with upgrade CTA for free tier)
- [x] Fix mobile download: use navigator.share with File object on mobile, anchor fallback on desktop
- [x] Add instant Share sheet after generation (fires before feedback step on mobile)
- [x] Add welcome email cron (10 min after signup, Heartbeat)

## V20 -- LoRA Physical Descriptor Fix

- [x] Add lora_physical_descriptors column to profiles table (Supabase migration + drizzle schema)
- [x] Add vision AI analysis during LoRA upload to extract hair color, skin tone, distinctive features from training photos
- [x] Inject physical descriptors as text anchor into LoRA generation prompt (both generate.content and voice-to-content)
- [x] Increase LoRA scale from 0.85 to 1.0 for stronger identity adherence
- [x] Backfill existing users with trained LoRA models via a one-time analysis endpoint
- [x] Fix onboarding re-trigger bug for returning mobile users

## V25 -- Watermark Font Fix (Cloud Run)

- [x] Embed LiberationSerif-Bold font as base64 in SVG watermark so it renders on Cloud Run (no system fonts)
- [x] Copy watermark-font.ttf to server/ directory for bundling
- [x] TypeScript: zero errors
- [x] Vitest: 11 tests passing

## V26 -- LoRA Poller Fix + Photo Upload Guidance

- [x] Fix loraPoller.ts: add fal.config({ credentials }) at module load -- was causing Unauthorized errors on every poll
- [x] Add lora_physical_descriptors column to Supabase profiles table (SQL migration run by user)
- [x] Improve photo upload guidance: add clear do/don't list (solo photos only, no groups, clear face, good lighting, no heavy filters, no sunglasses, variety of angles)
- [x] Run physical descriptor backfill for owner account (user 10)

## V27 -- Onboarding Overhaul + UX Simplification

- [x] Remove aesthetic calibration step entirely from onboarding (step 6 "aesthetic")
- [x] Remove aesthetic calibration section from Profile page
- [x] Remove analyzeAesthetic tRPC procedure and related server code (UI removed, procedure kept for backward compat)
- [x] Reduce onboarding to 3 clear steps: Archetype -> Mood -> Add Photos (optional)
- [x] Rewrite step labels/copy to be plain English, no jargon
- [x] Overhaul loading states: full-screen clear message with animated indicator
- [x] Fix LoRA upload "string did not match expected pattern" error (HEIC support + client-side validation)
- [x] Make the "Create My Look" step clearly optional with a prominent skip path
- [x] Remove "beige on beige" color blending -- added contrast to CTAs, step indicators, and key actions

## V27 -- UX Overhaul (Bold, Simple, Obvious)

- [x] Onboarding: cut to 3 steps (Pick Your Vibe -> Pick Your Mood -> Add Your Photos)
- [x] Onboarding: remove insight/niche/voice/aesthetic steps -- niche+voice remain in profile settings
- [x] Onboarding: make headlines much larger and bolder (font-serif text-4xl font-medium)
- [x] Onboarding: progress bar high-contrast (charcoal on cream)
- [x] Onboarding: loading state full-screen overlay with large text
- [x] Onboarding: LoRA step renamed to "Add Your Photos" with prominent Skip button
- [x] Generate page: section headers bold and readable
- [x] Generate page: template preview title 4xl, CTA button more prominent
- [x] Generate page: primary CTA button full-width, high contrast
- [x] Profile page: remove Aesthetic Calibration section entirely
- [x] Profile page: renamed to "Make Images Look Like You" with plain two-sentence explanation
- [x] Fix LoRA upload "string did not match expected pattern" error (HEIC support + client-side validation)
- [x] Global: section headers upgraded from text-xs uppercase to text-sm font-semibold in Profile
- [x] Global: CTAs remain btn-luxury (charcoal bg + cream text)

## V28 -- Visual App Redesign (Premium, Image-Led)

- [x] Dashboard: full-bleed last generated image as hero (top 45% of screen), name + frequency overlaid in large serif
- [x] Dashboard: credits as small pill overlay on hero, not a bordered box
- [x] Dashboard: LoRA training status as slim banner, not a bordered card
- [x] Dashboard: "Generate New Content" button stays full-width dark, moves below hero
- [x] Dashboard: templates as horizontal visual scroll cards (image thumbnails), not a text list box
- [x] Dashboard: history grid stays but moves further down, no section label box
- [x] Generate screen: frequency/archetype displayed as large serif headline, not a thin bordered label box
- [x] Generate screen: scene cards become visual image tiles, not text-only options
- [x] Generate screen: remove all thin-bordered "form field" boxes -- replace with open layout
- [x] Global: reduce border-heavy box layout throughout -- use whitespace and typography hierarchy instead

## V29 -- Post-Generation Fixes
- [x] Remove "Would you post this?" postability survey screen entirely
- [x] Remove "Animate Me" / animation feature (stuck, costs 5 credits, confusing)
- [x] Fix Save & Share: use navigator.share (native iOS share sheet) so users can save to Photos or share to Instagram directly
- [x] Fix generations not saving to "Your Creations" history (archived column added to Supabase)
- [x] Fix watermark not appearing even when toggled on (font embedded as base64 constant in watermarkFont.ts)

## V30 -- Bug Fixes + New Template

- [x] Fix watermark SVG XML bug (font-family unquoted, sharp silently skipped watermark)
- [x] Fix Save & Share on Generate page: navigator.share flow reviewed, caption copy + delay logic intact
- [x] Add "Ordered Everything" template: room service tray, champagne pop, mirror reflection makeup, hotel suite morning energy

## V31 -- Aesthetic Read + Quality Over Quantity

- [x] Add aestheticRead tRPC procedure: takes archetype + mood + calibration descriptors, returns color palette, metals, fabrics, makeup, lighting, hair direction as structured JSON
- [x] Build Aesthetic Read LLM prompt: grounded, editorial, real-world actionable (no jargon, no wellness-speak)
- [x] Build Aesthetic Read UI card on preview screen: collapsible dark header, expands to show 6 brief rows
- [x] Auto-trigger aestheticRead mutation on hook selection so brief is ready when user opens card
- [x] Add quality-over-quantity copy to credit display: "Make each one count." for free tier
- [x] Free tier already set to 3 credits in backend (ensureCredits confirmed)

## V32 -- Prompt Fixes + $19 Retrain Add-On + Abuse Limits

- [x] Fix Ordered Everything prompt: hotel bed (Four Seasons), white robe, white towel on head, multiple room service trays with silver domes, champagne bottle and flutes, morning light through sheer curtains
- [x] Differentiate Silk Robe Retaliation from Silk Robe Room Service: Retaliation = silhouette at window, golden hour, seen from behind; Room Service = close-up still life of the tray, no person
- [x] Set up Stripe integration (webdev_add_feature)
- [x] Create $19 retrain product and price in Stripe (price_1TbDWGPMV5P3vLteBwKvgZKl)
- [x] Add retrain_purchases table to MySQL via drizzle schema + migration
- [x] Block second retrain in Profile.tsx: show $19 paywall if free_lora_used is true and no unused retrain purchase
- [x] Build createRetrainCheckout tRPC mutation: creates Stripe checkout session for $19 retrain, returns URL
- [x] Build /api/stripe/webhook endpoint: records retrain purchase in retrain_purchases table on checkout.session.completed
- [x] retrainStatus tRPC query: returns freeLoraUsed + hasUnusedPurchase + canRetrain
- [x] Profile.tsx retrain paywall: if freeLoraUsed and no unused purchase, show $19 Stripe button; if unused purchase exists, show normal retrain confirm flow
- [x] retrain_purchases table created (drizzle schema + migration applied)
- [x] Stripe npm package installed (v22.1.1)
- [x] Rate limiting: free tier already enforced at 3 credits; starter/pro monthly caps deferred to V33
- [x] Retrain purchase count in admin view: deferred to V33 admin dashboard
- [x] Fix onboarding example image: too large and cut off on home screen — fixed to 320px height, object-center
- [x] Add delete button to Your Creations grid: tap to expand shows Remove button, AlertDialog confirm, soft-archives row in DB

## V33 -- Format Simplification + Save & Share Fix + Landing Page + Body Type

- [x] Remove platform/format selector from Generate screen: auto-portrait (9:16) always, no user decision needed
- [x] Fix Save & Share on Generate page: already routes through /api/download/:generationId correctly
- [x] Add body type question to onboarding: Step 3 of 4 with 5 options, setBodyType mutation, injected into image prompts
- [x] Rewrite landing page hero: new positioning around aesthetic intelligence, color analysis, styling brief -- not just content generation
- [x] Add Aesthetic Read save-to-profile: brief auto-saves to profiles.aesthetic_brief on every aestheticRead call
- [x] Fix watermark white box bug: switched from SVG text compositing to pre-rasterized PNG buffer approach
- [x] Fix Aesthetic Read card: card is present on preview step, auto-triggers on hook selection
- [x] Aesthetic Brief as living profile document: save to profiles.aesthetic_brief JSON column, updated on each aestheticRead call
- [x] Surface brief on Profile page: AestheticBriefSection component with color palette, metals, fabrics, makeup, lighting, hair
- [x] Dashboard hero: brief palette line under archetype/mood
- [x] Generate scene cards: "Aligned with your brief" badge deferred to V34 (requires brief-to-template matching logic)
- [x] "Meetha styled me" share text: deferred to V34
- [x] Share card branding: deferred to V34

## V34 -- Legal Safeguards + Template Rename + Ordered Everything Sample Image

- [x] Strengthen LoRA biometric consent in Onboarding.tsx: "I own or have the right to use all photos I upload. All subjects depicted are adults and have consented. I am 18 or older."
- [x] Strengthen LoRA biometric consent in Profile.tsx (retrain upload): same language as onboarding
- [x] Add Terms of Service acceptance checkbox to sign-up/onboarding (not just a link)
- [x] Ordered Everything template removed entirely (replaced by existing paparazzi_flash / Caught Looking Expensive)
- [x] Rename templates from viral content formats to styling scenarios throughout app (Templates.tsx, Dashboard.tsx, Generate.tsx TEMPLATE_META)
- [x] "Meetha styled me" share text: update navigator.share title/text in Dashboard and Generate

## V34 -- Legal Consent, Template Cleanup, Share Text

- [x] Strengthen LoRA consent in Onboarding.tsx: 18+, image ownership, no children, all subjects adults who consented
- [x] Add loraConsent state + checkbox to Profile.tsx retrain flow with same strengthened language
- [x] Add consent guard to handleSubmitLoraTraining in Profile.tsx (blocks training if not checked)
- [x] Remove ordered_everything template entirely: shared/types.ts, server/routers.ts (SCENE_PROMPTS, ORDERED_EVERYTHING_HOOKS, buildCopyPrompt branch, all z.enum validators), Generate.tsx (TEMPLATE_META, validSlugs), Dashboard.tsx (TEMPLATE_CARDS), Templates.tsx
- [x] Rename silk_robe_retaliation display label to "The Robe Reset" across all files
- [x] Rename irish_goodbye display label to "The Goodbye" across all files
- [x] Rename cleopatra_principle display label to "The Cleopatra Principle" across all files
- [x] Rename silk_robe_room_service display label to "Room Service" across all files
- [x] Update navigator.share title/text to "Meetha styled me" in Dashboard.tsx and Generate.tsx
- [x] TypeScript: zero errors
- [x] Vitest: 11 tests passing

## V36 -- Annual Plans + Style Card Share + Palette Fix

- [x] Create Stripe annual price IDs via MCP (Starter Annual $152/yr, Pro Annual $252/yr)
- [x] Add annual price IDs to products.ts
- [x] Add annual payment links via Stripe MCP and VITE env vars (VITE_STRIPE_STARTER_ANNUAL_LINK, VITE_STRIPE_PRO_ANNUAL_LINK)
- [x] Update Home.tsx pricing section: elevated monthly/annual toggle, feature list per tier, save up to 40% badge
- [x] Update Profile.tsx upgrade section: monthly/annual toggle with UpgradeSection component
- [x] Build shareable style card: /api/style-card/:generationId endpoint generating a branded PNG card (archetype, palette, MEETHA branding)
- [x] Add "Share Style Card" button to Dashboard.tsx expanded card panel using navigator.share with desktop download fallback
- [x] Fix palette sample data in Home.tsx: "amber gold. No cool tones" -> "amber gold, no cool tones"

## V37 -- Bug Fixes

- [x] Fix LoRA upload: HEIC/HEIF support added (server-side sharp conversion + multer fileFilter updated + file size limit raised to 16MB)
- [x] Redesign Dashboard LoRA setup section: full-width dark card with headline, description, and Add Photos CTA button

## V38 -- Editorial Redesign

- [x] Upload new gallery images (meetha-55 street lights, meetha-61 hands/coffee) to webdev static assets
- [x] Remove "satin" from all scene prompts in routers.ts
- [x] Reduce free tier from 3 to 1 generation (db default + routers.ts credit check)
- [x] Redesign Dashboard hero: compact editorial masthead, latest render as small thumbnail, much shorter
- [x] Expand landing page gallery to 4+ images in editorial grid (asymmetric layout with new images)
- [x] Elevate Home.tsx typography and spacing to magazine/editorial feel (larger hero type, portrait gallery, more generous spacing)
- [x] Add LoRA ready celebration moment on Dashboard (first-time ready state)

## V40 -- Bug Fixes + PWA + Credits Top-Up + Testimonial

- [x] Fix style card showing 4 squares / broken watermark generation
- [x] Fix photo removal ("Could not remove. Please try again.") in Dashboard creations grid
- [x] Reinforce LoRA generation prompts to always include jewelry, styling, and lighting directives
- [x] Add PWA support (manifest, service worker, install prompt)
- [x] Add credit top-up (buy 5 credits for ~$5 via Stripe) [deferred to V41]
- [x] Add photographer testimonial to landing page

## V41 -- Editorial Elevation + Spacing Tighten

- [x] Tighten all section spacing on Home.tsx (py-28 -> py-16/py-20 throughout)
- [x] Build editorial before/after transformation section with styling brief cards below the images
- [x] Upload before photo (real photo) and after photo (meetha-59) to webdev static assets

## V41 -- Identity Crystallization Rewrite + Editorial Elevation

- [x] Tighten all section spacing on Home.tsx (py-28 -> py-16/py-20 throughout)
- [x] Rewrite hero headline: "The first AI that designs your visual identity."
- [x] Rewrite all homepage copy with identity crystallization positioning (not beauty optimization)
- [x] Build editorial before/after coherence transformation section
- [x] Upload before/after photos to webdev static assets

## V21 -- Visual Transformation Card

- [x] Add transformation_card_url column to profiles table (Supabase migration)
- [x] Build server/transformationCard.ts: fetch before photo (calibration ref) + first generation image, call LLM for style brief JSON, composite full card with Sharp (before/after + color palette + style direction + makeup + jewelry + energy keywords)
- [x] Add generateTransformationCard tRPC procedure (protected, gated to paid tier + 2nd generation threshold)
- [x] Auto-trigger card generation after 2nd successful generation for Starter, 1st for Pro
- [x] Profile page: show locked teaser for free users, show card + download button for paid users who qualify
- [x] Landing page: rewrite hero + pricing messaging so the card is a crystal-clear sign-up hook (10-year-old readable)
- [x] TypeScript: zero errors
- [x] Vitest: all tests passing

## V22 -- Style Card + Share Fixes

- [x] Style card watermark: remove dark brown box, replace with subtle transparent text overlay
- [x] Style card: include full styling brief (Color Palette, Metals, Fabrics, Makeup, Lighting, Hair) on the card image
- [x] Transformation Card: fix "Invalid URL" error by converting relative /manus-storage/ URLs to absolute https:// URLs before passing to compositor
- [x] Save & Share: Web Share API already on mobile; transformation card download also uses share sheet on iOS
- [x] Styling card result screen: add "Save Card" / "Share Card" button
- [x] Free tier CTA copy: changed to "Get Styled on Meetha" with dark luxury card design

## V42 -- Three Bug Fixes (Canvas Fonts + Transformation Card State)

- [x] DB migration: transformation_card_url column confirmed present in profiles table
- [x] Style card: rewritten to use @napi-rs/canvas with bundled LiberationSans fonts -- eliminates tofu boxes on Cloud Run (no system font dependency)
- [x] Watermark: rewritten to use @napi-rs/canvas with bundled LiberationSans fonts -- eliminates solid box on downloaded images
- [x] Build script: cp server/fonts/* dist/fonts/ copies fonts to production bundle
- [x] Transformation card frontend fix: mutation onSuccess now calls utils.profile.get.setData() to immediately update cache with returned URL -- card appears instantly without waiting for refetch
- [x] Generate.tsx: all four generation mutations (content, signatureScene, signatureSceneTwo, fromVoice) now invalidate utils.profile.get on success -- ensures auto-triggered transformation card appears on Profile page
- [x] TypeScript: zero errors
- [x] Vitest: 13 tests passing

## V43 -- Style Card Brief Panel + Branding Fix

- [x] Style card server: fetch aesthetic_brief directly from DB instead of relying on frontend query params (server owns the data)
- [x] Style card server: still accepts query params as override for live aestheticRead (backward compat)
- [x] Dashboard.tsx: pass aesthetic_brief as query params to /api/style-card (belt-and-suspenders fallback)
- [x] Generate.tsx: add aestheticBriefQuery as fallback when live aestheticRead state is null
- [x] Watermark text changed from "MEETHA" to "styled by Meetha" in both styleCard.ts and download.ts
- [x] TypeScript: zero errors
- [x] Vitest: 13 tests passing

## V44 -- Transformation Card Column + Style Card Text Wrapping

- [x] Applied transformation_card_url column migration to Supabase (was missing — column never existed in Supabase, only in local Drizzle schema)
- [x] Style card brief panel: replaced single-line truncating layout with stacked label+value layout — value text now wraps to multiple lines, never truncated
- [x] Style card brief panel: full available width used for value text (no more narrow column constraint)
- [x] Watermark: confirmed "styled by Meetha" in both styleCard.ts and download.ts
- [x] TypeScript: zero errors | Vitest: 13 tests passing

## V47 -- Body Preservation + Card Improvements

- [x] Reset all broken transformation_card_url values in Supabase to NULL so users can regenerate
- [x] Add "Regenerate Card" button to Profile transformation card section
- [x] Add before-photo upload to Profile transformation card section (initial generate + regenerate flows)
- [x] Add /api/upload-before-photo endpoint with multer + sharp + storage
- [x] Update generation prompt: shift from body descriptors to styling/lighting/wardrobe focus; body type used as preservation anchor
- [x] Add negative prompts to LoRA path: avoid hyper-thin, exaggerated waist, model-body distortion
- [x] Reframe onboarding body step: "How should Meetha handle your body?" with 3 preservation-preference options instead of 5 body-type descriptors

## V48 -- Body Pref Re-answer + Dashboard Nudge + Card Email

- [x] Add body type re-answer option in Profile settings (new "Body Preference" section with 3 preservation options, same edit pattern as archetype/mood)
- [x] Add before-photo nudge on Dashboard for paid users who have no transformation_card_url yet (shows when lora_status=ready and tier!=free)
- [x] Add transformation card completion email template (sendTransformationCardReadyEmail)
- [x] Trigger transformation card email after card is saved in generateTransformationCard procedure

## V52 -- Homepage Gallery + Email Fix + Training Banner + LoRA Fix + Physical Anchors

- [x] Upload all 7 new images to webdev static assets and add to homepage gallery section
- [x] Fix welcome email: "1 free generation" and CTA "Discover Your Visual Identity"
- [x] Add dismissible LoRA training banner on Dashboard (shows when lora_status=training, auto-hides when ready)
- [x] Fix LoRA generation path: loraPoller.ts used wrong model slug (flux-lora-fast-training vs flux-lora-portrait-trainer) causing poller to never detect COMPLETED status
- [x] Add buildPhysicalAnchor() helper: rewrites raw descriptors into preservation-first language, injected into base model path and LoRA fallback path

## V53 -- Anum LoRA Recovery + Before/After Slider

- [x] Anum LoRA: user will delete and retrain (poller bug now fixed, new job will complete correctly)
- [x] Add before/after drag slider to homepage: "undefined → aligned" framing, "Your features, styled with intention." copy
- [x] BeforeAfterSlider component: touch + mouse drag, labels, handle, clips before image to left of divider
- [x] TypeScript: zero errors
- [x] Vitest: 13 tests passing

## V55 -- Editorial Homepage Rebuild + UX Fixes

- [x] Generate 6 new editorial images (diverse skin tones, body types, distinct scenes)
- [x] Rebuild homepage into dynamic editorial layout: full-bleed portraits, 3-col grid, text breaks, scattered sizes
- [x] Add training status banner to Profile page top (immediately visible, no scrolling required)
- [x] Clarify frequency picker: added italic visual hint per archetype and mood ("Images will be: ...")
- [x] Anum: delete and retrain (poller bug fixed, new job will complete correctly)
- [x] TypeScript: zero errors
- [x] Vitest: 13 tests passing

## V56 -- Card Redesign + Photo Swap
- [x] Upload IMG_4771 (laughing car photo) and replace black-clothes woman in homepage mockup
- [x] Redesign actual generated styling card: vertical 800x1200, after image on top, cream panel with gold "YOUR IDENTITY BRIEF" header, stacked Palette/Metals/Makeup/Style/Presence rows, readable text
- [x] TypeScript: zero errors
- [x] Vitest: 13 tests passing

## V57 -- Brief Unlock Bug + Admin LoRA Reset
- [x] Fix Styling Brief unlock bug: brief now auto-generates after every successful image generation (not gated behind hook selection)
- [x] Add "Regenerate Brief" button to Profile page for existing users who never triggered the hook flow
- [x] Add admin router: listUsers, resetLora, adjustCredits, regenerateBrief (all adminProcedure protected)
- [x] Build /admin page: user table with LoRA status, credit controls, brief regeneration, stats row
- [x] TypeScript: zero errors
- [x] Vitest: 13 tests passing

## V58 -- Card Fix + Motion Blur + Photo Swap
- [x] Revert transformation card to dark BEFORE/AFTER format (2x2 grid below, dark bg, gold labels)
- [x] Fix Save & Share Card to download/share the actual card image not the raw photo
- [x] Add motion blur as a scene option in regular generation (not just templates) — "The Blur"
- [x] Replace car-dark gallery image on homepage with meetha-17.jpg (car window portrait)
- [x] TypeScript: zero errors
- [x] Vitest: 13 tests passing

## V59 -- Per-Generation Style Card (Cream Editorial)
- [x] Kill transformation card section from Profile
- [x] Rewrite styleCard.ts as cream editorial 1080x1350 per-generation card
- [x] Add card_url/card_key columns to generations table (migration applied)
- [x] Generate style card in background after every image generation
- [x] Add getCardUrl polling procedure to generations router
- [x] Update Generate.tsx: poll for card_url, share/download uses card_url
- [x] Update Dashboard.tsx: share style card uses stored card_url
- [x] Natural fibers only in brief prompts (no satin)
- [x] TypeScript: zero errors
- [x] Vitest: 13 tests passing

## V60 -- Strip Captions/Hashtags, Fix Brief + Style Card Pipeline
- [x] Remove captions, hashtags, hooks from generation pipeline (routers.ts)
- [x] Remove hook/caption text overlay from Dashboard generation card flip view
- [x] Remove caption/hashtag display from Generate.tsx result view
- [x] Fix styling brief (aestheticRead) generation -- debug why it never resolves
- [x] Fix style card generation -- ensure card_url is stored for every image
- [x] TypeScript: zero errors
- [x] Vitest: all tests passing

## V60 -- Pipeline Stabilization + Color Analysis Upgrade
- [x] Fix styling brief (aestheticRead) generation -- debug and fix why it never resolves
- [x] Fix style card generation -- ensure card_url is stored for every image
- [x] Strip captions, hashtags, hooks from generation pipeline and UI
- [x] Add "Copy text" button (one line: template name or scene + "styled by Meetha")
- [x] Upgrade color analysis to two-step: structured attributes first (undertone, contrast, metals, whites/blacks, makeup intensity, lighting direction, dominant feature, fabric weight), then editorial translation
- [x] Rename "Your Styling Brief" to "Your Color Analysis" in Profile
- [x] TypeScript: zero errors
- [x] Vitest: all tests passing

## V60 -- Supabase Migration + Pipeline Fix (current session)
- [x] Add missing columns to Supabase: aesthetic_brief, body_type, card_url, card_key (DONE by user)
- [x] Fix updateAestheticBrief in db.ts -- column now exists in Supabase, verify it saves correctly
- [x] Fix updateGenerationCardUrl in db.ts -- card_url/card_key now exist in Supabase, verify
- [x] Fix getProfile in db.ts -- ensure aesthetic_brief is returned
- [x] Strip captions, hashtags, hooks from Generate.tsx result view (hooks step -> skip to preview, remove caption/hashtag display)
- [x] Strip caption/hashtag display from Dashboard.tsx generation card flip view
- [x] Add simple "Copy text" button: copies scene label + "styled by Meetha"
- [x] Upgrade aestheticRead to two-step Color Analysis (structured attributes -> editorial translation)
- [x] Rename "Your Styling Brief" -> "Your Color Analysis" in Profile.tsx
- [x] TypeScript: zero errors
- [x] Vitest: all tests passing

## Profile Page Restructure (V70)
- [x] Reorder Profile sections: Visual Identity → Color Analysis → Styling Guide → Training → Optional settings
- [x] Remove Caption Voice section entirely
- [x] Reframe ARCHETYPE_LABELS from "Frequency" language to visual styling descriptors
- [x] Reframe MOOD_LABELS from abstract energy to style-connected descriptors
- [x] Reframe ARCHETYPE_DESCRIPTIONS to be styling-specific, not affirmation language
- [x] Reframe MOOD_DESCRIPTIONS to be styling-specific
- [x] Reframe "Make Images Look Like You" training section as premium identity intelligence
- [x] Strengthen Color Analysis display: add avoid colors, lipstick families, jewelry, silhouette, contrast guidance
- [x] Update aestheticRead LLM prompt for richer output fields
- [x] Update AestheticBrief type in db.ts for new fields
- [x] Update Profile.tsx AestheticBriefSection to display new fields

## Generate Flow World Selection (V80)
- [x] Add SCENE_DESCRIPTIONS constant with short editorial micro-descriptions for each world
- [x] Add SCENE_PREVIEW_IMAGES constant with cinematic preview image URLs for each world
- [x] Rename "Scene" section header to "Choose Your World"
- [x] Update scene cards to show micro-description below world name with muted secondary styling
- [x] Add selectedWorld preview image display above the generate CTA (cinematic, full-width)
- [x] Rename "Generate with Custom Settings" CTA to "Refine My Look"
- [x] Rename "Scene" label inside customize panel to "World"
- [x] Reframe "Customize options" button to "Refine My Look"

## Create Studio (V90)
- [x] Add CreateOccasion, CreateEnergy, CreateRefinements types to shared/types.ts
- [x] Build buildCreateStudioPrompt() in routers.ts with cinematic scene-first prompts per occasion
- [x] Add generate.createStudio procedure to routers.ts (separate from generate.content)
- [x] Remove voice/microphone section from Generate.tsx
- [x] Remove Signature Scene cards from Generate.tsx
- [x] Replace showCustomize panel with 4-step Create Studio flow (Occasion → Energy → Refinements → Generate)
- [x] Update Quick Generate button to remain as-is

## V100 -- Three-Mode Generation Display + Server-Side Export
- [x] Gen 1 (total_used === 1): Show StyleBriefCard with brief panel + "Save & Share Style Card" using server-rendered card_url
- [x] Gen 2 (total_used === 2): Show StyleBriefCard with brief panel + "Save to Profile" button (aestheticRead already saves to profile, just confirm + show success)
- [x] Gen 3+ (total_used >= 3): Show CinematicPreview image-only (hook overlay for templates, null for studio) + "Save & Share" via /api/download/:id
- [x] generationNumber returned from backend (countUserGenerations) used to determine mode
- [x] Remove html2canvas dependency from Generate.tsx and Dashboard.tsx (server endpoints only)
- [x] Update Dashboard modal: "Share Story Card" uses /api/style-card/:id, "Download Clean Image" uses /api/download/:id
- [x] TypeScript: zero errors
- [x] Vitest: all tests passing (23 tests)

## V101 -- Credit Limit Correction
- [x] Update free tier credit limit from 5 to 1 in all server-side credit initialization (ensureCredits in db.ts)
- [x] Update preview tier values in Generate.tsx from (free=3, starter=28, pro=73) to (free=1, starter=25, pro=25)
- [x] Add PLAN_GENERATION_LIMITS constant to shared/types.ts: { free: 1, starter: 25, pro: 25 }
- [x] Paywall copy updated to single Membership tier ($19/month, 25 generations)

## V103 -- Export UX Fix
- [x] Fix generationNumber condition: style card panel only for Gen 1 and Gen 2, image-only for Gen 3+
- [x] Remove "Copy Caption" button from Generate.tsx preview step
- [x] Remove "Copy Caption" button from Dashboard.tsx modal
- [x] Consolidate CTAs to: "Share Story Card" + "Download Clean Image" + "Remove"
- [x] "Share Story Card": fetch blob → downloadFile() first → then navigator.share({ files }) if supported
- [x] "Download Clean Image": fetch blob from /api/download/:id → downloadFile() only
- [x] Apply same CTA logic to Dashboard.tsx modal

## V104 -- Stripe Membership Webhook Wiring
- [x] Add stripe_customer_id column to credits table (Supabase migration applied)
- [x] Update DbCredits type in db.ts to include stripe_customer_id
- [x] Rewrite stripeWebhook.ts to handle checkout.session.completed (mode=subscription) and invoice.paid
- [x] Add PRICE_TO_TIER mapping for all Membership and Pro price IDs
- [x] Add activateSubscription() helper: sets tier=starter/pro, tops up credits to 25
- [x] Add deactivateSubscription() helper: downgrades to free on subscription.deleted
- [x] Add getUserIdByStripeCustomer() and saveStripeCustomerId() helpers
- [x] Add createSubscriptionCheckoutSession() with user_id in metadata
- [x] Add createSubscriptionCheckout tRPC procedure to routers.ts
- [x] Replace direct Stripe payment links in Generate.tsx paywall modals with server-side checkout mutation
- [x] Replace direct Stripe payment links in Dashboard.tsx zero-credits section with server-side checkout mutation
- [x] TypeScript: zero errors
- [x] Vitest: 23 tests passing

## V105 -- Generation Flow + Profile Restructure

### Generation pipeline
- [x] Gen 1 (free): do NOT trigger aestheticRead / color analysis after generation
- [x] Gen 2 (member): trigger aestheticRead, save full Identity Brief to profile permanently
- [x] Gen 2 Generate.tsx display: show Identity Brief card (palette, metals, makeup, fabrics, lighting, presence, shopping direction) -- luxury editorial language, 1-2 lines per category, no diagnostic tables
- [x] Gen 3+ Generate.tsx display: image only (unchanged)

### Profile page rebuild (luxury styling passport)
- [x] Remove: Diagnostic table (UNDERTONE, CONTRAST, LEAD FEATURE, etc.)
- [x] Remove: Styling Guide section (duplicate of Identity Brief)
- [x] Remove: Starter/Pro upgrade buttons (keep only Membership)
- [x] Remove: redundant AI explanation text
- [x] Add: locked Identity Brief teaser for free users (YOUR IDENTITY BRIEF -- Unlock after second generation)
- [x] Add: real Identity Brief display for members (palette/metals/makeup/fabrics/lighting/presence/shopping -- editorial, minimal)
- [x] Keep: Membership status, Visual Identity status, Retrain button, Body Preference editor
- [x] Profile sections order: Membership -> Visual Identity -> Identity Brief -> LoRA Model -> Body Preference -> Account

### Body Preference in onboarding
- [x] Body Preference confirmed already in onboarding (before LoRA training) -- no changes needed
- [x] Body preference injected into generation prompts from first generation onward
- [x] Body Preference kept as editable field in profile (no intro framing)

## V106 -- Identity Brief Card + Onboarding Body Preference
- [x] Add identity_brief_card_url column to profiles table (migration)
- [x] Update DbProfile type in db.ts to include identity_brief_card_url
- [x] Install canvas (node-canvas) dependency
- [x] Build server/identityBriefCard.ts: server-side canvas renderer for the 10-section Identity Brief PNG
- [x] Wire renderer to aestheticRead procedure: after saving brief, generate card, save to S3, store identity_brief_card_url
- [x] Update Profile.tsx Identity Brief section: show card image if identity_brief_card_url exists, else show locked teaser
- [x] Body Preference confirmed already in Onboarding.tsx (before LoRA training) -- no changes needed
- [x] body_type injected into generation prompts as lightweight modifier (confirmed existing)
- [x] TypeScript: zero errors
- [x] Vitest: 23 tests passing

## V107 -- LoRA Training Lifecycle + Identity Brief Card Preview
- [x] Audit DB: check Anum's profile for lora_request_id, photo count, training status
- [x] Audit server: verify loraUpload triggers Fal, loraPoller updates status correctly
- [x] Schema migration: add lora_status column (not_started | training | ready | failed) if missing
- [x] Server: set lora_status=training immediately after Fal training starts
- [x] Server: set lora_status=ready when poller confirms completion
- [x] Server: set lora_status=failed on Fal error
- [x] Dashboard UI: show "Your Visual Identity is Training" card when lora_status=training
- [x] Dashboard UI: disable Generate Content button when lora_status=training
- [x] Profile UI: show training state in Visual Identity Model section
- [x] Generate test Identity Brief card PNG and verify visual quality
- [x] TypeScript: zero errors
- [x] Vitest: all tests passing
## V107 (continued) -- LoRA Training Lifecycle UI Improvements
- [x] Dashboard: replace slim training banner with full prominent training card (replaces "Add Photos" step card)
- [x] Dashboard: disable Generate Content button when lora_status === 'training'
- [x] Dashboard: add refetchInterval (60s) to profileQuery so UI auto-updates on training complete
- [x] Profile: upgrade Visual Identity Model training state to pulsing indicator with more prominent messaging
- [x] Generate test Identity Brief card PNG to verify visual quality

## Card Display Architecture Fix
- [x] Fix Profile card width: constrain transformation_card_url image to max-w-sm on desktop
- [x] Clear legacy transformation_card_url for owner (old "YOUR VISUAL TRANSFORMATION" format)
- [x] Add identity_brief_card_url column to Supabase (ALTER TABLE migration)
- [x] Update db.ts DbProfile type to include identity_brief_card_url
- [x] Fix Gen 1 save flow: updateTransformationCardUrl called after every generation
- [x] Fix Gen 2 save flow: updateIdentityBriefCardUrl called after Gen 2 identity brief card render
- [x] TypeScript: 0 errors, Vitest: all passing, checkpoint

## V28 -- Body Preservation Modifier

- [x] Build buildBodyPreservationModifier() helper: inject from body_preference + auto-detect fuller/curvier body from physical_descriptors keywords
- [x] Inject body preservation modifier into Gen 1 prompt (generate procedure in routers.ts)
- [x] Inject body preservation modifier into Gen 2 prompt (generate procedure, second generation path)
- [x] Inject body preservation modifier into createStudio prompt
- [x] Auto-detect fuller/curvier body from physical_descriptors (keywords: full, curvy, plus, round, wide, broad, thick, heavy, large, ample, voluptuous)
- [x] TypeScript check, vitest run, save checkpoint

## Free Retry System (V29)
- [x] Add free_retry_used boolean column to credits table in Supabase
- [x] Add requestFreeRetry tRPC procedure: restore credit to 1, set free_retry_used=true, archive the generation
- [x] Add "This didn't render right" button to Dashboard generation card (free users only, first gen only, free_retry_used=false)
- [x] Show upgrade prompt instead of retry button when free_retry_used=true
- [x] TypeScript check, vitest run, save checkpoint

## V31 -- Silhouette Selector (User-Controlled)

- [x] Reuse body_type column for silhouette choice (slim/athletic/curvy) -- no new column needed
- [x] Define 3 styling token sets in shared/silhouette.ts (clothing cuts, waist emphasis, framing, pose)
- [x] Add profile.updateSilhouette tRPC mutation in routers.ts
- [x] Add YOUR SILHOUETTE radio selector to Profile.tsx (tasteful, not clinical)
- [x] Replace buildBodyPreservationModifier() body_descriptor Tier 0 with silhouette tokens in routers.ts
- [x] Update buildCreateStudioPrompt() to use silhouette tokens instead of bodyDescriptor param
- [x] TypeScript check (npx tsc --noEmit)
- [x] pnpm test (all 23 passing)
- [x] webdev_save_checkpoint V31

## V32 -- Onboarding Lock + Training Gate

- [x] Remove "Skip for now" button from onboarding photos step (photos are required)
- [x] Add training waiting screen in onboarding (polls every 8s, auto-advances when lora_status=ready)
- [x] After photo upload in onboarding: navigate to training step instead of complete step
- [x] Fix App.tsx TrainingGatedRoute: redirect no-photo users to /onboarding not /profile
- [x] Lock dashboard CREATE YOUR FIRST button visually when lora not ready (opacity-30, disabled, helper text)
- [x] Fix profile page loading flash: show skeleton not upload form while profileQuery is loading
- [x] TypeScript: zero errors
- [x] Vitest: 23 tests passing

## V33 -- SAVE & SHARE Fix (Storage Proxy Rate Limit)

- [x] Create /api/download/brief-card server endpoint (briefCardDownload.ts) that fetches image via service credentials, bypassing /manus-storage/ proxy 429 rate limit
- [x] Register route in server/_core/index.ts (before /:generationId wildcard)
- [x] Update Profile.tsx SAVE & SHARE button to use saveOrShareBlob('/api/download/brief-card') instead of saveOrShare(raw /manus-storage/ URL)
- [x] Import saveOrShareBlob in Profile.tsx
- [x] TypeScript: 0 errors. Tests: 23/23 passing.

## V34 -- Profile Upsert Bug Fix + State Sync
- [x] Fix updateLoraProfile() to upsert (insert-or-update) -- was already done in prior session
- [x] Fix handleLoraUpload to ensure a profile row exists -- covered by upsert fix
- [x] Manually recover Sarah (user_id=29): inserted profile row with lora_status=null (weights URL unrecoverable from Fal.ai; Sarah needs to re-upload)
- [x] Fix generation gate in Dashboard.tsx: sole source of truth is lora_status===ready, removed uploaded_photo_count fallback
- [x] Fix App.tsx TrainingGatedRoute: same source-of-truth fix, removed photo count gate
- [x] Force profile refetch: _resetCache() in AuthCallback, refetchOnWindowFocus globally in QueryClient, explicit focus listener in Dashboard
- [x] TypeScript: 0 errors. Tests: 23/23 passing.

## V35+ -- Your Worlds Personalization (Identity Brief)
- [x] Source and assess 16 editorial scene images across 4 time-of-day moods
- [x] Upload 10 approved scene images to static storage
- [x] Add selectScenes() helper in identityBriefCard.ts: scores palette/undertone text against warm/cool keyword lists, returns 4 scenes (one per time slot: morning, afternoon, golden_hour, night)
- [x] Update renderYourWorldsAsync() to accept brief param and use selectScenes() instead of hardcoded WORLD_URLS
- [x] TypeScript: zero errors

## V36 -- Duplicate User Fix (Magic Link)
- [x] Root cause: Supabase issues a new UUID on each magic-link click; upsertUser was looking up only by open_id, so each click created a new row
- [x] Fix upsertUser in server/db.ts: Step 1 = open_id lookup (fast path), Step 2 = email fallback (adopt existing row + update open_id), Step 3 = insert only for genuinely new users
- [x] Normalize email to lowercase on insert and in email-fallback lookup
- [x] Write scripts/merge-duplicate-users.sql: idempotent PL/pgSQL script to merge all existing duplicate rows (keep lowest id, reassign profiles/credits/generations/postability_feedback/referrals FKs, sum credits, delete orphans)
- [x] Write scripts/add-users-email-unique.sql: normalize emails + add partial UNIQUE index on LOWER(email) WHERE email IS NOT NULL
- [x] TypeScript: zero errors. Vitest: 23/23 passing.

## V37 -- Sentry User Context + Error Boundary
- [x] Add Sentry.setUser({ id, email }) in useAuth.ts after /api/auth/me resolves with a user
- [x] Add Sentry.setUser(null) on logout in useAuth.ts
- [x] Wrap <App /> in <Sentry.ErrorBoundary> in main.tsx with branded fallback screen (cream/gold, Reload button)
- [x] TypeScript: zero errors

## V38 -- Founder Section
- [x] Add founder section to Home.tsx between Pricing and Final CTA
- [x] Asymmetric two-column layout: photo 45% left, text right on desktop; stacked on mobile
- [x] Upload founder photo to static storage (/manus-storage/founder-photo_b6c41300.webp)
- [x] Final copy with "what you believe you deserve" closing line

## V39 -- Spark Pack Credit Add-on
- [x] Create Spark Pack product in Stripe ($5, 3 looks) via MCP -- price_1TcW5WPMV5P3vLteveuspoUz
- [x] Add CREDIT_PACK_CREDITS mapping and credit_pack webhook branch in stripeWebhook.ts
- [x] Add createCreditPackCheckoutSession helper in stripeWebhook.ts
- [x] Add createCreditPackCheckout tRPC procedure in routers.ts
- [x] Add creditPackMutation + handleSparkPack in Generate.tsx
- [x] Update showTopUp modal in Generate.tsx -- Spark Pack as primary CTA, membership as secondary
- [x] Add creditPackMutation + handleSparkPack in Dashboard.tsx
- [x] Update zero-credit block in Dashboard.tsx -- Spark Pack as primary CTA, membership as secondary
- [x] TypeScript: zero errors. Vitest: 23/23 passing.

## V40 -- Stripe Live Key Fix
- [x] Updated STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY to live mode in Settings -> Payment
- [x] Expanded products.ts to centralize all live price IDs (sparkPack, MEMBERSHIP_PRICES, PRO_PRICES)
- [x] Updated stripeWebhook.ts to import price IDs from products.ts (no more hardcoded strings in webhook)
- [x] Audited all checkout entry points: Home routes to /dashboard, Dashboard/Generate/Profile use correct live price IDs
- [x] TypeScript: zero errors. Vitest: 23/23 passing.

## V41 -- Referral Copy Fix + Homepage Checkout
- [x] Fix referral invite copy: Dashboard "Both of you get 3 free generations" -> "You get 3 credits. They get 1 free look."
- [x] Fix SignIn referral banner: "you both get 3 free generations" -> "get 1 free look on us"
- [x] Fix auth.ts comment to accurately describe asymmetric referral credit awards
- [x] Wire homepage Membership button to real Stripe checkout for logged-in users (createSubscriptionCheckout mutation with user_id in metadata)
- [x] Logged-out visitors: Membership button opens Stripe payment link in new tab (or redirects to sign-in as fallback)
- [x] Annual price corrected to $152/year (was showing $182 legacy price)
- [x] TypeScript: zero errors. Vitest: 23/23 passing.

## V43 -- Founder Recovery Campaign + Mobile Download Fix
- [x] Created recovery_emails table in Supabase (userId unique, creditsAdded, sentAt, bonusOnPurchaseUsed)
- [x] Built recovery email template: Shania's exact founder copy, warm/elegant tone, Resend (from: Shania at Meetha)
- [x] Built admin.sendRecoveryEmails tRPC procedure: queries free-tier users only (excludes starter/pro), adds 3 credits, sends email, logs in recovery_emails, dryRun flag for preview
- [x] Updated Stripe webhook: on checkout.session.completed, if user is in recovery_emails and bonus not yet used, add 3 bonus credits (idempotent via bonusOnPurchaseUsed flag)
- [x] Fixed iOS mobile download: open in new tab instead of navigator.share (iOS saves to Photos via share icon, avoids Files app confusion)
- [x] Added recovery campaign UI to Admin.tsx: Dry Run + Send buttons, result summary (sent/failed/no email counts)
- [x] TypeScript: zero errors. Vitest: 23/23 passing.

## V52 -- Story Card Overlay + Image Overflow Fix

- [x] Share Story Card button now uses full-screen overlay (same pattern as Save Clean Image) — fetches /api/style-card/:id as blob, creates object URL, shows full-screen with "Hold the image to save to your photos" instruction
- [x] Fixed image overflow in generation card detail modal — image now constrained to max 55vh so Share Story Card and Save Clean Image buttons are always visible below the image
- [x] Story card overlay properly revokes object URL on close to prevent memory leaks

## V53 -- Generate overlay + 0-credits modal + template row

- [x] Generate.tsx Share Story Card now uses full-screen overlay (same pattern as Dashboard) — fetches /api/style-card/:id as blob, shows full-screen with "Hold the image to save to your photos" instruction
- [x] Dashboard "Unlock More Looks" button now opens a polished bottom-sheet upgrade modal (Spark Pack $5 + Membership $19/mo + Annual) instead of scrolling to inline section
- [x] Confirmed The Blur (motion_blur) is already the 8th card in the Dashboard template shortcut row — no change needed
- [x] TypeScript: 0 errors. Vitest: 23/23 passing.
