import React, { useState } from 'react';
import type { BuyerDetails } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ShieldCheck, Lock, Smartphone, CreditCard, Landmark, AlertTriangle, ArrowRight, X } from 'lucide-react';

export interface PaymentModalProps {
  buyer: BuyerDetails;
  isProcessing: boolean;
  onConfirmPayment: (simulateError?: boolean) => void;
  onCancel: () => void;
  error?: string | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  buyer,
  isProcessing,
  onConfirmPayment,
  onCancel,
  error,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const totalAmount = buyer.quantity * 10;

  return (
    <div className="fixed inset-0 z-50 bg-[#08080C]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0E0E16] border border-amber-400/60 p-6 sm:p-8 relative shadow-[0_0_50px_rgba(250,204,21,0.2)]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="text-center mb-6 pb-4 border-b border-[#1C1C2A]">
          <div className="inline-flex items-center space-x-1.5 mb-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <Badge variant="gold">SECURE MOCK CHECKOUT</Badge>
          </div>
          <h2 className="text-2xl font-display font-bold text-white uppercase">
            COMPLETE PAYMENT
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            Frontend Simulation Gateway
          </span>
        </div>

        {/* ORDER RECAP */}
        <div className="p-4 bg-[#141420] border border-[#27273C] mb-6 font-mono text-xs space-y-2">
          <div className="flex justify-between text-zinc-400">
            <span>BUYER NAME</span>
            <span className="text-white font-bold">{buyer.name}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>CONTACT</span>
            <span className="text-white">{buyer.phone}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>ITEMS</span>
            <span className="text-white">{buyer.quantity} × Spotlight Pass (₹10)</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#222234] text-sm font-bold text-amber-400">
            <span>TOTAL AMOUNT</span>
            <span>₹{totalAmount}</span>
          </div>
        </div>

        {/* PAYMENT METHOD SELECTOR */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
            SELECT PAYMENT METHOD
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedMethod('upi')}
              className={`p-3 border text-center font-mono text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                selectedMethod === 'upi'
                  ? 'bg-amber-400/10 border-amber-400 text-amber-400 font-bold'
                  : 'bg-[#141420] border-[#27273C] text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-5 h-5" />
              <span>UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('card')}
              className={`p-3 border text-center font-mono text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                selectedMethod === 'card'
                  ? 'bg-amber-400/10 border-amber-400 text-amber-400 font-bold'
                  : 'bg-[#141420] border-[#27273C] text-zinc-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>CARD</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('netbanking')}
              className={`p-3 border text-center font-mono text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                selectedMethod === 'netbanking'
                  ? 'bg-amber-400/10 border-amber-400 text-amber-400 font-bold'
                  : 'bg-[#141420] border-[#27273C] text-zinc-400 hover:text-white'
              }`}
            >
              <Landmark className="w-5 h-5" />
              <span>BANKING</span>
            </button>
          </div>
        </div>

        {/* SIMULATED ERROR TESTING TOGGLE */}
        <div className="mb-6 p-3 bg-[#141420] border border-[#27273C] flex items-center justify-between text-xs font-mono text-zinc-400">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
              className="accent-amber-400"
            />
            <span>Test Error State (Simulate Payment Failure)</span>
          </label>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PRIMARY SUBMIT PAYMENT BUTTON */}
        <Button
          type="button"
          onClick={() => onConfirmPayment(simulateFailure)}
          disabled={isProcessing}
          variant="primary"
          size="lg"
          fullWidth
          icon={
            isProcessing ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )
          }
        >
          {isProcessing ? 'PROCESSING PAYMENT...' : `PAY ₹${totalAmount}`}
        </Button>

        <p className="mt-4 text-[10px] font-mono text-zinc-500 text-center">
          🔒 Mock Gateway • No real funds charged • Ticket QR issued instantly upon success
        </p>
      </div>
    </div>
  );
};
