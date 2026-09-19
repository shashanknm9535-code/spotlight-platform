-- ============================================================
-- SPOTLIGHT — Development Seed Data
-- File: supabase/seed.sql
--
-- Run AFTER all migrations. Paste into Supabase SQL editor or:
--   psql $DATABASE_URL -f supabase/seed.sql
--
-- Mirrors the Phase 7 mock data for score aggregation testing.
-- All UUIDs use gen_random_uuid() for uniqueness.
-- DO NOT run in production.
-- ============================================================

BEGIN;

-- ─── Clear existing seed data (idempotent re-run) ────────────
-- Order matters due to FK constraints
DELETE FROM event_logs;
DELETE FROM audience_votes;
DELETE FROM judge_scores;
DELETE FROM act_members;
DELETE FROM tickets;
DELETE FROM acts;
DELETE FROM judges;
DELETE FROM events;

-- ─── 1. Event ────────────────────────────────────────────────

INSERT INTO events (id, name, description, event_date, venue, capacity, ticket_price, status, voting_open)
VALUES (
  'a1b2c3d4-0001-0001-0001-a1b2c3d40001',
  'SPOTLIGHT 2026',
  'Annual live performance competition where talent meets the spotlight.',
  '2026-10-15 18:00:00+05:30',
  'Main Auditorium, College Campus',
  800,
  10.00,
  'LIVE',
  true
);

-- ─── 2. Judges ───────────────────────────────────────────────

INSERT INTO judges (id, name, email, judge_code, is_anchor, is_active)
VALUES
  ('b1000001-0000-0000-0000-000000000001',
   'Dr. Sarah Jenkins',
   'sarah.jenkins@college.edu',
   'JUDGE-01',
   true,   -- ANCHOR JUDGE (tiebreaker)
   true),

  ('b1000001-0000-0000-0000-000000000002',
   'Marcus Chen',
   'marcus.chen@college.edu',
   'JUDGE-02',
   false,
   true),

  ('b1000001-0000-0000-0000-000000000003',
   'Prof. Vikram Patel',
   'vikram.patel@college.edu',
   'JUDGE-03',
   false,
   true);

-- ─── 3. Acts — Solo (8) ──────────────────────────────────────

INSERT INTO acts (id, act_code, category, title, performer_name, department, year, performance_type, bio, self_rating, status, running_order)
VALUES
  ('c0000001-0000-0000-0000-000000000002',
   'SPT-2026-A002', 'SOLO', 'Rhythm Rebels', 'Ananya Sharma',
   'Electronics Engineering', '4th Year', 'Contemporary Solo Dance',
   'High-voltage acrobatic dance exploring the collision of technology and human emotion.',
   8, 'APPROVED', 2),

  ('c0000001-0000-0000-0000-000000000004',
   'SPT-2026-A004', 'SOLO', 'Acoustic Horizon', 'Rohan Deshmukh',
   'Computer Science', '1st Year', 'Vocal Solo & Fingerstyle Guitar',
   'Soulful acoustic medley featuring original compositions and vocal loops.',
   7, 'APPROVED', 4),

  ('c0000001-0000-0000-0000-000000000006',
   'SPT-2026-A006', 'SOLO', 'Raw Nerve', 'Divya Menon',
   'Basic Sciences', '3rd Year', 'Spoken Word',
   'Spoken-word poetry about identity, science and belonging.',
   6, 'APPROVED', 6),

  ('c0000001-0000-0000-0000-000000000008',
   'SPT-2026-A008', 'SOLO', 'Open Chord', 'Aarav Sharma',
   'Computer Science & Engineering', '2nd Year', 'Instrumental',
   'Original fingerstyle guitar compositions performed live without backing track.',
   8, 'APPROVED', 8),

  ('c0000001-0000-0000-0000-000000000009',
   'SPT-2026-A009', 'SOLO', 'Electric Spirit', 'Priya Gupta',
   'Electronics & Communication', '3rd Year', 'Singing',
   'Western classical vocal performance with original arrangements.',
   7, 'APPROVED', 9),

  ('c0000001-0000-0000-0000-000000000010',
   'SPT-2026-A010', 'SOLO', 'Mirror Break', 'Farhan Khan',
   'Arts & Mass Communication', '2nd Year', 'Comedy',
   'Stand-up set exploring college exam culture and hostel life.',
   5, 'APPROVED', 10),

  ('c0000001-0000-0000-0000-000000000011',
   'SPT-2026-A011', 'SOLO', 'Velocity', 'Sneha Iyer',
   'Mechanical Engineering', '4th Year', 'Dance',
   'Bharatanatyam fusion with contemporary elements and electronic music.',
   9, 'APPROVED', 11),

  ('c0000001-0000-0000-0000-000000000012',
   'SPT-2026-A012', 'SOLO', 'Nocturne', 'Arjun Bose',
   'Information Technology', '1st Year', 'Instrumental',
   'Solo piano compositions performed live — original nocturnes.',
   8, 'APPROVED', 12);

