import {
  MOCK_ADMIN_REGISTRATIONS,
  MOCK_ADMIN_TICKETS,
  MOCK_ACTS,
  MOCK_JUDGES,
} from '../data/eventData';
import type {
  AdminRegistration,
  RegistrationStatus,
  Act,
  LiveEventState,
  AdminTicketOrder,
} from '../types';
import { supabase, isSupabaseEnabled, isUuid, logSupabaseError } from '../lib/supabase/client';
import type { DbAct, DbTicket, DbJudge } from '../types/database';

// In-memory mock state stores for mock mode
let registrationsStore: AdminRegistration[] = [...MOCK_ADMIN_REGISTRATIONS];
let runningOrderStore: Act[] = [...MOCK_ACTS];
let liveStateStore: LiveEventState = {
  eventStatus: 'live',
  currentActId: 'act-01',
  votingOpen: true,
  votingTimeRemaining: 42,
  totalVotesReceived: 247,
};

/**
 * Authenticates admin PIN access code (e.g. ADMIN-2026).
 */
export const authenticateAdminCode = async (code: string): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return code.trim().toUpperCase() === 'ADMIN-2026';
};

/**
 * Maps Supabase DbAct to AdminRegistration type.
 */
const mapDbActToRegistration = (act: any): AdminRegistration => {
  const members = (act.act_members || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    department: m.department || '',
    year: m.year || '',
  }));

  const statusMap: Record<string, RegistrationStatus> = {
    PENDING: 'pending',
    APPROVED: 'confirmed',
    REJECTED: 'rejected',
  };

  return {
    id: act.id,
    actId: act.act_code,
    submittedAt: act.created_at || new Date().toISOString(),
    status: statusMap[act.status] || 'pending',
    category: act.category === 'GROUP' ? 'group' : 'solo',
    performerName: act.performer_name,
    department: act.department || 'N/A',
    year: act.year || 'N/A',
    phone: act.phone || 'N/A',
    email: act.email || 'N/A',
    performanceType: act.performance_type || act.title || 'Performance',
    blurb: act.bio || '',
    selfRating: act.self_rating || 8,
    teamMembers: members,
    photoUrl: act.photo_url || undefined,
  };
};

/**
 * Maps Supabase DbAct to Act domain object.
 */
const mapDbActToAct = (act: any, idx: number): Act => {
  return {
    id: act.id,
    slotNumber: act.running_order || idx + 1,
    title: act.title || 'Untitled Performance',
    performerName: act.performer_name,
    category: act.category === 'GROUP' ? 'group' : 'solo',
    department: act.department || 'N/A',
    year: act.year || 'N/A',
    performanceType: act.performance_type || act.title,
    blurb: act.bio || '',
    photoUrl: act.photo_url || '',
  };
};

/**
 * Fetches all performer registrations from Supabase or mock store.
 */
export const getAdminRegistrations = async (): Promise<AdminRegistration[]> => {
  if (!isSupabaseEnabled || !supabase) {
    return [...registrationsStore];
  }

  try {
    const { data, error } = await supabase
      .from('acts')
      .select('*, act_members(*)')
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('AdminService', 'getAdminRegistrations', error);
      return [...registrationsStore];
    }
    if (!data) return [...registrationsStore];
    return data.map(mapDbActToRegistration);
  } catch (err) {
    logSupabaseError('AdminService', 'getAdminRegistrations', err);
    return [...registrationsStore];
  }
};

/**
 * Updates registration status (pending -> confirmed / rejected).
 */
export const updateRegistrationStatus = async (
  id: string,
  status: RegistrationStatus
): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    registrationsStore = registrationsStore.map((r) =>
      r.id === id ? { ...r, status } : r
    );
    return true;
  }

  try {
    if (status === 'confirmed') {
      const { error } = await (supabase as any).rpc('admin_approve_registration', { act_id_input: id });
      if (error) {
        logSupabaseError('AdminService', 'admin_approve_registration', error);
        return false;
      }
    } else if (status === 'rejected') {
      const { error } = await (supabase as any).rpc('admin_reject_registration', { act_id_input: id });
      if (error) {
        logSupabaseError('AdminService', 'admin_reject_registration', error);
        return false;
      }
    } else {
      const { error } = await (supabase.from('acts') as any).update({ status: 'PENDING' }).eq('id', id);
      if (error) {
        logSupabaseError('AdminService', 'updateRegistrationStatus PENDING', error);
        return false;
      }
    }
    return true;
  } catch (err) {
    logSupabaseError('AdminService', 'updateRegistrationStatus', err);
    return false;
  }
};

/**
 * Gets current running order list (approved acts sorted by running_order).
 */
