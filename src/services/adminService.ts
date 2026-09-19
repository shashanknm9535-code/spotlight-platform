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
import { supabase, isSupabaseEnabled } from '../lib/supabase/client';
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

    if (error || !data) return [...registrationsStore];
    return data.map(mapDbActToRegistration);
  } catch (err) {
    console.error('[AdminService] Error fetching admin registrations:', err);
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
      await (supabase as any).rpc('admin_approve_registration', { act_id_input: id });
    } else if (status === 'rejected') {
      await (supabase as any).rpc('admin_reject_registration', { act_id_input: id });
    } else {
      await (supabase.from('acts') as any).update({ status: 'PENDING' }).eq('id', id);
    }
    return true;
  } catch (err) {
    console.error('[AdminService] Error updating registration status:', err);
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

    if (error || !data || data.length === 0) {
      return [...runningOrderStore];
    }

    return data.map((act, idx) => mapDbActToAct(act, idx));
  } catch (err) {
    console.error('[AdminService] Error fetching running order:', err);
    return [...runningOrderStore];
  }
};

/**
 * Reorders acts or swaps positions.
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
      await (supabase.from('acts') as any)
        .update({ running_order: idx + 1 })
        .eq('id', act.id);
    }
    return await getRunningOrder();
  } catch (err) {
    console.error('[AdminService] Error reordering acts:', err);
    return newActs;
  }
};

/**
 * Gets live event control state.
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

    const { count: voteCount } = await supabase
      .from('audience_votes')
      .select('*', { count: 'exact', head: true });

    if (error || !data) {
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
      currentActId: dbEvent.current_act_id || 'act-01',
      votingOpen: dbEvent.voting_open ?? false,
      votingTimeRemaining: dbEvent.voting_open ? 45 : 0,
      totalVotesReceived: voteCount || 0,
    };

    liveStateStore = currentState;
    return currentState;
  } catch (err) {
    console.error('[AdminService] Error fetching live event state:', err);
    return { ...liveStateStore };
  }
};

/**
 * Updates live event state (voting status, active act, event status).
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
    const p_current_act_id = newState.currentActId || null;

    await (supabase as any).rpc('admin_update_event_state', {
      p_status,
      p_voting_open,
      p_current_act_id,
    });

    return await getLiveEventState();
  } catch (err) {
    console.error('[AdminService] Error updating live event state:', err);
    liveStateStore = { ...liveStateStore, ...newState };
    return { ...liveStateStore };
  }
};

/**
 * Generates judge submission matrix: Record<judgeId, Record<actId, boolean>>
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
    const { data: scores } = await supabase
      .from('judge_scores')
      .select('judge_id, act_id, submitted');

    const matrix: Record<string, Record<string, boolean>> = {};
    ((scores as any[]) || []).forEach((s: any) => {
      if (!matrix[s.judge_id]) matrix[s.judge_id] = {};
      matrix[s.judge_id][s.act_id] = s.submitted ?? false;
    });

    return matrix;
  } catch (err) {
    console.error('[AdminService] Error building judge matrix:', err);
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

    if (error || !data) return [...MOCK_ADMIN_TICKETS];

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
    console.error('[AdminService] Error fetching admin tickets:', err);
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