-- ─── 4. Acts — Group (8) ─────────────────────────────────────

INSERT INTO acts (id, act_code, category, title, performer_name, department, year, performance_type, bio, self_rating, status, running_order)
VALUES
  ('c0000001-0000-0000-0000-000000000001',
   'SPT-2026-A001', 'GROUP', 'Symphonic Echoes', 'Karan Mehta & The Resonance Crew',
   'Music & Sound Arts', '3rd Year', 'Music & Live Band',
   'A 5-piece fusion ensemble blending classical Indian ragas with modern progressive rock.',
   9, 'APPROVED', 1),

  ('c0000001-0000-0000-0000-000000000003',
   'SPT-2026-A003', 'GROUP', 'Echoes of Drama', 'The Natya Theatre Guild',
   'Arts & Mass Communication', '2nd Year', 'Street Play & Musical Theatre',
   'A punchy satire addressing digital obsession and artificial intelligence.',
   8, 'APPROVED', 3),

  ('c0000001-0000-0000-0000-000000000005',
   'SPT-2026-A005', 'GROUP', 'Pulse Collective', 'The Pulse Crew',
   'Arts & Mass Communication', '2nd Year', 'Dance',
   'High-energy synchronised hip-hop choreography by a 7-member crew.',
   7, 'APPROVED', 5),

  ('c0000001-0000-0000-0000-000000000007',
   'SPT-2026-A007', 'GROUP', 'Neon Mandal', 'Neon Mandal Ensemble',
   'Information Technology', '4th Year', 'Theatre',
   'A surreal theatrical piece blending light art and live music.',
   9, 'APPROVED', 7),

  ('c0000001-0000-0000-0000-000000000013',
   'SPT-2026-A013', 'GROUP', 'Taal Syndicate', 'Taal Syndicate Band',
   'Music & Sound Arts', '3rd Year', 'Music',
   'Percussive fusion group — tabla, djembe, and electronic pads.',
   8, 'APPROVED', 13),

  ('c0000001-0000-0000-0000-000000000014',
   'SPT-2026-A014', 'GROUP', 'Stage Riot', 'Stage Riot Crew',
   'Commerce / Business Administration', '2nd Year', 'Dance',
   'Street dance battle-style group act choreographed to a mash-up.',
   7, 'APPROVED', 14),

  ('c0000001-0000-0000-0000-000000000015',
   'SPT-2026-A015', 'GROUP', 'Overtone', 'Overtone A Cappella',
   'Basic Sciences', '3rd Year', 'Music',
   '8-member a cappella group performing original vocal arrangements.',
   9, 'APPROVED', 15),

  ('c0000001-0000-0000-0000-000000000016',
   'SPT-2026-A016', 'GROUP', 'Kinetic Wave', 'Kinetic Wave Dance Co.',
   'Civil Engineering', '4th Year', 'Dance',
   'Contemporary group dance piece exploring fluid motion and geometry.',
   8, 'APPROVED', 16);

-- ─── 5. Act Members (for group acts) ─────────────────────────