export const getRunningOrder = async (): Promise<Act[]> => {
  if (!isSupabaseEnabled || !supabase) {
    return [...runningOrderStore];
  }

  try {
    const { data, error } = await supabase
      .from('acts')
      .select('*')
      .eq('status', 'APPROVED')
      .order('running_order', { ascending: true });

    if (error) {
      logSupabaseError('AdminService', 'getRunningOrder', error);
      return [...runningOrderStore];
    }
    if (!data || data.length === 0) {
      return [...runningOrderStore];
    }

    return data.map((act, idx) => mapDbActToAct(act, idx));
  } catch (err) {
    logSupabaseError('AdminService', 'getRunningOrder', err);
    return [...runningOrderStore];
  }
};

/**
 * Reorders acts or swaps positions.
 * Skips updating DB if act.id is not a valid UUID to avoid HTTP 400 invalid input syntax error.
 */
export const reorderActs = async (newActs: Act[]): Promise<Act[]> => {
  if (!isSupabaseEnabled || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    runningOrderStore = newActs.map((a, idx) => ({ ...a, slotNumber: idx + 1 }));
    return [...runningOrderStore];
  }

  try {
    for (let idx = 0; idx < newActs.length; idx++) {
      const act = newActs[idx];
      if (!isUuid(act.id)) continue;

      const { error } = await (supabase.from('acts') as any)
        .update({ running_order: idx + 1 })
        .eq('id', act.id);

      if (error) {
        logSupabaseError('AdminService', 'reorderActs', error);
      }
    }
    return await getRunningOrder();
  } catch (err) {
    logSupabaseError('AdminService', 'reorderActs', err);
    return newActs;
  }
};

/**
 * Gets live event control state.
 * Returns valid UUID or empty string for currentActId (does NOT force mock ID 'act-01').
 */
export const getLiveEventState = async (): Promise<LiveEventState> => {
  if (!isSupabaseEnabled || !supabase) {
    return { ...liveStateStore };
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, status, current_act_id, voting_open')
      .order('created_at', { ascending: false })
      .maybeSingle();

    const { count: voteCount, error: voteErr } = await supabase
      .from('audience_votes')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logSupabaseError('AdminService', 'getLiveEventState (events)', error);
    }
    if (voteErr) {
      logSupabaseError('AdminService', 'getLiveEventState (audience_votes)', voteErr);
    }

    if (!data) {
      return { ...liveStateStore };
    }

    const statusMap: Record<string, 'scheduled' | 'live' | 'paused' | 'ended'> = {
      DRAFT: 'scheduled',
      READY: 'scheduled',
      LIVE: 'live',
      PAUSED: 'paused',
      ENDED: 'ended',
    };

    const dbEvent = data as any;
    const currentState: LiveEventState = {
      eventStatus: statusMap[dbEvent.status] || 'live',
      currentActId: isUuid(dbEvent.current_act_id) ? dbEvent.current_act_id : '',
      votingOpen: dbEvent.voting_open ?? false,
      votingTimeRemaining: dbEvent.voting_open ? 45 : 0,
      totalVotesReceived: voteCount || 0,
    };

    liveStateStore = currentState;
    return currentState;
  } catch (err) {
    logSupabaseError('AdminService', 'getLiveEventState', err);
    return { ...liveStateStore };
  }
};

/**
 * Updates live event state (voting status, active act, event status).
 * Validates currentActId: passes NULL if not a valid UUID (e.g. 'act-01') to prevent HTTP 400 error.
 */
export const updateLiveEventState = async (
  newState: Partial<LiveEventState>
): Promise<LiveEventState> => {
  if (!isSupabaseEnabled || !supabase) {
    liveStateStore = { ...liveStateStore, ...newState };
    return { ...liveStateStore };
  }

  try {
    const statusMap: Record<string, string> = {
      scheduled: 'READY',
      live: 'LIVE',
      paused: 'PAUSED',
      ended: 'ENDED',
    };

    const p_status = newState.eventStatus ? statusMap[newState.eventStatus] : null;
    const p_voting_open = newState.votingOpen !== undefined ? newState.votingOpen : null;
    const p_current_act_id = isUuid(newState.currentActId) ? newState.currentActId : null;

    const { data, error } = await (supabase as any).rpc('admin_update_event_state', {
      p_status,
      p_voting_open,
      p_current_act_id,
    });

    if (error) {
      logSupabaseError('AdminService', 'updateLiveEventState', error);
    }

    return await getLiveEventState();
  } catch (err) {
    logSupabaseError('AdminService', 'updateLiveEventState', err);
    liveStateStore = { ...liveStateStore, ...newState };
    return { ...liveStateStore };
  }
};

/**
 * Generates judge submission matrix: Record<judgeId, Record<actId, boolean>>
 * Maps entries by judge ID, judge code, act ID, and act code for mock/UI compatibility.
 */
