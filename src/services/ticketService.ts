import type { BuyerDetails, TicketOrder, Ticket } from '../types';
import { supabase, isSupabaseEnabled, logSupabaseError } from '../lib/supabase/client';
import type { DbTicket, TicketInsert } from '../types/database';

export const TICKET_PRICE = 10;
export const EVENT_CAPACITY = 800;

/**
 * Generates a unique Ticket Code in the format: SPT-TKT-2026-XXXXXX
 * e.g., SPT-TKT-2026-482913
 */
export const generateTicketCode = (): string => {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `SPT-TKT-2026-${randomSuffix}`;
};

/**
 * Calculates total issued/paid tickets from Supabase.
 */
export const getTicketsIssuedCount = async (): Promise<number> => {
  if (!isSupabaseEnabled || !supabase) {
    return 643; // Mock initial count matching overview metrics
  }

  try {
    const { data, error } = await (supabase
      .from('tickets')
      .select('quantity')
      .eq('payment_status', 'PAID') as any);

    if (error) {
      logSupabaseError('TicketService', 'getTicketsIssuedCount', error);
      return 0;
    }
    if (!data) return 0;
    return (data as { quantity: number }[]).reduce((sum, row) => sum + (row.quantity || 1), 0);
  } catch (err) {
    logSupabaseError('TicketService', 'getTicketsIssuedCount', err);
    return 0;
  }
};

/**
 * Service-level capacity check (800 capacity limit).
 */
export const checkEventCapacity = async (
  requestedQuantity: number
): Promise<{ available: boolean; remaining: number }> => {
  const issuedCount = await getTicketsIssuedCount();
  const remaining = Math.max(0, EVENT_CAPACITY - issuedCount);
  return {
    available: remaining >= requestedQuantity,
    remaining,
  };
};

/**
 * Helper to insert a single ticket record into Supabase with collision retry.
 */
const createSingleTicketRecord = async (
  buyer: BuyerDetails,
  paymentRef: string
): Promise<Ticket> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const maxRetries = 5;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const ticketCode = generateTicketCode();
    const now = new Date().toISOString();

    const payload: TicketInsert = {
      ticket_code: ticketCode,
      buyer_name: buyer.name.trim(),
      buyer_email: buyer.email.trim(),
      buyer_phone: buyer.phone.trim() || null,
      quantity: 1, // 1 voting pass per ticket record (Option B)
      payment_status: 'PAID',
      payment_reference: paymentRef,
      issued_at: now,
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert(payload as any)
      .select()
      .single();

    if (!error && data) {
      const dbRow = data as DbTicket;
      return {
        id: dbRow.ticket_code,
        qrValue: dbRow.ticket_code,
        buyerName: dbRow.buyer_name,
        buyerEmail: dbRow.buyer_email,
        buyerPhone: dbRow.buyer_phone || '',
        status: dbRow.payment_status === 'PAID' ? 'CONFIRMED' : 'PENDING',
        createdAt: dbRow.created_at,
      };
    }

    // Postgres unique constraint violation on ticket_code -> retry with new code
    if (error && error.code === '23505' && error.message?.includes('ticket_code')) {
      console.warn(`[TicketService] Collision on ticket_code ${ticketCode}. Retrying (${attempt + 1}/${maxRetries})...`);
      lastError = error;
      continue;
    }

    logSupabaseError('TicketService', 'createSingleTicketRecord', error);
    lastError = error;
    break;
  }

  throw new Error("We couldn't generate your ticket pass. Please try again.");
};

/**
 * Ticket order processing service.
 * Simulates payment gateway processing and creates real ticket records in Supabase
 * when VITE_USE_SUPABASE=true, or uses mock data when VITE_USE_SUPABASE=false.
 */
// Local mock store for VITE_USE_SUPABASE=false
const MOCK_USER_TICKETS = new Map<string, Ticket>();

/**
 * Retrieves an active ticket owned by a specific authenticated user.
 */