INSERT INTO act_members (act_id, name, department, year)
VALUES
  -- Symphonic Echoes (act-01)
  ('c0000001-0000-0000-0000-000000000001', 'Priya R.', 'Music', '3rd Year'),
  ('c0000001-0000-0000-0000-000000000001', 'Dev S.', 'Sound Arts', '2nd Year'),
  ('c0000001-0000-0000-0000-000000000001', 'Riya M.', 'Music', '3rd Year'),
  ('c0000001-0000-0000-0000-000000000001', 'Anik P.', 'Music', '4th Year'),

  -- Echoes of Drama (act-03)
  ('c0000001-0000-0000-0000-000000000003', 'Meera V.', 'Arts', '2nd Year'),
  ('c0000001-0000-0000-0000-000000000003', 'Rahul A.', 'Arts', '2nd Year'),
  ('c0000001-0000-0000-0000-000000000003', 'Sneha B.', 'Mass Comm', '1st Year'),

  -- Pulse Collective (act-05)
  ('c0000001-0000-0000-0000-000000000005', 'Ayaan K.', 'Arts', '2nd Year'),
  ('c0000001-0000-0000-0000-000000000005', 'Tara J.', 'CSE', '3rd Year'),
  ('c0000001-0000-0000-0000-000000000005', 'Omar S.', 'Arts', '2nd Year'),
  ('c0000001-0000-0000-0000-000000000005', 'Nisha P.', 'IT', '1st Year'),

  -- Neon Mandal (act-07)
  ('c0000001-0000-0000-0000-000000000007', 'Leila F.', 'IT', '4th Year'),
  ('c0000001-0000-0000-0000-000000000007', 'Veer R.', 'IT', '3rd Year'),
  ('c0000001-0000-0000-0000-000000000007', 'Zara N.', 'Arts', '4th Year');

-- ─── 6. Tickets ──────────────────────────────────────────────

INSERT INTO tickets (id, ticket_code, buyer_name, buyer_email, buyer_phone, quantity, payment_status, issued_at)
VALUES
  ('d0000001-0000-0000-0000-000000000001',
   'SPT-TKT-2026-0001', 'Jordan Smith', 'jordan.smith@student.edu', '+91 98765 00001',
   1, 'PAID', now()),

  ('d0000001-0000-0000-0000-000000000002',
   'SPT-TKT-2026-0002', 'Neha Verma', 'neha.verma@student.edu', '+91 98765 00002',
   1, 'PAID', now()),

  ('d0000001-0000-0000-0000-000000000003',
   'SPT-TKT-2026-0003', 'Rishi Kapoor', 'rishi.k@student.edu', '+91 98765 00003',
   1, 'PAID', now()),

  ('d0000001-0000-0000-0000-000000000004',
   'SPT-TKT-2026-00482', 'Anjali Rao', 'anjali.rao@student.edu', '+91 98765 00482',
   1, 'PAID', now()),

  ('d0000001-0000-0000-0000-000000000005',
   'SPT-TKT-2026-00483', 'Siddharth Menon', 'sid.menon@student.edu', '+91 98765 00483',
   1, 'PAID', now());

-- ─── 7. Judge Scores (mirrors Phase 7 mock data) ─────────────
-- act-01 (GROUP Symphonic Echoes), act-02 (SOLO Rhythm Rebels), etc.
-- Deliberate ties preserved: act-03 & act-05 same final; act-02 & act-06 same final+audience

