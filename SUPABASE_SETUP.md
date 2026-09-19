# SPOTLIGHT — Supabase Backend Setup Guide

This document provides step-by-step instructions to initialize and configure the Supabase backend for **Spotlight**.

---

## 1. Create a Supabase Project

1. Go to [https://database.new](https://database.new) (Supabase Dashboard).
2. Create a new project named **Spotlight-2026** (or your preferred name).
3. Select your region and set a secure Database Password.

---

## 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```
2. Retrieve your project URL and Anon (Publishable) Key from:
   **Supabase Dashboard → Project Settings → API**
3. Update `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_USE_SUPABASE=true
   ```

*Note: For local/mock-only development, leave `VITE_USE_SUPABASE=false` or omit `.env.local`. The application automatically falls back to local mock data without crashing.*

---

## 3. Run Database Migrations

Open **Supabase Dashboard → SQL Editor → New Query** and execute the migration files in numerical order:

1. **Schema Creation**:
   Copy and run all SQL from [`supabase/migrations/20260919_001_initial_schema.sql`](file:///d:/TALENT%20DAY/supabase/migrations/20260919_001_initial_schema.sql).

2. **Row Level Security Policies**:
   Copy and run all SQL from [`supabase/migrations/20260919_002_rls_policies.sql`](file:///d:/TALENT%20DAY/supabase/migrations/20260919_002_rls_policies.sql).

3. **Storage Bucket & Policies**:
   Copy and run all SQL from [`supabase/migrations/20260919_003_storage.sql`](file:///d:/TALENT%20DAY/supabase/migrations/20260919_003_storage.sql).

*Alternatively, if using the Supabase CLI locally:*
```bash
supabase db push
```

---

## 4. Apply RLS Policies Verification

Verify in **Supabase Dashboard → Authentication / Policies** or **Table Editor** that RLS is enabled on all 9 tables:
- `events`
- `acts`
- `act_members`
- `judges`
- `judge_scores`
- `tickets`
- `audience_votes`
- `admin_users`
- `event_logs`

---

## 5. Storage Bucket Configuration

Verify in **Supabase Dashboard → Storage**:
- A bucket named `performer-photos` exists.
- Public read access is **Enabled**.
- File size limit is set to **5 MB**.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.

---

## 6. Seed Development Data

To populate the database with development data matching the Phase 7 live competition state:

1. Open **Supabase Dashboard → SQL Editor → New Query**.
2. Copy and run the entire SQL script from [`supabase/seed.sql`](file:///d:/TALENT%20DAY/supabase/seed.sql).

This populates:
- 1 Spotlight 2026 event
- 3 Judges (with Judge 01 set as Anchor Judge)
- 8 Solo Acts & 8 Group Acts (with group members)
- Sample audience tickets & cast votes
- Sample judge score sheets with deliberate tiebreaker test cases

---

## 7. Start the Application

Run the development server:
```bash
npm run dev
```

The application will detect `VITE_USE_SUPABASE=true` and connect to your live Supabase backend.
