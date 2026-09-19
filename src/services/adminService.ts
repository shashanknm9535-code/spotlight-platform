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

// In-memory mock state stores
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
 * Authenticates admin pin code.
 */
export const authenticateAdminCode = async (code: string): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms auth latency
  return code.trim().toUpperCase() === 'ADMIN-2026';
};

/**
 * Fetches registrations list.
 */
export const getAdminRegistrations = (): AdminRegistration[] => {
  return [...registrationsStore];
};

/**
 * Updates registration status (pending -> confirmed / rejected).
 */
export const updateRegistrationStatus = async (
  id: string,
  status: RegistrationStatus
): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  registrationsStore = registrationsStore.map((r) =>
    r.id === id ? { ...r, status } : r
  );
  return true;
};

/**
 * Gets current running order list.
 */
export const getRunningOrder = (): Act[] => {
  return [...runningOrderStore];
};

/**
 * Reorders acts or swaps positions.
 */
export const reorderActs = async (newActs: Act[]): Promise<Act[]> => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  runningOrderStore = newActs.map((a, idx) => ({ ...a, slotNumber: idx + 1 }));
  return [...runningOrderStore];
};

/**
 * Gets live event control state.
 */
export const getLiveEventState = (): LiveEventState => {
  return { ...liveStateStore };
};

/**
 * Updates live event state (voting status, active act, time remaining).
 */
export const updateLiveEventState = async (
  newState: Partial<LiveEventState>
): Promise<LiveEventState> => {
  liveStateStore = { ...liveStateStore, ...newState };
  return { ...liveStateStore };
};

/**
 * Generates mock judge submission matrix: Record<judgeId, Record<actId, boolean>>
 */
export const getJudgeMatrix = (): Record<string, Record<string, boolean>> => {
  const matrix: Record<string, Record<string, boolean>> = {};
  MOCK_JUDGES.forEach((j) => {
    matrix[j.id] = {
      'act-01': true,
      'act-02': true,
      'act-03': j.id !== 'judge-02', // Judge 02 pending on Act 03
      'act-04': false,
    };
  });
  return matrix;
};

/**
 * Gets ticket orders list.
 */
export const getAdminTickets = (): AdminTicketOrder[] => {
  return [...MOCK_ADMIN_TICKETS];
};
