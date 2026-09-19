# SPOTLIGHT — PRODUCTION SECURITY SPECIFICATION

## Overview
This document outlines the production security model, authorization mechanisms, Row Level Security (RLS) enforcement, database RPC security boundaries, and environment protections for the Spotlight live talent competition platform.

---

## 1. Authentication Architecture

### Public Roles (Unauthenticated)
* **Audience / Voters**: Access `/vote`, `/ticket`, `/leaderboard`, `/stage`, `/register`, `/`. No user accounts or passwords are required for public event participation. Voting is verified via paid ticket codes (`SPT-TKT-2026-XXXXXX`).
* **Performers**: Register acts via public form `/register`. Registrations enter `PENDING` state and require active admin approval.

### Privileged Roles (Supabase Auth Required)
* **Admin Control Center (`/admin`)**:
  - Requires an active Supabase Auth user session (`auth.uid()`).
  - Access is verified against `public.admin_users` where `id = auth.uid()` and `is_active = true`.
  - Fallback access code `ADMIN-2026` is active ONLY when `VITE_USE_SUPABASE=false` (mock mode).
* **Judge Scoring Slate (`/judge`)**:
  - Requires an active Supabase Auth user session (`auth.uid()`).
  - Access is linked via `public.judges.auth_user_id = auth.uid()` where `is_active = true`.
  - Fallback judge access codes (`JUDGE-01`, etc.) are active ONLY when `VITE_USE_SUPABASE=false` (mock mode).

---

## 2. Row Level Security (RLS) Model

| Table | Policy Name | Access Type | Target Role | Condition |
| :--- | :--- | :--- | :--- | :--- |
| `admin_users` | Active admins view records | `SELECT` | `authenticated` | `auth.uid() = id AND is_active = true` |
| `judges` | Public view active judges | `SELECT` | `anon`, `authenticated` | `is_active = true` |
| `judges` | Judges update auth link | `UPDATE` | `authenticated` | `auth_user_id IS NULL OR auth_user_id = auth.uid()` |
| `judge_scores` | Judges view own scores | `SELECT` | `authenticated` | `judge_id IN (SELECT id FROM judges WHERE auth_user_id = auth.uid()) OR is_active_admin()` |
| `event_logs` | Active admins view logs | `SELECT` | `authenticated` | `is_active_admin()` |
| `acts` | Public view approved acts | `SELECT` | `anon`, `authenticated` | `status = 'APPROVED'` |
| `tickets` | Ticket holder lookup | `SELECT` | `anon`, `authenticated` | Lookup by exact `ticket_code` |

---

## 3. RPC Security Boundaries & Authorization Checks

All procedural database functions (`SECURITY DEFINER`) enforce strict input validation and runtime caller authorization checks.

### Safe Search Path
Every `SECURITY DEFINER` RPC explicitly specifies:
```sql
SET search_path = public, pg_temp;
```
This prevents search_path hijacking vulnerabilities in PostgreSQL.

### Key RPC Functions

#### 1. `purchase_tickets_atomic`
- **Purpose**: Issues ticket orders atomically with real-time capacity checks.
- **Race Condition Prevention**: Uses `pg_advisory_xact_lock(987654321)` transaction locking to guarantee concurrent ticket purchases cannot exceed the maximum capacity limit (800 tickets).

#### 2. `admin_approve_registration` / `admin_reject_registration` / `admin_set_current_act` / `admin_update_event_state`
- **Authorization**: Verifies `is_active_admin()` before executing mutations. Rejects unauthorized attempts.
- **State Machine Enforcement**: `admin_update_event_state` enforces valid transitions (`DRAFT` → `READY` → `LIVE` → `PAUSED`/`ENDED`) and disallows opening voting unless event status is `LIVE`.
- **Audit Trail**: Automatically appends an entry to `event_logs` for every executed admin action.

#### 3. `submit_judge_score`
- **Authorization**: Resolves judge identity strictly from `auth.uid()`.
- **Rubric Bounds**: Validates creativity (1-5), execution (1-5), stage presence (1-5), and audience engagement (1-5).
- **Score Locking**: Rejects score updates if `submitted = true` already exists for `(judge_id, act_id)`. Submitted scores are locked and immutable.

#### 4. `submit_audience_vote`
- **Verification**: Validates ticket code, payment status (`PAID`), live event status (`LIVE`), and open voting (`voting_open = true`).
- **One-Vote Constraint**: Enforces `UNIQUE(ticket_id, act_id)` constraint at DB engine level.

---

## 4. Environment & Secrets Safety Rules

1. **No Service-Role Key Exposure**:
   - `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed in client code (`src/`), bundled assets, or committed files.
   - Only publishable `VITE_SUPABASE_ANON_KEY` is referenced client-side.
2. **Production Flag**:
   - Production builds set `VITE_USE_SUPABASE=true`.
   - Development toolbars (`AdminDevControls`, `JudgeDevControls`) are disabled in production builds via `!import.meta.env.PROD`.
3. **Storage Security**:
   - Storage bucket `performer-photos` allows public read for approved performer photos.
   - Direct file uploads enforce file extension restrictions and maximum file size limits (5 MB).

---

## 5. Incident Response & Credential Rotation

In case of suspected security compromise:
1. **Invalidate Sessions**: Execute `supabase.auth.admin.signOut(uid)` or revoke refresh tokens via Supabase Dashboard.
2. **Deactivate Admin/Judge Account**: Set `is_active = false` in `admin_users` or `judges` table.
3. **Rotate Supabase Anon Key**: Regenerate API keys in Supabase Settings → API and redeploy environment variables.
