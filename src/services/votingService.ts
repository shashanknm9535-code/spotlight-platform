import { MOCK_VALID_TICKETS } from '../data/eventData';
import type { VoteRecord } from '../types';

// In-memory mock vote store
const voteStore: Record<string, VoteRecord[]> = {};

/**
 * Validates a ticket ID string.
 * Returns true if ticket starts with 'SPT-TKT-' or is in mock list.
 */
export const validateTicketId = async (ticketId: string): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms validation latency

  const normalized = ticketId.trim().toUpperCase();

  // Accept any ticket starting with SPT-TKT- or in mock list
  if (normalized.startsWith('SPT-TKT-') && normalized.length >= 12) {
    return true;
  }

  return MOCK_VALID_TICKETS.includes(normalized);
};

/**
 * Submits an audience vote for an act using a validated ticket ID.
 */
export const submitAudienceVote = async (
  ticketId: string,
  actId: string,
  rating: number
): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s submit latency

  const normalizedTicket = ticketId.trim().toUpperCase();

  if (!voteStore[normalizedTicket]) {
    voteStore[normalizedTicket] = [];
  }

  // Prevent duplicate voting for the same act
  const existingVote = voteStore[normalizedTicket].find((v) => v.actId === actId);
  if (existingVote) {
    throw new Error('You have already voted for this act.');
  }

  voteStore[normalizedTicket].push({
    ticketId: normalizedTicket,
    actId,
    rating,
    timestamp: new Date().toISOString(),
  });

  return true;
};

/**
 * Checks if a ticket has already voted for a specific act.
 */
export const hasVotedForAct = (ticketId: string, actId: string): boolean => {
  const normalizedTicket = ticketId.trim().toUpperCase();
  const votes = voteStore[normalizedTicket] || [];
  return votes.some((v) => v.actId === actId);
};

/**
 * Retrieves the rating cast by a ticket for a specific act.
 */
export const getVotedRating = (ticketId: string, actId: string): number | null => {
  const normalizedTicket = ticketId.trim().toUpperCase();
  const votes = voteStore[normalizedTicket] || [];
  const vote = votes.find((v) => v.actId === actId);
  return vote ? vote.rating : null;
};

/**
 * Clears in-memory mock votes (for dev testing).
 */
export const resetMockVotes = (): void => {
  Object.keys(voteStore).forEach((key) => delete voteStore[key]);
};
