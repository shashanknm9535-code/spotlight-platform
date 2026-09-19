# SPOTLIGHT — PRODUCTION DEPLOYMENT CHECKLIST

Use this checklist prior to launching Spotlight for live audience events.

---

## 1. Supabase Backend Checklist

- [ ] **Migrations Applied**: Verify all 9 SQL migrations have been executed in order:
  1. `20260919_001_initial_schema.sql`
  2. `20260919_002_rls_policies.sql`
  3. `20260919_003_storage.sql`
  4. `20260919_004_registration_rls.sql`
  5. `20260919_005_tickets_rls.sql`
  6. `20260919_006_secure_voting.sql`
  7. `20260919_007_secure_judging.sql`
  8. `20260919_008_admin_event_control.sql`
  9. `20260919_009_production_hardening_auth.sql`
- [ ] **Row Level Security (RLS)**: Confirm RLS is enabled on all tables (`acts`, `tickets`, `orders`, `audience_votes`, `judge_scores`, `judges`, `admin_users`, `event_logs`).
- [ ] **Admin Account Provisioning**:
  - [ ] Create Admin user in Supabase Auth Dashboard (Email + Password).
  - [ ] Insert record into `public.admin_users` matching `id = auth.users.id` with `is_active = true`.
- [ ] **Judge Account Provisioning**:
  - [ ] Create 3 Judge users in Supabase Auth Dashboard.
  - [ ] Associate Auth user IDs with `public.judges.auth_user_id` and set `is_active = true`.
- [ ] **Realtime Enabled**: Ensure Supabase Realtime replication is enabled on `public.events`.
- [ ] **Storage Bucket**: Verify `performer-photos` storage bucket exists with public read access.

---

## 2. Environment & Application Configuration

- [ ] **Environment Variables**: Verify production `.env` contains:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
  VITE_USE_SUPABASE=true
  ```
- [ ] **Secrets Verification**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is NOT present in any environment variables exposed to client bundle.
- [ ] **Dev Controls**: Confirm development toolbars are disabled in production builds (`import.meta.env.PROD === true`).

---

## 3. Event Readiness & Capacity Rules

- [ ] **Event Capacity**: Confirm active event `capacity = 800`.
- [ ] **Ticket Price**: Confirm `ticket_price = 10`.
- [ ] **Approved Acts**: Verify performer registrations are reviewed, approved, and assigned running order slots.
- [ ] **Judge Panel Assignment**: Verify all 3 judges have assigned codes and active credentials.
- [ ] **Stage & Leaderboard Test**: Confirm public `/stage` and `/leaderboard` routes display active act and calculated results accurately.

---

## 4. Operational Sign-Off

| Domain | Responsible Party | Status | Sign-off Date |
| :--- | :--- | :--- | :--- |
| Supabase RLS & Auth | Lead Security Engineer | Ready | 2026-09-19 |
| Web Application Build | Frontend Lead | Passed | 2026-09-19 |
| Live Event Operations | Event Director | Approved | Pending Live Event |
