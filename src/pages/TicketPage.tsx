import React, { useState, useEffect } from 'react';
import type { BuyerDetails, TicketOrder } from '../types';
import { processMockPaymentAndCreateTickets, getTicket, getUserTicket } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import { PageContainer } from '../components/ui/PageContainer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { QuantitySelector } from '../components/ticketing/QuantitySelector';
import { OrderSummary } from '../components/ticketing/OrderSummary';
import { PaymentModal } from '../components/ticketing/PaymentModal';
import { TicketCard } from '../components/ticketing/TicketCard';
import { Ticket, Sparkles, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Mail, User, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export const TicketPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') || searchParams.get('ticket');
  const { user, profile, isLoading: authLoading } = useAuth();

  const [buyer, setBuyer] = useState<BuyerDetails>({
    name: '',
    email: '',
    phone: '',
    quantity: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<TicketOrder | null>(null);
  const [activeTicketTab, setActiveTicketTab] = useState(0);
  const [hasExistingTicket, setHasExistingTicket] = useState<boolean>(false);

  // Auto-prefill name and email when user is authenticated
  useEffect(() => {
    if (user) {
      setBuyer((prev) => ({
        ...prev,
        name: profile?.fullName || user.user_metadata?.full_name || user.user_metadata?.name || prev.name,
        email: profile?.email || user.email || prev.email,
        quantity: 1, // Single ticket per user identity
      }));
    }
  }, [user, profile]);

  // Check if authenticated user already has an active ticket
  useEffect(() => {
    if (!user?.id || codeParam) return;

    let isMounted = true;
    getUserTicket(user.id).then((found) => {
      if (found && isMounted) {
        setHasExistingTicket(true);
        setOrderResult({
          id: `ORD-${found.id.slice(-6)}`,
          paymentId: `PAY-${found.id.slice(-6)}`,
          tickets: [found],
          quantity: 1,
          unitPrice: 10,
          totalAmount: 10,
          status: 'CONFIRMED',
          createdAt: found.createdAt,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id, codeParam]);

  // Code search param lookup compatibility
  useEffect(() => {
    if (!codeParam) return;
    let isMounted = true;
    const fetchTicket = async () => {
      const found = await getTicket(codeParam);
      if (found && isMounted) {
        setOrderResult({
          id: `ORD-${found.id.slice(-6)}`,
          paymentId: `PAY-${found.id.slice(-6)}`,
          tickets: [found],
          quantity: 1,
          unitPrice: 10,
          totalAmount: 10,
          status: 'CONFIRMED',
          createdAt: found.createdAt,
        });
        setBuyer({
          name: found.buyerName,
          email: found.buyerEmail,
          phone: found.buyerPhone,
          quantity: 1,
        });
      }
    };
    fetchTicket();
    return () => {
      isMounted = false;
    };
  }, [codeParam]);

  // Validate form fields before opening payment modal
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!buyer.name.trim()) newErrors.name = 'Full Name is required.';
    if (!buyer.email.trim() || !buyer.email.includes('@')) {
      newErrors.email = 'Valid Email Address is required.';
    }
    if (!buyer.phone.trim() || buyer.phone.length < 8) {
      newErrors.phone = 'Valid Phone Number is required.';
    }
    if (buyer.quantity < 1 || buyer.quantity > 10) {
      newErrors.quantity = 'Quantity must be between 1 and 10.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrors({ auth: 'Authentication is required to purchase a ticket.' });
      return;
    }
    if (validateForm()) {
      setPaymentError(null);
      setShowPaymentModal(true);
    }
  };

  const handleConfirmPayment = async (simulateError: boolean = false) => {
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const order = await processMockPaymentAndCreateTickets(buyer, user?.id || null, simulateError);
      setOrderResult(order);
      setShowPaymentModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setPaymentError(err.message || 'Payment processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen pt-32 pb-24 bg-[#08080C] bg-noise">
      <PageContainer size="normal">
        {/* SUCCESS SCREEN */}
        {orderResult ? (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500">
            {/* SUCCESS HEADER */}
            <div className="p-8 sm:p-12 bg-[#0E0E16] border border-amber-400/60 text-center relative overflow-hidden shadow-[0_0_50px_rgba(250,204,21,0.15)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-[100px] pointer-events-none" />

              <div className="w-16 h-16 mx-auto bg-amber-400 text-black flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(250,204,21,0.4)]">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <Badge variant="gold" icon={<Sparkles className="w-3.5 h-3.5" />}>
                {hasExistingTicket ? 'ACTIVE TICKET FOUND' : 'PAYMENT SUCCESSFUL'}
              </Badge>

              <h1 className="text-4xl sm:text-6xl font-display font-black text-white uppercase tracking-tight mt-3 mb-2">
                {hasExistingTicket ? 'YOU ALREADY HAVE A TICKET' : "YOU'RE IN."}
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 font-sans max-w-md mx-auto leading-relaxed mb-6">
                {hasExistingTicket
                  ? 'Your active Spotlight ticket is linked to your account identity.'
                  : 'Your Spotlight ticket is ready. Show your QR pass at the venue entrance.'}
              </p>

              {/* ORDER RECAP INFO */}
              <div className="p-4 bg-[#141420] border border-[#27273C] max-w-md mx-auto text-xs font-mono flex items-center justify-between text-zinc-400">
                <div>
                  <span className="block text-zinc-500">ORDER ID</span>
                  <span className="text-white font-bold">{orderResult.id}</span>
                </div>
                <div>
                  <span className="block text-zinc-500">PAYMENT ID</span>
                  <span className="text-white font-bold">{orderResult.paymentId}</span>
                </div>
                <div>
                  <span className="block text-zinc-500">QUANTITY</span>
                  <span className="text-amber-400 font-bold">{orderResult.quantity} Pass{orderResult.quantity > 1 ? 'es' : ''}</span>
                </div>
              </div>
            </div>

            {/* MULTI-TICKET TABS IF QUANTITY > 1 */}
            {orderResult.tickets.length > 1 && (
              <div className="flex items-center justify-center space-x-2 font-mono text-xs">
                <span className="text-zinc-400 mr-2">SELECT TICKET PASS:</span>
                {orderResult.tickets.map((tkt, idx) => (
                  <button
                    key={tkt.id}
                    type="button"
                    onClick={() => setActiveTicketTab(idx)}
                    className={`px-3 py-1.5 border transition-all ${
                      activeTicketTab === idx
                        ? 'bg-amber-400 text-black font-bold border-amber-400'
                        : 'bg-[#141420] text-zinc-400 border-[#27273C] hover:text-white'
                    }`}
                  >
                    Pass #{idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* DIGITAL TICKET CARD DISPLAY */}
            <TicketCard
              ticket={orderResult.tickets[activeTicketTab] || orderResult.tickets[0]}
              ticketIndex={activeTicketTab + 1}
              totalTickets={orderResult.tickets.length}
            />

            {/* NOTICE & ACCOUNT ACTION */}
            <div className="p-4 bg-[#0E0E16] border border-[#1E1E2C] text-center space-y-4">
              <p className="text-xs font-mono text-zinc-400 flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Ticket pass is linked to <strong>{buyer.email}</strong>.</span>
              </p>

              <div className="flex justify-center gap-4 pt-2">
                <Button href="/account" variant="primary" size="lg" icon={<User className="w-4 h-4" />}>
                  View in My Account
                </Button>
                <Button href="/" variant="secondary" size="lg" icon={<ArrowLeft className="w-4 h-4" />}>
                  Back to Spotlight
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* REGULAR CHECKOUT FORM & EVENT INFO */
          <div className="space-y-12">
            {/* PAGE HEADER */}
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-block mb-3">
                <Badge variant="gold">AUDIENCE TICKET</Badge>
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-white uppercase tracking-tight leading-[0.95] mb-4">
                GET IN.<br />
                <span className="text-amber-400 spotlight-text-glow">GET LOUD.</span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 font-sans max-w-xl mx-auto leading-relaxed mb-6">
                One ticket gets you into the show and gives you a voice in the competition.
              </p>

              <div className="inline-flex items-baseline space-x-2 p-3 bg-[#0E0E16] border border-amber-400/40">
                <span className="text-3xl font-display font-black text-amber-400">₹10</span>
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">PER AUDIENCE TICKET</span>
              </div>
            </div>

            {/* 2-COLUMN RESPONSIVE LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
              {/* LEFT COLUMN: BUYER FORM & AUTH GATE */}
              <div className="lg:col-span-7 space-y-8">
                <form onSubmit={handleOpenPayment} className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-6">
                  <div className="flex items-center space-x-3 pb-4 border-b border-[#1C1C2A]">
                    <Ticket className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-lg font-display font-bold text-white uppercase">
                        BUYER CONTACT DETAILS
                      </h3>
                      <span className="text-xs font-mono text-zinc-400">
                        {user ? 'Linked to your Google identity.' : 'Sign in required to purchase.'}
                      </span>
                    </div>
                  </div>

                  {/* AUTHENTICATION GATE PROMPT IF NOT LOGGED IN */}
                  {!authLoading && !user ? (
                    <div className="p-6 bg-[#141420] border border-amber-400/40 text-center space-y-4">
                      <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto" />
                      <div>
                        <h4 className="text-base font-display font-bold text-white uppercase">
                          GOOGLE SIGN-IN REQUIRED
                        </h4>
                        <p className="text-xs font-sans text-zinc-400 mt-1">
                          Continue with Google to buy your Spotlight ticket. Your ticket will be safely stored in your account.
                        </p>
                      </div>
                      <Button href="/login" variant="primary" size="md" fullWidth icon={<User className="w-4 h-4" />}>
                        Continue with Google
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* QUANTITY SELECTOR (Single ticket per identity) */}
                      <QuantitySelector
                        quantity={buyer.quantity}
                        onChange={(qty) => setBuyer((prev) => ({ ...prev, quantity: qty }))}
                      />

                      {/* FULL NAME */}
                      <div>
                        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
                          Full Name <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={buyer.name}
                          onChange={(e) => setBuyer((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Jordan Smith"
                          className={`w-full px-4 py-3 bg-[#141420] border text-white font-sans text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                            errors.name ? 'border-red-500' : 'border-[#27273C]'
                          }`}
                        />
                        {errors.name && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.name}</p>}
                      </div>

                      {/* EMAIL */}
                      <div>
                        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
                          Email Address <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="email"
                          value={buyer.email}
                          onChange={(e) => setBuyer((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="jordan.smith@student.edu"
                          className={`w-full px-4 py-3 bg-[#141420] border text-white font-sans text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                            errors.email ? 'border-red-500' : 'border-[#27273C]'
                          }`}
                        />
                        {errors.email && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.email}</p>}
                      </div>

                      {/* PHONE */}
                      <div>
                        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
                          Phone Number <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="tel"
                          value={buyer.phone}
                          onChange={(e) => setBuyer((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder="e.g. +91 98765 43210"
                          className={`w-full px-4 py-3 bg-[#141420] border text-white font-sans text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                            errors.phone ? 'border-red-500' : 'border-[#27273C]'
                          }`}
                        />
                        {errors.phone && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.phone}</p>}
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        icon={<ArrowRight className="w-5 h-5" />}
                      >
                        Continue to Payment (₹{buyer.quantity * 10})
                      </Button>
                    </>
                  )}
                </form>
              </div>

              {/* RIGHT COLUMN: ORDER SUMMARY */}
              <div className="lg:col-span-5">
                <OrderSummary quantity={buyer.quantity} />
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT MODAL DIALOG */}
        {showPaymentModal && (
          <PaymentModal
            buyer={buyer}
            isProcessing={isProcessing}
            onConfirmPayment={handleConfirmPayment}
            onCancel={() => setShowPaymentModal(false)}
            error={paymentError}
          />
        )}
      </PageContainer>
    </main>
  );
};

