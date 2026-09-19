# SPOTLIGHT — PRODUCTION DEPLOYMENT & LAUNCH GUIDE

**Deployment Date**: 2026-09-20  
**Repository**: `shashanknm9535-code/spotlight-platform`  
**Target Branch**: `master`  
**Git Commit**: `194d993` (or latest commit)  

---

## 1. System Architecture Overview

Spotlight is configured for serverless production deployment using:

* **Frontend**: Vercel (Vite + React 19 SPA with single-page routing rewrites).
* **Database**: Supabase PostgreSQL.
* **Authentication**: Supabase Auth (Email + Password provider for Admin and Judges).
* **Storage**: Supabase Storage (`performer-photos` public bucket).
* **Realtime**: Supabase Realtime WebSocket engine (`public.events` table changes).

---

## 2. Supabase Backend Setup Sequence

### Step A: Apply Database Migrations
Execute the 9 migration scripts located in `supabase/migrations/` in exact numerical sequence via the Supabase SQL Editor or `supabase db push`:

1. `20260919_001_initial_schema.sql` — Schema tables, types, and primary keys.
2. `20260919_002_rls_policies.sql` — Initial Row Level Security policies.
3. `20260919_003_storage.sql` — `performer-photos` storage bucket & policies.
4. `20260919_004_registration_rls.sql` — Performer registration public insert policies.
5. `20260919_005_tickets_rls.sql` — Audience ticketing RLS.
6. `20260919_006_secure_voting.sql` — Atomic ticket-based voting RPC `submit_audience_vote`.
7. `20260919_007_secure_judging.sql` — Judge scoring RPC `submit_judge_score`.
8. `20260919_008_admin_event_control.sql` — Admin event operations & audit logging RPCs.
9. `20260919_009_production_hardening_auth.sql` — Auth linking, atomic capacity protection `purchase_tickets_atomic`, score locking, and `search_path` security hardening.

### Step B: Provision Admin Supabase Auth Account
1. Open **Supabase Dashboard → Authentication → Users**.
2. Click **Add User → Create User**.
3. Enter Admin Email and strong password.
4. Copy the generated User UID (`UUID`).
5. Open SQL Editor and register the active admin record:
   ```sql
   INSERT INTO admin_users (id, email, name, is_active)
   VALUES ('<ADMIN_USER_UUID>', 'admin@spotlight.internal', 'Lead Event Admin', true);
   ```

### Step C: Provision 3 Judge Supabase Auth Accounts
1. In **Authentication → Users**, create 3 Judge accounts (e.g. `judge1@spotlight.internal`, `judge2@spotlight.internal`, `judge3@spotlight.internal`).
2. Copy their respective UIDs and map them in the SQL Editor:
   ```sql
   -- Update Judge 1 (Anchor Judge)
   UPDATE judges SET auth_user_id = '<JUDGE_1_UUID>', is_active = true WHERE judge_code = 'JUDGE-01';

   -- Update Judge 2
   UPDATE judges SET auth_user_id = '<JUDGE_2_UUID>', is_active = true WHERE judge_code = 'JUDGE-02';

   -- Update Judge 3
   UPDATE judges SET auth_user_id = '<JUDGE_3_UUID>', is_active = true WHERE judge_code = 'JUDGE-03';
   ```

### Step D: Realtime & Storage Verification
1. Open **Database → Replication** and ensure `public.events` is enabled for Realtime changes.
2. Open **Storage → Buckets** and confirm `performer-photos` is present with Public access.

---

## 3. Vercel Frontend Deployment Sequence

1. Log into **Vercel Dashboard** and click **Add New Project**.
2. Import repository `shashanknm9535-code/spotlight-platform` (branch: `master`).
3. Select **Vite** framework preset.
4. Set Build Command: `npm run build` (or leave default).
5. Set Output Directory: `dist`.
6. Add Environment Variables under **Project Settings → Environment Variables**:

| Key | Value | Target Environment |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `<your-publishable-anon-key>` | Production |
| `VITE_USE_SUPABASE` | `true` | Production |

> [!WARNING]
> NEVER add `SUPABASE_SERVICE_ROLE_KEY` or `VITE_SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables!

7. Click **Deploy**. Vercel will process the build and provide your production deployment URL.

---

## 4. Post-Deployment Route & SPA Rewrites Verification

Test direct navigation and browser page refreshes on the generated Vercel production URL for all application routes:

* `https://<your-app>.vercel.app/` — Public Landing Page
* `https://<your-app>.vercel.app/register` — Performer Registration
* `https://<your-app>.vercel.app/ticket` — Audience Ticketing Pass Purchase
* `https://<your-app>.vercel.app/vote` — Live Audience Ticket Voting Slate
* `https://<your-app>.vercel.app/judge` — Official Judge Scoring Slate
* `https://<your-app>.vercel.app/admin` — Admin Control Center
* `https://<your-app>.vercel.app/stage` — Auditorium Stage Display Screen
* `https://<your-app>.vercel.app/leaderboard` — Live 60/40 Results Scoreboard

---

## 5. Post-Testing Final Event Reset

Following successful end-to-end smoke testing, reset the production event state to pre-event mode:

```sql
UPDATE events 
SET status = 'DRAFT', 
    voting_open = false, 
    current_act_id = NULL
WHERE id = (SELECT id FROM events ORDER BY created_at DESC LIMIT 1);
```

Ensure no live voting remains enabled prior to the actual competition event.
