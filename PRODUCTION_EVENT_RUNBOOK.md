# SPOTLIGHT — PRODUCTION EVENT-DAY OPERATING RUNBOOK

This operational runbook governs the execution of the live **Spotlight** talent competition event.

---

## 1. BEFORE EVENT (T-120 Minutes)

1. **Verify Backend Connectivity**:
   - Open Supabase Project Dashboard and confirm database status is `HEALTHY`.
   - Confirm all 9 migrations (`001` through `009`) are applied.
2. **Verify Frontend Deployment**:
   - Open production domain (Vercel deployment URL).
   - Test direct navigation to `/register`, `/ticket`, `/vote`, `/judge`, `/admin`, `/stage`, `/leaderboard`.
3. **Verify Auth Accounts**:
   - Log into `/admin` with designated Admin Supabase Auth email & password. Confirm access to Overview, Registrations, Running Order, and Live Event tabs.
   - Log into `/judge` on judge devices using assigned Judge Supabase Auth credentials. Confirm judge names and anchor designations.
4. **Verify Event Configuration**:
   - Confirm Event `status` is set to `READY` (or `LIVE`).
   - Confirm `capacity = 800` and `ticket_price = 10`.
5. **Verify Acts & Running Order**:
   - Check all submitted performer registrations in Admin → Registrations tab.
   - Approve confirmed acts and verify running order slots in Admin → Running Order tab.
6. **Verify Stage Display & Leaderboard**:
   - Open `/stage` on auditorium stage display monitor. Confirm current act title, performer name, and artwork are clear.
   - Open `/leaderboard` on public scoreboard screen.
7. **Perform End-to-End Dry-Run**:
   - Issue 1 test ticket (`/ticket`).
   - Cast 1 vote (`/vote`).
   - Submit 1 judge score sheet (`/judge`).
   - Verify live updates on Leaderboard (`/leaderboard`).

---

## 2. START EVENT (Event Launch)

1. **Set Event Status to LIVE**:
   - In Admin → Live Event Control tab, click **SET EVENT LIVE**.
2. **Select First Act**:
   - Click **SET CURRENT ACT** for Act 01 (Slot #1 in Running Order).
   - Verify `/stage` display updates automatically to Act 01.
3. **Open Audience Voting**:
   - In Admin Control bar, click **OPEN VOTING**.
   - Confirm voting timer starts and public `/vote` page enables rating submission for Act 01.

---

## 3. DURING EVENT (Live Act Progression Loop)

For each act in the running order:

1. **Announce Performance**:
   - MC introduces current act as shown on Stage Display (`/stage`).
2. **Performance Execution**:
   - Performer executes act on stage.
3. **Judge Scoring**:
   - All 3 judges score the act on their isolated devices (`/judge`).
   - Judges click **Submit & Lock Score**.
   - Admin monitors judge submissions matrix in Admin → Judges tab.
4. **Audience Voting**:
   - Audience members vote 1–10 on mobile devices (`/vote`).
5. **Close Voting**:
   - Admin clicks **CLOSE VOTING** when performance ends.
6. **Advance to Next Act**:
   - Admin clicks **NEXT ACT**.
   - System updates current act, advances stage display (`/stage`), and resets voting slate.

---

## 4. AFTER EVENT (Event Conclusion)

1. **Close Final Voting**:
   - Click **CLOSE VOTING** after final performance.
2. **Set Event Status to ENDED**:
   - In Admin → Live Event Control tab, click **END EVENT**.
3. **Verify Final Results & Leaderboard**:
   - Open Admin → Results tab and public `/leaderboard`.
   - Verify calculations:
     $$\text{Final Score} = (\text{Panel Score} \times 0.60) + (\text{Audience Score} \times 0.40)$$
   - Check tiebreaker resolutions (Anchor Judge score for Solo, Audience score for Group).
4. **Award Ceremony & Announcement**:
   - Present awards based on official Solo and Group Track leaderboards.
5. **Data Preservation & Audit Log Review**:
   - Review Admin → Overview logs.
   - Database records remain safely persisted in Supabase for audit compliance.
