# LoRA State Audit — Full Lifecycle Trace
Generated: 2026-05-28

---

## The Canonical State Machine (what it SHOULD be)

```
null → uploaded → training → ready
                           → failed
```

`lora_status` is the intended single source of truth. But several places still
read `uploaded_photo_count` as a fallback or override, creating conflicts.

---

## Lifecycle Step-by-Step

### Step 1 — Photos upload to storage
**Where:** `POST /api/lora/upload` → `server/loraUpload.ts`
**What happens:** Photos are zipped, uploaded to Fal.ai, training job submitted.
**Status:** Works correctly.

### Step 2 — Profile row created / updated
**Where:** `updateLoraProfile(userId, { loraStatus: 'training', uploadedPhotoCount: N, ... })`
**What happens:** Upsert into Supabase `profiles` table.
**BUG FOUND:** Supabase `profiles.archetype` column has a NOT NULL constraint
that is NOT reflected in `drizzle/schema.ts`. When `updateLoraProfile` tries to
upsert a row for a user with no existing profile (e.g. Sarah, who never completed
the archetype step in onboarding), the INSERT fails with:
  `null value in column "archetype" violates not-null constraint`
The error is caught and logged but execution continues — so the email fires but
the profile row is never created or updated.
**Result:** `lora_status` stays null permanently for these users.

### Step 3 — Fal.ai training job started
**Where:** `submitLoraTraining()` in `server/_core/falLoraTraining.ts`
**Status:** Works correctly. Job runs on Fal.ai regardless of profile state.

### Step 4 — Training completion detected
**Two paths:**
- **In-memory poller** (`server/loraPoller.ts`): starts on upload, polls every 15s.
  Killed on any server restart. Not reliable for production.
- **Heartbeat cron** (`server/loraEmailCron.ts`): runs every 5 min, polls all
  profiles with `lora_status = 'training'`. Reliable — but only finds users whose
  profile row was successfully created in Step 2.
  If Step 2 failed (archetype NOT NULL), the cron never sees the user.

### Step 5 — Weights URL persisted
**Where:** `updateLoraProfile(userId, { loraStatus: 'ready', loraWeightsUrl: url })`
**BUG:** Same NOT NULL constraint failure as Step 2 if no profile row exists.
**Result:** Weights URL is never saved.

### Step 6 — Email fires
**Where:** `sendLoraReadyEmail()` reads from `users` table (not `profiles`).
**Status:** Works correctly regardless of profile state. This is why Sarah gets
the "Your look is ready" email even though her profile was never updated.

### Step 7 — Frontend generation gate

**App.tsx TrainingGatedRoute** (blocks /generate and /templates):
```
isReady    = profile?.lora_status === 'ready'          ✓ correct
isTraining = profile?.lora_status === 'training'       ✓ correct
needsUpload = !profile || (!isReady && !isTraining)    ✓ correct
```
If `needsUpload` → redirect to /onboarding
If `isTraining` → show training wall
If `isReady` → render component
**Status:** Logic is correct. But if profile row doesn't exist (Step 2 failed),
`profile` is null → `needsUpload = true` → redirect to /onboarding. Correct
behavior given bad data, but confusing for user.

**Dashboard.tsx** — generate button gate:
```
disabled = credits?.credits_remaining === 0 || profile?.lora_status !== 'ready'
```
**Status:** Correct — uses lora_status only.

**Dashboard.tsx** — banner conditions:
```
lora_status === 'training'  → show training card         ✓
lora_status === null/failed → show "upload photos" card  ✓
lora_status === 'ready'     → show generate button       ✓
```
**Status:** Correct — uses lora_status only.

### Step 8 — Legacy photo-count checks still present

**Profile.tsx** (line 63):
```js
if (photoCount > 0 && serverStatus === null) return 'training';
```
This overrides `lora_status = null` with a synthetic `'training'` state when
`uploaded_photo_count > 0`. Intent: handle the case where upload succeeded but
profile update failed. But this creates a **permanent training state** for users
whose training actually failed silently — they see "training" forever.

**Profile.tsx** (line 499):
```js
} : (profileQuery.data?.uploaded_photo_count ?? 0) > 0 ? (
  /* show "Photos submitted, section locked" */
```
This permanently locks the upload UI based on photo count, even if training
failed and the user needs to retry.

**Onboarding.tsx** (line 72):
```js
if (d.lora_status === 'training' || ((d.uploaded_photo_count ?? 0) > 0 && d.lora_status !== 'ready')) return 8_000;
```
Polls every 8s if photo_count > 0 and not ready — creates infinite polling for
users stuck in the broken state.

**Onboarding.tsx** (line 93):
```js
if (isTraining || (hasPhotos && d.lora_status !== 'ready')) { setStep('training'); }
```
Sends user to training step if photos > 0 but not ready — even if training
failed. User sees "training..." forever.

### Step 9 — Frontend cache staleness on mobile Safari
`refetchOnWindowFocus: true` was added globally but iOS Safari does not reliably
fire `visibilitychange` or `focus` when returning from Mail app. The profile
query does not refetch on mount (only on window focus). Users returning from
email CTA see stale cached state.

### Step 10 — Onboarding lock after training completion
**App.tsx** routes `/onboarding` through `ProtectedRoute` (not `TrainingGatedRoute`).
Onboarding is always accessible regardless of lora_status. If a user with
`lora_status = 'ready'` lands on /onboarding, the `onboarding_complete` check
redirects them to /dashboard immediately. **Status: correct.**

---

## Summary of All Bugs

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | `profiles.archetype` NOT NULL in Supabase but nullable in schema | Supabase DB | **Critical** — all upserts fail for users without archetype |
| 2 | In-memory poller dies on server restart | loraPoller.ts | High — primary completion path is unreliable |
| 3 | `uploaded_photo_count > 0` overrides `lora_status = null` with synthetic 'training' | Profile.tsx:63 | Medium — users stuck in fake training state |
| 4 | Upload UI locked permanently by photo_count, not lora_status | Profile.tsx:499 | Medium — users can't retry after silent failure |
| 5 | Onboarding polls/routes to training step based on photo_count | Onboarding.tsx:72,93 | Medium — infinite polling, wrong step shown |
| 6 | `refetchOnWindowFocus` unreliable on iOS Safari | main.tsx | Medium — stale state after email CTA |
| 7 | Profile refetch not forced on Dashboard mount | Dashboard.tsx | Low — stale state on first load |

---

## The Fix Plan

### Fix 1 (Critical): Drop NOT NULL on `profiles.archetype` in Supabase
Run directly against Supabase:
```sql
ALTER TABLE profiles ALTER COLUMN archetype DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN mood DROP NOT NULL;
```

### Fix 2: Remove all `uploaded_photo_count` gating logic
Replace with `lora_status` in:
- Profile.tsx:63 — remove synthetic 'training' override
- Profile.tsx:499 — use `lora_status === 'failed' || lora_status === null` to show retry
- Onboarding.tsx:72,93 — remove photo_count conditions

### Fix 3: Force profile refetch on Dashboard mount
Add `refetchOnMount: 'always'` to the profile query in Dashboard.tsx.

### Fix 4: Manually recover Sarah
Set `lora_status = 'ready'` and weights URL directly in Supabase once Fix 1 is applied.
