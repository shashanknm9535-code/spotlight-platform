/**
 * src/services/judgeAssignmentService.ts
 *
 * Judge Assignment Service for Spotlight.
 * Manages schedule assignments in the judge_assignments table.
 *
 * Admin functions:
 *   getJudgeAssignments()   — all assignments for the current event
 *   createJudgeAssignment() — create an assignment
 *   updateJudgeAssignment() — edit time/role/notes/judge
 *   deleteJudgeAssignment() — remove an assignment (does NOT delete judge or scores)
 *
 * Judge function:
 *   getMyJudgeAssignments() — the signed-in judge's own assignments
 *
 * CRITICAL:
 *   Assignments are ORGANISATIONAL CONTEXT ONLY.
 *   They do NOT control judge access to /judge.
 *   Judge access is controlled by Supabase Auth + is_active flag.
 *
 * Production errors do NOT silently fall back to mock data.
 */

import type { JudgeAssignment } from '../types';
import { supabase, isSupabaseEnabled, isUuid, logSupabaseError } from '../lib/supabase/client';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_EVENT_ID = 'event-mock-001';

const mockAssignmentsStore: JudgeAssignment[] = [
  {
    id: 'assign-01',
    eventId: MOCK_EVENT_ID,
    judgeId: 'judge-01',
    judgeName: 'Dr. Sarah Jenkins',
    judgeCode: 'JUDGE-01',
    judgeIsAnchor: true,
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // started 30min ago
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),   // ends in 1h
    roleOverride: 'ANCHOR',
    notes: 'Opening session anchor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'assign-02',
    eventId: MOCK_EVENT_ID,
    judgeId: 'judge-02',
    judgeName: 'Marcus Chen',
    judgeCode: 'JUDGE-02',
    judgeIsAnchor: false,
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    roleOverride: 'PANEL',
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'assign-03',
    eventId: MOCK_EVENT_ID,
    judgeId: 'judge-01',
    judgeName: 'Dr. Sarah Jenkins',
    judgeCode: 'JUDGE-01',
    judgeIsAnchor: true,
    startTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // future slot
    endTime: new Date(Date.now() + 150 * 60 * 1000).toISOString(),
    roleOverride: 'ANCHOR',
    notes: 'Second session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Mapper ───────────────────────────────────────────────────────────────────

const mapDbRow = (row: any): JudgeAssignment => ({
  id: row.id,
  eventId: row.eventId ?? row.event_id,
  judgeId: row.judgeId ?? row.judge_id,
  judgeName: row.judgeName ?? row.judge_name ?? undefined,
  judgeCode: row.judgeCode ?? row.judge_code ?? undefined,
  judgeIsAnchor: row.judgeIsAnchor ?? row.judge_is_anchor ?? false,
  startTime: row.startTime ?? row.start_time,
  endTime: row.endTime ?? row.end_time,
  roleOverride: row.roleOverride ?? row.role_override ?? null,
  notes: row.notes ?? null,
  createdAt: row.createdAt ?? row.created_at ?? undefined,
  updatedAt: row.updatedAt ?? row.updated_at ?? undefined,
});

// ─── Admin: Get All Assignments ───────────────────────────────────────────────

/**
 * Fetches all assignments for the current event.
 * Uses admin_get_judge_assignments RPC (active-admin only).
 * Returns [] on error. Does NOT fall back to mock data in production.
 */
export const getJudgeAssignments = async (
  eventId?: string
): Promise<JudgeAssignment[]> => {
  if (!isSupabaseEnabled || !supabase) {
    return [...mockAssignmentsStore];
  }

  try {
    const { data, error } = await (supabase as any).rpc('admin_get_judge_assignments', {
      p_event_id: eventId && isUuid(eventId) ? eventId : null,
    });

    if (error) {
      logSupabaseError('JudgeAssignmentService', 'getJudgeAssignments', error);
      return [];
    }
    if (!data) return [];

    return (Array.isArray(data) ? data : []).map(mapDbRow);
  } catch (err) {
    logSupabaseError('JudgeAssignmentService', 'getJudgeAssignments', err);
    return [];
  }
};

// ─── Admin: Create Assignment ─────────────────────────────────────────────────

/**
 * Creates a new judge assignment.
 * Validates end_time > start_time before inserting.
 * Overlapping assignments are allowed (organisational only).
 */
export const createJudgeAssignment = async (params: {
  judgeId: string;
  startTime: string;
  endTime: string;
  roleOverride?: 'ANCHOR' | 'PANEL' | null;
  notes?: string | null;
  eventId?: string;
}): Promise<JudgeAssignment> => {
  // Validate time range
  if (new Date(params.endTime) <= new Date(params.startTime)) {
    throw new Error('End time must be after start time.');
  }

  if (!isSupabaseEnabled || !supabase) {
    // Mock mode
    const now = new Date().toISOString();
    const newAssignment: JudgeAssignment = {
      id: `assign-${Date.now()}`,
      eventId: params.eventId ?? MOCK_EVENT_ID,
      judgeId: params.judgeId,
      judgeName: 'Mock Judge',
      judgeCode: 'JUDGE-??',
      judgeIsAnchor: params.roleOverride === 'ANCHOR',
      startTime: params.startTime,
      endTime: params.endTime,
      roleOverride: params.roleOverride ?? null,
      notes: params.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockAssignmentsStore.push(newAssignment);
    return newAssignment;
  }

  try {
    // Resolve event_id: use provided, or fetch current event
    let eventId = params.eventId && isUuid(params.eventId) ? params.eventId : null;
    if (!eventId) {
      const { data: evtData } = await (supabase as any).rpc('get_current_event_id');
      if (evtData) eventId = evtData as string;
    }
    if (!eventId) {
      throw new Error('No event found to assign the judge to. Please create an event first.');
    }

    const { data, error } = await (supabase as any)
      .from('judge_assignments')
      .insert({
        event_id: eventId,
        judge_id: params.judgeId,
        start_time: params.startTime,
        end_time: params.endTime,
        role_override: params.roleOverride ?? null,
        notes: params.notes ?? null,
      })
      .select(`
        id, event_id, judge_id, start_time, end_time, role_override, notes, created_at, updated_at,
        judges!inner(name, judge_code, is_anchor)
      `)
      .single();

    if (error) {
      logSupabaseError('JudgeAssignmentService', 'createJudgeAssignment', error);
      throw new Error(error.message || 'Failed to create assignment.');
    }

    return {
      id: data.id,
      eventId: data.event_id,
      judgeId: data.judge_id,
      judgeName: data.judges?.name ?? undefined,
      judgeCode: data.judges?.judge_code ?? undefined,
      judgeIsAnchor: data.judges?.is_anchor ?? false,
      startTime: data.start_time,
      endTime: data.end_time,
      roleOverride: data.role_override ?? null,
      notes: data.notes ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err: any) {
    if (err?.message && !err?.code) throw err;
    logSupabaseError('JudgeAssignmentService', 'createJudgeAssignment', err);
    throw new Error(err?.message || 'Failed to create assignment.');
  }
};

// ─── Admin: Update Assignment ─────────────────────────────────────────────────

/**
 * Updates an existing assignment's judge, times, role, or notes.
 * Validates end_time > start_time.
 */
export const updateJudgeAssignment = async (
  id: string,
  updates: {
    judgeId?: string;
    startTime?: string;
    endTime?: string;
    roleOverride?: 'ANCHOR' | 'PANEL' | null;
    notes?: string | null;
  }
): Promise<JudgeAssignment> => {
  if (updates.startTime && updates.endTime) {
    if (new Date(updates.endTime) <= new Date(updates.startTime)) {
      throw new Error('End time must be after start time.');
    }
  }

  if (!isSupabaseEnabled || !supabase) {
    // Mock mode
    const idx = mockAssignmentsStore.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Assignment not found.');
    const updated: JudgeAssignment = {
      ...mockAssignmentsStore[idx],
      judgeId: updates.judgeId ?? mockAssignmentsStore[idx].judgeId,
      startTime: updates.startTime ?? mockAssignmentsStore[idx].startTime,
      endTime: updates.endTime ?? mockAssignmentsStore[idx].endTime,
      roleOverride: updates.roleOverride !== undefined ? updates.roleOverride : mockAssignmentsStore[idx].roleOverride,
      notes: updates.notes !== undefined ? updates.notes : mockAssignmentsStore[idx].notes,
      updatedAt: new Date().toISOString(),
    };
    mockAssignmentsStore[idx] = updated;
    return updated;
  }

  try {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.judgeId) patch.judge_id = updates.judgeId;
    if (updates.startTime) patch.start_time = updates.startTime;
    if (updates.endTime) patch.end_time = updates.endTime;
    if (updates.roleOverride !== undefined) patch.role_override = updates.roleOverride;
    if (updates.notes !== undefined) patch.notes = updates.notes;

    const { data, error } = await (supabase as any)
      .from('judge_assignments')
      .update(patch)
      .eq('id', id)
      .select(`
        id, event_id, judge_id, start_time, end_time, role_override, notes, created_at, updated_at,
        judges!inner(name, judge_code, is_anchor)
      `)
      .single();

    if (error) {
      logSupabaseError('JudgeAssignmentService', 'updateJudgeAssignment', error);
      throw new Error(error.message || 'Failed to update assignment.');
    }

    return {
      id: data.id,
      eventId: data.event_id,
      judgeId: data.judge_id,
      judgeName: data.judges?.name ?? undefined,
      judgeCode: data.judges?.judge_code ?? undefined,
      judgeIsAnchor: data.judges?.is_anchor ?? false,
      startTime: data.start_time,
      endTime: data.end_time,
      roleOverride: data.role_override ?? null,
      notes: data.notes ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err: any) {
    if (err?.message && !err?.code) throw err;
    logSupabaseError('JudgeAssignmentService', 'updateJudgeAssignment', err);
    throw new Error(err?.message || 'Failed to update assignment.');
  }
};

// ─── Admin: Delete Assignment ─────────────────────────────────────────────────

/**
 * Deletes a single assignment.
 * Does NOT delete the judge, auth user, or any scores.
 */
export const deleteJudgeAssignment = async (id: string): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) {
    const idx = mockAssignmentsStore.findIndex((a) => a.id === id);
    if (idx !== -1) mockAssignmentsStore.splice(idx, 1);
    return true;
  }

  try {
    const { error } = await (supabase as any)
      .from('judge_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      logSupabaseError('JudgeAssignmentService', 'deleteJudgeAssignment', error);
      return false;
    }
    return true;
  } catch (err) {
    logSupabaseError('JudgeAssignmentService', 'deleteJudgeAssignment', err);
    return false;
  }
};

// ─── Judge: Get My Assignments ────────────────────────────────────────────────

/**
 * Returns the signed-in judge's own assignments for the current event.
 * Uses get_my_judge_assignments RPC (resolves judge from auth.uid() server-side).
 * Returns [] if judge has no assignments (does NOT block panel access).
 */
export const getMyJudgeAssignments = async (
  eventId?: string
): Promise<JudgeAssignment[]> => {
  if (!isSupabaseEnabled || !supabase) {
    // Mock mode: return all mock assignments (for demo)
    return [...mockAssignmentsStore];
  }

  try {
    const { data, error } = await (supabase as any).rpc('get_my_judge_assignments', {
      p_event_id: eventId && isUuid(eventId) ? eventId : null,
    });

    if (error) {
      logSupabaseError('JudgeAssignmentService', 'getMyJudgeAssignments', error);
      return [];
    }
    if (!data) return [];

    return (Array.isArray(data) ? data : []).map(mapDbRow);
  } catch (err) {
    logSupabaseError('JudgeAssignmentService', 'getMyJudgeAssignments', err);
    return [];
  }
};
