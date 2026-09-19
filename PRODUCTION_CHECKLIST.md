# SPOTLIGHT — PRODUCTION PRE-DEPLOYMENT CHECKLIST

Use this checklist prior to launching Spotlight for live production events.

---

## 1. Environment & Secrets
- [x] **Client-side Prefix**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured in Vercel project environment.
- [x] **Production Mode**: `VITE_USE_SUPABASE=true` set in production environment variables.
- [x] **Service-Role Safety**: `SUPABASE_SERVICE_ROLE_KEY` is NOT present in client code or frontend environment.
- [x] **Git Protection**: `.env` and `.env.local` files are ignored by `.gitignore`.

## 2. Supabase Backend
- [x] **Migration Sequence**: Verified 9 migrations apply in clean numerical order:
  - `001_initial_schema.sql`
  - `002_rls_policies.sql`
  - `003_storage.sql`
  - `004_registration_rls.sql`
  - `005_tickets_rls.sql`
  - `006_secure_voting.sql`
  - `007_secure_judging.sql`
  - `008_admin_event_control.sql`
  - `009_production_hardening_auth.sql`
- [x] **Development Seed Isolation**: `supabase/seed.sql` marked for development use only.

## 3. Authentication & Authorization
- [x] **Admin Auth**: `/admin` requires authenticated Supabase user verified in `admin_users` (`is_active = true`).
- [x] **Judge Auth**: `/judge` requires authenticated Supabase user linked via `judges.auth_user_id` (`is_active = true`).
- [x] **Session Persistence**: `autoRefreshToken` and `persistSession` configured; page refreshes maintain valid sessions.
- [x] **Logout Flow**: Sign out destroys Supabase session and returns user to access modal.

## 4. Database Security & RLS
- [x] **RLS Enabled**: `acts`, `tickets`, `orders`, `audience_votes`, `judge_scores`, `judges`, `admin_users`, `event_logs`.
- [x] **Search Path Enforcement**: `SET search_path = public, pg_temp` added to all `SECURITY DEFINER` functions.
- [x] **Admin RPC Security**: All admin functions check `is_active_admin()`.
- [x] **Judge RPC Security**: `submit_judge_score` checks active judge identity from `auth.uid()`.

## 5. Storage Security
- [x] **Public Read**: `performer-photos` bucket permits public read for approved act media.
- [x] **Upload Limits**: File size capped at 5 MB; allowed MIME types `image/jpeg`, `image/png`, `image/webp`.

## 6. Vercel SPA Configuration
- [x] **Vercel Rewrites**: `vercel.json` maps `/(.*)` to `/index.html`.
- [x] **Direct Navigation**: Deep URLs (`/register`, `/ticket`, `/vote`, `/judge`, `/admin`, `/stage`, `/leaderboard`) work on direct reload.

## 7. Public Modules Validation
- [x] **Landing Page (`/`)**: Displays hero, event banner, features, and track descriptions.
- [x] **Performer Registration (`/register`)**: Form submits pending acts into `acts` table.
- [x] **Audience Ticketing (`/ticket`)**: Atomic capacity issuance handles purchases up to `800` limit.
- [x] **Live Audience Voting (`/vote`)**: Paid ticket validation, single vote per ticket per act, 1–10 rating bounds.
- [x] **Stage Display (`/stage`)**: Realtime subscription reflects live act updates on auditorium display.
- [x] **Live Leaderboard (`/leaderboard`)**: Real-time 60/40 aggregate score calculation with tiebreakers.

## 8. Privileged Modules Validation
- [x] **Judge Scoring (`/judge`)**: Rubric scoring, score review modal, and score locking.
- [x] **Admin Control Center (`/admin`)**: Registration approval/rejection, running order drag-and-drop, live event controls, audit log viewer.

## 9. Security & Error Handling
- [x] **Sanitized Error Messages**: Raw SQL/Postgres internal error trace strings suppressed from UI.
- [x] **Dev Controls Hidden**: `AdminDevControls` and `JudgeDevControls` wrapped in `!import.meta.env.PROD` check.

## 10. Backup & Event Day Preparation
- [x] **Event Runbook**: `PRODUCTION_EVENT_RUNBOOK.md` prepared for event directors and operators.
- [x] **Data Integrity**: Production database tables clean and prepared for live competition records.

---

## Sign-Off Matrix

| Domain | Owner | Status | Date |
| :--- | :--- | :--- | :--- |
| Supabase Security & RLS | Lead Security Engineer | PASSED | 2026-09-19 |
| Web Application Build | Frontend Lead | PASSED | 2026-09-19 |
| Vercel Deployment Config | DevOps Engineer | READY | 2026-09-19 |
| Live Event Operations | Event Director | APPROVED | 2026-09-19 |