export const getUserTicket = async (userId: string): Promise<Ticket | null> => {
  if (!userId) return null;

  if (!isSupabaseEnabled || !supabase) {
    return MOCK_USER_TICKETS.get(userId) || null;
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_code, user_id, buyer_name, buyer_email, buyer_phone, payment_status, created_at')
      .eq('user_id', userId)
      .eq('payment_status', 'PAID')
      .maybeSingle();

    if (error) {
      logSupabaseError('TicketService', 'getUserTicket', error);
      return null;
    }
    if (!data) return null;

    const row = data as DbTicket;
    return {
      id: row.ticket_code,
      qrValue: row.ticket_code,
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      buyerPhone: row.buyer_phone || '',
      status: row.payment_status === 'PAID' ? 'CONFIRMED' : 'PENDING',
      createdAt: row.created_at,
      userId: row.user_id || undefined,
    };
  } catch (err) {
    logSupabaseError('TicketService', 'getUserTicket', err);
    return null;
  }
};

/**
 * Ticket order processing service.
 * Simulates payment gateway processing and creates real ticket records in Supabase
 * linked to the authenticated user's ID.
 */
export const processMockPaymentAndCreateTickets = async (
  buyer: BuyerDetails,
  userId?: string | null,
  shouldFail: boolean = false
): Promise<TicketOrder> => {
  // Simulate payment processing delay (1200ms)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (shouldFail) {
    throw new Error('Payment was declined by the bank. Please try again.');
  }

  if (buyer.quantity < 1 || buyer.quantity > 10) {
    throw new Error('Ticket quantity must be between 1 and 10.');
  }

  // ── MOCK MODE FALLBACK ──────────────────────────────────────────────────────
  if (!isSupabaseEnabled || !supabase) {
    if (userId && MOCK_USER_TICKETS.has(userId)) {
      throw new Error('You already have an active Spotlight ticket.');
    }

    const orderRandom = Math.floor(1000 + Math.random() * 9000);
    const payRandom = Math.floor(1000 + Math.random() * 9000);
    const orderId = `SPT-ORD-2026-${orderRandom}`;
    const paymentId = `PAY-2026-${payRandom}`;
    const now = new Date().toISOString();

    const tickets: Ticket[] = Array.from({ length: buyer.quantity }, (_, i) => {
      const tktCode = generateTicketCode();
      const tkt: Ticket = {
        id: tktCode,
        qrValue: tktCode,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone,
        status: 'CONFIRMED',
        createdAt: now,
        userId: userId || undefined,
      };
      if (userId && i === 0) {
        MOCK_USER_TICKETS.set(userId, tkt);
      }
      return tkt;
    });

    return {
      id: orderId,
      paymentId,
      tickets,
      quantity: buyer.quantity,
      unitPrice: TICKET_PRICE,
      totalAmount: buyer.quantity * TICKET_PRICE,
      status: 'CONFIRMED',
      createdAt: now,
    };
  }

  // ── SUPABASE LIVE PERSISTENCE WITH ATOMIC TRANSACTION LOCKING ───────────────
  try {
    const { data, error } = await (supabase as any).rpc('purchase_tickets_atomic', {
      p_buyer_name: buyer.name.trim(),
      p_buyer_email: buyer.email.trim(),
      p_buyer_phone: buyer.phone.trim(),
      p_quantity: buyer.quantity,
      p_payment_method: 'upi',
      p_user_id: userId || null,
    });

    if (error || !data || !data.success) {
      logSupabaseError('TicketService', 'purchase_tickets_atomic', error);
      const errMsg = error?.hint || error?.message || 'Ticket creation failed.';
      if (errMsg.includes('ALREADY_HAS_TICKET')) {
        throw new Error('You already have an active Spotlight ticket linked to your account.');
      }
      if (errMsg.includes('CAPACITY_EXCEEDED')) {
        throw new Error('Tickets are currently sold out or remaining capacity is insufficient.');
      }
      throw new Error(errMsg);
    }

    const res = data as {
      order_id: string;
      order_code: string;
      total_amount: number;
      tickets: Array<{ id: string; ticket_code: string; status: string }>;
    };

    const tickets: Ticket[] = res.tickets.map((t) => ({
      id: t.ticket_code,
      qrValue: t.ticket_code,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      userId: userId || undefined,
    }));

    return {
      id: res.order_code,
      paymentId: 'MOCK-PAY-' + res.order_code,
      tickets,
      quantity: res.tickets.length,
      unitPrice: TICKET_PRICE,
      totalAmount: res.total_amount,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };
  } catch (err: any) {
    if (err?.message && !err?.code) {
      throw err;
    }
    logSupabaseError('TicketService', 'processMockPaymentAndCreateTickets', err);
    throw new Error(err?.message || "We couldn't issue your tickets. Please try again.");
  }
};

