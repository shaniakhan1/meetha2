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
