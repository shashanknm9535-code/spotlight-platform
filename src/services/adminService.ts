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
  OverviewStats,
  JudgeDetail,
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
 * Returns [] on error or empty DB in production mode (never returns mock data in production).
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
      return [];
    }
    if (!data) return [];
    return data.map(mapDbActToRegistration);
  } catch (err) {
    logSupabaseError('AdminService', 'getAdminRegistrations', err);
    return [];
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
 * Returns [] on error or empty DB in production mode (never returns mock data in production).
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
      return [];
    }
    if (!data) return [];

    return data.map((act, idx) => mapDbActToAct(act, idx));
  } catch (err) {
    logSupabaseError('AdminService', 'getRunningOrder', err);
    return [];
  }
};

/**
 * Reorders acts or swaps positions.
 * Uses a safe two-pass update to prevent index collision during sequential updates.
 */
export const reorderActs = async (newActs: Act[]): Promise<Act[]> => {
  if (!isSupabaseEnabled || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    runningOrderStore = newActs.map((a, idx) => ({ ...a, slotNumber: idx + 1 }));
    return [...runningOrderStore];
  }

  try {
    const validActs = newActs.filter((a) => isUuid(a.id));

    // Pass 1: Offset to temporary range
    for (let idx = 0; idx < validActs.length; idx++) {
      await (supabase.from('acts') as any)
        .update({ running_order: 1000 + idx + 1 })
        .eq('id', validActs[idx].id);
    }

    // Pass 2: Set final unique sequential running order
    for (let idx = 0; idx < validActs.length; idx++) {
      const { error } = await (supabase.from('acts') as any)
        .update({ running_order: idx + 1 })
        .eq('id', validActs[idx].id);

      if (error) {
        logSupabaseError('AdminService', 'reorderActs', error);
      }
    }
    return await getRunningOrder();
  } catch (err) {
    logSupabaseError('AdminService', 'reorderActs', err);
    return await getRunningOrder();
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
      return {
        eventStatus: 'scheduled',
        currentActId: '',
        votingOpen: false,
        votingTimeRemaining: 0,
        totalVotesReceived: 0,
      };
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
      eventStatus: statusMap[dbEvent.status] || 'scheduled',
      currentActId: isUuid(dbEvent.current_act_id) ? dbEvent.current_act_id : '',
      votingOpen: dbEvent.voting_open ?? false,
      votingTimeRemaining: dbEvent.voting_open ? 45 : 0,
      totalVotesReceived: voteCount || 0,
    };

    liveStateStore = currentState;
    return currentState;
  } catch (err) {
    logSupabaseError('AdminService', 'getLiveEventState', err);
    return {
      eventStatus: 'scheduled',
      currentActId: '',
      votingOpen: false,
      votingTimeRemaining: 0,
      totalVotesReceived: 0,
    };
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
      const submitted = s.submitted ?? true;

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
 * Returns [] on error or empty DB in production mode (never returns mock data in production).
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
      return [];
    }
    if (!data) return [];

    // Group tickets by payment_reference to form order groups
    const ordersMap: Record<string, AdminTicketOrder> = {};

    ((data as any[]) || []).forEach((tkt: any, idx: number) => {
      const ref = tkt.payment_reference || `PAY-${idx + 1}`;
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
    return [];
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
    const channelId = `admin_event_state_changes_${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
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

/**
 * Gets dynamic summary stats for Admin Overview tab.
 */
export const getOverviewStats = async (): Promise<OverviewStats> => {
  if (!isSupabaseEnabled || !supabase) {
    return {
      totalPerformers: 126,
      confirmedPerformers: 98,
      pendingPerformers: 28,
      ticketsSold: 643,
      totalCapacity: 800,
      activeJudges: 3,
      totalJudges: 3,
    };
  }

  try {
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('admin_get_overview_stats');
    if (!rpcError && rpcData) {
      const res = rpcData as any;
      return {
        totalPerformers: res.total_performers ?? res.totalPerformers ?? 0,
        confirmedPerformers: res.confirmed_performers ?? res.confirmedPerformers ?? 0,
        pendingPerformers: res.pending_performers ?? res.pendingPerformers ?? 0,
        ticketsSold: res.tickets_sold ?? res.ticketsSold ?? 0,
        totalCapacity: res.total_capacity ?? res.totalCapacity ?? 800,
        activeJudges: res.active_judges ?? res.activeJudges ?? 0,
        totalJudges: res.total_judges ?? res.totalJudges ?? 0,
      };
    }

    // Direct table queries fallback if RPC does not exist
    const [{ count: confirmedCount }, { count: pendingCount }, { count: ticketCount }, { count: judgeCount }] = await Promise.all([
      supabase.from('acts').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
      supabase.from('acts').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }),
      supabase.from('judges').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const confirmed = confirmedCount || 0;
    const pending = pendingCount || 0;

    return {
      totalPerformers: confirmed + pending,
      confirmedPerformers: confirmed,
      pendingPerformers: pending,
      ticketsSold: ticketCount || 0,
      totalCapacity: 800,
      activeJudges: judgeCount || 0,
      totalJudges: judgeCount || 0,
    };
  } catch (err) {
    logSupabaseError('AdminService', 'getOverviewStats', err);
    return {
      totalPerformers: 0,
      confirmedPerformers: 0,
      pendingPerformers: 0,
      ticketsSold: 0,
      totalCapacity: 800,
      activeJudges: 0,
      totalJudges: 0,
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// JUDGE MANAGEMENT — Admin-only CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all judge records (active + inactive).
 * Requires active-admin session (enforced by RLS via judges_admin_all policy).
 */
export const getJudges = async (): Promise<JudgeDetail[]> => {
  if (!isSupabaseEnabled || !supabase) {
    // Mock mode: return hard-coded mock judges
    const { MOCK_JUDGES } = await import('../data/eventData');
    return MOCK_JUDGES.map((j) => ({
      id: j.id,
      name: j.name,
      email: '',
      code: j.code,
      isAnchor: false,
      isActive: true,
    }));
  }

  try {
    const { data, error } = await supabase
      .from('judges')
      .select('id, name, email, judge_code, is_anchor, is_active, auth_user_id, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      logSupabaseError('AdminService', 'getJudges', error);
      return [];
    }
    if (!data) return [];

    return (data as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email || '',
      code: row.judge_code,
      isAnchor: row.is_anchor ?? false,
      isActive: row.is_active ?? true,
      authUserId: row.auth_user_id || null,
      createdAt: row.created_at,
    }));
  } catch (err) {
    logSupabaseError('AdminService', 'getJudges', err);
    return [];
  }
};

/**
 * Creates a new judge record via the admin_create_judge security-definer RPC.
 * The RPC auto-generates the JUDGE-XX code and enforces admin-only access.
 * No service-role key is used in the browser.
 */
export const createJudge = async (
  name: string,
  email: string,
  isAnchor: boolean = false
): Promise<JudgeDetail | null> => {
  if (!isSupabaseEnabled || !supabase) {
    // Mock mode stub
    const newJudge: JudgeDetail = {
      id: `mock-judge-${Date.now()}`,
      name,
      email,
      code: `JUDGE-0${Math.floor(Math.random() * 90 + 10)}`,
      isAnchor,
      isActive: true,
    };
    return newJudge;
  }

  try {
    const { data, error } = await (supabase as any).rpc('admin_create_judge', {
      p_name: name,
      p_email: email,
      p_is_anchor: isAnchor,
    });

    if (error) {
      logSupabaseError('AdminService', 'createJudge', error);
      const msg = error.message || '';
      if (msg.includes('UNAUTHORIZED')) throw new Error('Only active admins can create judges.');
      if (msg.includes('INVALID_EMAIL')) throw new Error('A valid email address is required.');
      if (msg.includes('INVALID_NAME')) throw new Error('Judge full name is required.');
      throw new Error('Failed to create judge. Please try again.');
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      code: data.code,
      isAnchor: data.is_anchor ?? isAnchor,
      isActive: data.is_active ?? true,
    };
  } catch (err: any) {
    if (err?.message && !err?.code) throw err;
    logSupabaseError('AdminService', 'createJudge', err);
    throw new Error(err?.message || 'Failed to create judge.');
  }
};

/**
 * Toggles judge active status (activate / deactivate).
 * Uses direct UPDATE protected by the judges_admin_all RLS policy.
 */
export const setJudgeActive = async (
  judgeId: string,
  isActive: boolean
): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) {
    return true;
  }

  try {
    const { error } = await (supabase as any)
      .from('judges')
      .update({ is_active: isActive })
      .eq('id', judgeId);

    if (error) {
      logSupabaseError('AdminService', 'setJudgeActive', error);
      return false;
    }
    return true;
  } catch (err) {
    logSupabaseError('AdminService', 'setJudgeActive', err);
    return false;
  }
};
