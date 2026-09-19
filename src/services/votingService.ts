import { MOCK_VALID_TICKETS, MOCK_ACTS } from '../data/eventData';
import type { VoteRecord, Act } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase/client';
import { validateTicketForVoting } from './ticketService';

// In-memory vote store for mock mode & local session caching
const voteStore: Record<string, VoteRecord[]> = {};

export interface VotingStatePayload {
  eventStatus: string;
  votingOpen: boolean;
  currentAct: Act | null;
  hasVoted: boolean;
  votedRating: number | null;
}

/**
 * Validates a ticket ID/code for audience voting.
 * Uses ticketService.validateTicketForVoting() which checks ticket existence and PAID status.
 */
export const validateTicketId = async (ticketId: string): Promise<boolean> => {
  const normalized = ticketId.trim().toUpperCase();

  if (!isSupabaseEnabled || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (normalized.startsWith('SPT-TKT-') && normalized.length >= 12) {
      return true;
    }
    return MOCK_VALID_TICKETS.includes(normalized);
  }

  const res = await validateTicketForVoting(normalized);
  if (!res.valid) {
    throw new Error(res.error || 'This ticket is not valid for voting.');
  }
  return true;
};

/**
 * Fetches current live event & act voting state from Supabase RPC, or mock data.
 */
export const getCurrentVotingState = async (
  ticketCode?: string
): Promise<VotingStatePayload> => {
  if (!isSupabaseEnabled || !supabase) {
    const act = MOCK_ACTS[0];
    const normalizedTicket = ticketCode?.trim().toUpperCase();
    const voted = normalizedTicket ? hasVotedForAct(normalizedTicket, act.id) : false;
    const rating = normalizedTicket ? getVotedRating(normalizedTicket, act.id) : null;

    return {
      eventStatus: 'LIVE',
      votingOpen: true,
      currentAct: act,
      hasVoted: voted,
      votedRating: rating,
    };
  }

  try {
    const { data, error } = await (supabase as any).rpc('get_current_voting_state', {
      ticket_code_input: ticketCode?.trim().toUpperCase() || null,
    });

    if (error || !data) {
      console.error('[VotingService] get_current_voting_state RPC error:', error);
      return {
        eventStatus: 'LIVE',
        votingOpen: true,
        currentAct: MOCK_ACTS[0],
        hasVoted: false,
        votedRating: null,
      };
    }

    const payload = data as any;
    return {
      eventStatus: payload.event_status || 'LIVE',
      votingOpen: payload.voting_open ?? true,
      currentAct: payload.current_act ? (payload.current_act as Act) : MOCK_ACTS[0],
      hasVoted: payload.has_voted ?? false,
      votedRating: payload.voted_rating ?? null,
    };
  } catch (err) {
    console.error('[VotingService] Error fetching current voting state:', err);
    return {
      eventStatus: 'LIVE',
      votingOpen: true,
      currentAct: MOCK_ACTS[0],
      hasVoted: false,
      votedRating: null,
    };
  }
};

/**
 * Submits an audience vote for the current act using a validated ticket ID.
 * Uses the secure `submit_audience_vote` PostgreSQL RPC when VITE_USE_SUPABASE=true.
 */
export const submitAudienceVote = async (
  ticketId: string,
  actId: string,
  rating: number
): Promise<boolean> => {
  // Validate rating 1–10
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    throw new Error('Please select a rating from 1 to 10.');
  }

  const normalizedTicket = ticketId.trim().toUpperCase();

  // ── MOCK MODE FALLBACK ──────────────────────────────────────────────────────
  if (!isSupabaseEnabled || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (!voteStore[normalizedTicket]) {
      voteStore[normalizedTicket] = [];
    }

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
  }

  // ── SUPABASE LIVE PERSISTENCE VIA SECURE RPC ────────────────────────────────
  try {
    const { data, error } = await (supabase as any).rpc('submit_audience_vote', {
      ticket_code_input: normalizedTicket,
      rating_input: rating,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('ALREADY_VOTED') || error.code === '23505') {
        throw new Error('You have already voted for this act.');
      }
      if (msg.includes('VOTING_CLOSED')) {
        throw new Error('Voting is currently closed.');
      }
      if (msg.includes('UNPAID_TICKET')) {
        throw new Error('This ticket has not been paid for.');
      }
      if (msg.includes('INVALID_TICKET')) {
        throw new Error('This ticket is not valid for voting.');
      }
      if (msg.includes('INVALID_RATING')) {
        throw new Error('Please select a rating from 1 to 10.');
      }
      console.error('[VotingService] submit_audience_vote RPC error:', error);
      throw new Error("We couldn't submit your vote. Please try again.");
    }

    // Cache locally for instant UI state update
    if (!voteStore[normalizedTicket]) {
      voteStore[normalizedTicket] = [];
    }
    const votePayload = data as any;
    const votedActId = votePayload?.act_id || actId;

    voteStore[normalizedTicket].push({
      ticketId: normalizedTicket,
      actId: votedActId,
      rating,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (err: any) {
    console.error('[VotingService] Submission error:', err);
    throw new Error(err?.message || "We couldn't submit your vote. Please try again.");
  }
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