export const getJudgeMatrix = async (): Promise<Record<string, Record<string, boolean>>> => {
  if (!isSupabaseEnabled || !supabase) {
    const matrix: Record<string, Record<string, boolean>> = {};
    MOCK_JUDGES.forEach((j) => {
      matrix[j.id] = {
        'act-01': true,
        'act-02': true,
        'act-03': j.id !== 'judge-02',
        'act-04': false,
      };
    });
    return matrix;
  }

  try {
    const [scoresRes, judgesRes, actsRes] = await Promise.all([
      supabase.from('judge_scores').select('judge_id, act_id, submitted'),
      supabase.from('judges').select('id, judge_code'),
      supabase.from('acts').select('id, act_code, running_order'),
    ]);

    if (scoresRes.error) logSupabaseError('AdminService', 'getJudgeMatrix (scores)', scoresRes.error);
    if (judgesRes.error) logSupabaseError('AdminService', 'getJudgeMatrix (judges)', judgesRes.error);
    if (actsRes.error) logSupabaseError('AdminService', 'getJudgeMatrix (acts)', actsRes.error);

    const judges = judgesRes.data || [];
    const acts = actsRes.data || [];
    const scores = scoresRes.data || [];

    const judgeCodeMap: Record<string, string> = {};
    judges.forEach((j: any) => {
      if (j.id) judgeCodeMap[j.id] = j.judge_code;
    });

    const actCodeMap: Record<string, string> = {};
    const actSlotMap: Record<string, string> = {};
    acts.forEach((a: any, idx: number) => {
      if (a.id) {
        actCodeMap[a.id] = a.act_code;
        const slot = a.running_order || idx + 1;
        actSlotMap[a.id] = `act-${slot.toString().padStart(2, '0')}`;
      }
    });

    const matrix: Record<string, Record<string, boolean>> = {};

    scores.forEach((s: any) => {
      const judgeKeys = [s.judge_id, judgeCodeMap[s.judge_id]].filter(Boolean);
      const actKeys = [s.act_id, actCodeMap[s.act_id], actSlotMap[s.act_id]].filter(Boolean);
      const submitted = s.submitted ?? false;

      judgeKeys.forEach((jKey) => {
        if (!matrix[jKey]) matrix[jKey] = {};
        actKeys.forEach((aKey) => {
          matrix[jKey][aKey] = submitted;
        });
      });
    });

    return matrix;
  } catch (err) {
    logSupabaseError('AdminService', 'getJudgeMatrix', err);
    return {};
  }
};

/**
 * Gets ticket orders list for Admin overview.
 */
export const getAdminTickets = async (): Promise<AdminTicketOrder[]> => {
  if (!isSupabaseEnabled || !supabase) {
    return [...MOCK_ADMIN_TICKETS];
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('AdminService', 'getAdminTickets', error);
      return [...MOCK_ADMIN_TICKETS];
    }
    if (!data) return [...MOCK_ADMIN_TICKETS];

    // Group tickets by payment_reference to form order groups
    const ordersMap: Record<string, AdminTicketOrder> = {};

    ((data as any[]) || []).forEach((tkt: any, idx: number) => {
      const ref = tkt.payment_reference || `MOCK-PAY-${idx + 1}`;
      if (!ordersMap[ref]) {
        ordersMap[ref] = {
          id: `SPT-ORD-${ref.replace(/[^0-9]/g, '').slice(0, 4) || idx + 1}`,
          paymentId: ref,
          buyerName: tkt.buyer_name,
          buyerEmail: tkt.buyer_email,
          buyerPhone: tkt.buyer_phone || 'N/A',
          quantity: tkt.quantity || 1,
          totalAmount: (tkt.quantity || 1) * 10,
          status: 'CONFIRMED',
          createdAt: tkt.created_at,
          tickets: [tkt.ticket_code],
        };
      } else {
        ordersMap[ref].quantity += (tkt.quantity || 1);
        ordersMap[ref].totalAmount += (tkt.quantity || 1) * 10;
        if (ordersMap[ref].tickets) {
          ordersMap[ref].tickets.push(tkt.ticket_code);
        }
      }
    });

    return Object.values(ordersMap);
  } catch (err) {
    logSupabaseError('AdminService', 'getAdminTickets', err);
    return [...MOCK_ADMIN_TICKETS];
  }
};

/**
 * Supabase Realtime Subscription for live event state changes across tabs.
 */
export const subscribeToEventState = (
  onStateChange: (state: LiveEventState) => void
): (() => void) => {
  if (!isSupabaseEnabled || !supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('admin_event_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        async () => {
          const newState = await getLiveEventState();
          onStateChange(newState);
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  } catch (err) {
    console.warn('[AdminService] Failed to initialize Realtime subscription:', err);
    return () => {};
  }
};
