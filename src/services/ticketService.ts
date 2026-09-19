import type { BuyerDetails, TicketOrder, Ticket } from '../types';

const TICKET_PRICE = 10;

/**
 * Mock payment & ticket issuance service for Phase 3.
 * Simulates async payment gateway processing (1200ms delay)
 * and returns a generated TicketOrder object with unique ticket IDs & QR strings.
 * Ready for future Razorpay + Supabase integration.
 */
export const processMockPaymentAndCreateTickets = async (
  buyer: BuyerDetails,
  shouldFail: boolean = false
): Promise<TicketOrder> => {
  // Simulate payment processing delay (1200ms)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (shouldFail) {
    throw new Error('Payment was declined by the bank. Please try again.');
  }

  const orderRandom = Math.floor(1000 + Math.random() * 9000);
  const payRandom = Math.floor(1000 + Math.random() * 9000);
  const orderId = `SPT-ORD-2026-${orderRandom}`;
  const paymentId = `PAY-2026-${payRandom}`;
  const now = new Date().toISOString();

  const tickets: Ticket[] = Array.from({ length: buyer.quantity }, (_, i) => {
    const tktRandom = Math.floor(10000 + Math.random() * 90000);
    const tktId = `SPT-TKT-2026-${tktRandom + i}`;
    return {
      id: tktId,
      qrValue: tktId,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone,
      status: 'CONFIRMED',
      createdAt: now,
    };
  });

  const order: TicketOrder = {
    id: orderId,
    paymentId,
    tickets,
    quantity: buyer.quantity,
    unitPrice: TICKET_PRICE,
    totalAmount: buyer.quantity * TICKET_PRICE,
    status: 'CONFIRMED',
    createdAt: now,
  };

  return order;
};