/**
 * Retrieves a single ticket by ticket_code for public/holder presentation.
 */
export const getTicket = async (ticketCode: string): Promise<Ticket | null> => {
  const normalized = ticketCode.trim().toUpperCase();

  if (!isSupabaseEnabled || !supabase) {
    return {
      id: normalized,
      qrValue: normalized,
      buyerName: 'Ticket Holder',
      buyerEmail: 'holder@student.edu',
      buyerPhone: '+91 98765 00000',
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_code, user_id, buyer_name, buyer_email, buyer_phone, payment_status, created_at')
      .eq('ticket_code', normalized)
      .eq('payment_status', 'PAID')
      .maybeSingle();

    if (error) {
      logSupabaseError('TicketService', 'getTicket', error);
      return null;
    }
    if (!data) return null;

    const row = data as DbTicket;
    return {
      id: row.ticket_code,
      qrValue: row.ticket_code,
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      buyerPhone: row.buyer_phone || '',
      status: row.payment_status === 'PAID' ? 'CONFIRMED' : 'PENDING',
      createdAt: row.created_at,
      userId: row.user_id || undefined,
    };
  } catch (err) {
    logSupabaseError('TicketService', 'getTicket', err);
    return null;
  }
};

/**
 * Retrieves all tickets from Supabase for Admin monitoring.
 */
export const getTickets = async (): Promise<DbTicket[]> => {
  if (!isSupabaseEnabled || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as DbTicket[];
  } catch (err) {
    console.error('[TicketService] Error in getTickets:', err);
    return [];
  }
};

/**
 * Ticket Validation for Voting (Foundation for Phase 8D).
 * Verifies that the ticket exists and payment_status is PAID.
 */
export interface VotingTicketValidation {
  valid: boolean;
  ticketId?: string;
  ticketCode?: string;
  buyerName?: string;
  error?: string;
}

export const validateTicketForVoting = async (
  ticketCode: string
): Promise<VotingTicketValidation> => {
  const normalized = ticketCode.trim().toUpperCase();

  if (!isSupabaseEnabled || !supabase) {
    const isValid = normalized.startsWith('SPT-TKT-') && normalized.length >= 12;
    if (isValid) {
      return { valid: true, ticketId: normalized, ticketCode: normalized };
    }
    return { valid: false, error: 'Invalid or unrecognized ticket code.' };
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_code, buyer_name, payment_status')
      .eq('ticket_code', normalized)
      .maybeSingle();

    if (error || !data) {
      return { valid: false, error: 'Ticket pass not found in event registry.' };
    }

    const row = data as DbTicket;
    if (row.payment_status !== 'PAID') {
      return { valid: false, error: 'Ticket payment status is not confirmed.' };
    }

    return {
      valid: true,
      ticketId: row.id,
      ticketCode: row.ticket_code,
      buyerName: row.buyer_name,
    };
  } catch (err) {
    console.error('[TicketService] Error in validateTicketForVoting:', err);
    return { valid: false, error: 'Ticket validation error. Please try again.' };
  }
};