INSERT INTO judge_scores (act_id, judge_id, creativity, execution, stage_presence, audience_engagement, submitted, submitted_at)
VALUES
  -- ACT-01 (GROUP)
  ('c0000001-0000-0000-0000-000000000001','b1000001-0000-0000-0000-000000000001', 3,3,2,2, true, now()),
  ('c0000001-0000-0000-0000-000000000001','b1000001-0000-0000-0000-000000000002', 3,2,2,2, true, now()),
  ('c0000001-0000-0000-0000-000000000001','b1000001-0000-0000-0000-000000000003', 2,3,2,2, true, now()),
  -- ACT-02 (SOLO Rhythm Rebels)
  ('c0000001-0000-0000-0000-000000000002','b1000001-0000-0000-0000-000000000001', 2,3,2,2, true, now()),
  ('c0000001-0000-0000-0000-000000000002','b1000001-0000-0000-0000-000000000002', 3,3,1,2, true, now()),
  ('c0000001-0000-0000-0000-000000000002','b1000001-0000-0000-0000-000000000003', 2,2,2,1, true, now()),
  -- ACT-03 (GROUP Echoes of Drama)
  ('c0000001-0000-0000-0000-000000000003','b1000001-0000-0000-0000-000000000001', 3,2,2,2, true, now()),
  ('c0000001-0000-0000-0000-000000000003','b1000001-0000-0000-0000-000000000002', 2,3,2,1, true, now()),
  ('c0000001-0000-0000-0000-000000000003','b1000001-0000-0000-0000-000000000003', 3,2,1,2, true, now()),
  -- ACT-04 (SOLO Acoustic Horizon) — judge-03 pending (tests incomplete panel)
  ('c0000001-0000-0000-0000-000000000004','b1000001-0000-0000-0000-000000000001', 2,2,2,1, true, now()),
  ('c0000001-0000-0000-0000-000000000004','b1000001-0000-0000-0000-000000000002', 2,2,1,2, true, now()),
  -- ACT-05 (GROUP Pulse Collective) — ties act-03, higher audience wins
  ('c0000001-0000-0000-0000-000000000005','b1000001-0000-0000-0000-000000000001', 3,2,2,2, true, now()),
  ('c0000001-0000-0000-0000-000000000005','b1000001-0000-0000-0000-000000000002', 2,3,2,1, true, now()),
  ('c0000001-0000-0000-0000-000000000005','b1000001-0000-0000-0000-000000000003', 3,2,1,2, true, now()),
  -- ACT-06 (SOLO Raw Nerve) — ties act-02, anchor judge resolves
  ('c0000001-0000-0000-0000-000000000006','b1000001-0000-0000-0000-000000000001', 2,3,1,2, true, now()),
  ('c0000001-0000-0000-0000-000000000006','b1000001-0000-0000-0000-000000000002', 3,2,2,2, true, now()),
  ('c0000001-0000-0000-0000-000000000006','b1000001-0000-0000-0000-000000000003', 2,2,2,2, true, now()),
  -- ACT-07 (GROUP Neon Mandal) — highest group score
  ('c0000001-0000-0000-0000-000000000007','b1000001-0000-0000-0000-000000000001', 3,3,2,2, true, now()),
  ('c0000001-0000-0000-0000-000000000007','b1000001-0000-0000-0000-000000000002', 3,3,2,2, true, now()),
  ('c0000001-0000-0000-0000-000000000007','b1000001-0000-0000-0000-000000000003', 3,2,2,2, true, now()),
  -- ACT-08 (SOLO Open Chord) — lowest solo score
  ('c0000001-0000-0000-0000-000000000008','b1000001-0000-0000-0000-000000000001', 1,2,1,1, true, now()),
  ('c0000001-0000-0000-0000-000000000008','b1000001-0000-0000-0000-000000000002', 2,1,1,1, true, now()),
  ('c0000001-0000-0000-0000-000000000008','b1000001-0000-0000-0000-000000000003', 1,2,1,1, true, now());

-- ─── 8. Audience Votes (mirrors Phase 7 mock vote records) ───

INSERT INTO audience_votes (ticket_id, act_id, rating)
VALUES
  -- ACT-01 (GROUP) — avg 9.0
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001', 9),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000001', 10),
  ('d0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000001', 9),
  ('d0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000001', 8),
  ('d0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000001', 9),
  -- ACT-02 (SOLO) — avg 7.6
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000002', 8),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000002', 7),
  ('d0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000002', 8),
  ('d0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000002', 7),
  ('d0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000002', 8),
  -- ACT-03 (GROUP) — avg 6.6
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000003', 7),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000003', 6),
  ('d0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000003', 7),
  ('d0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000003', 6),
  ('d0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000003', 7),
  -- ACT-04 (SOLO) — avg 6.0
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000004', 6),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000004', 6),
  ('d0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000004', 6),
  -- ACT-05 (GROUP) — avg 7.4 (wins tie with act-03)
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000005', 8),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000005', 7),
  ('d0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000005', 7),
  ('d0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000005', 8),
  ('d0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000005', 7),
  -- ACT-06 (SOLO) — avg 7.6, same as act-02; anchor judge resolves (J01: act-02=9 > act-06=8)
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000006', 8),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000006', 7),
  ('d0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000006', 8),
  ('d0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000006', 7),
  ('d0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000006', 8),
  -- ACT-07 (GROUP) — avg 9.6, highest
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000007', 10),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000007', 10),
  ('d0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000007', 9),
  ('d0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000007', 10),
  ('d0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000007', 9),
  -- ACT-08 (SOLO) — avg 4.67, lowest
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000008', 5),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000008', 4),
  ('d0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000008', 5);

COMMIT;
