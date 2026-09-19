import React from 'react';
import { Ticket, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface OrderSummaryProps {
  quantity: number;
  unitPrice?: number;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  quantity,
  unitPrice = 10,
}) => {
  const subtotal = quantity * unitPrice;
  const total = subtotal;

  return (
    <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#1C1C2A]">
        <div>
          <Badge variant="gold">ORDER SUMMARY</Badge>
          <h3 className="text-xl font-display font-bold text-white uppercase mt-2">
            SPOTLIGHT AUDIENCE PASS
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-zinc-400 block">PRICE</span>
          <span className="text-lg font-mono font-bold text-amber-400">₹{unitPrice} / TKT</span>
        </div>
      </div>

      {/* COST BREAKDOWN */}
      <div className="space-y-3 font-mono text-xs text-zinc-300 pb-4 border-b border-[#1C1C2A]">
        <div className="flex justify-between">
          <span className="text-zinc-400">Audience Ticket ({quantity}×)</span>
          <span className="text-white">₹{unitPrice} × {quantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Subtotal</span>
          <span className="text-white">₹{subtotal}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-[#181828] text-sm font-bold">
          <span className="text-amber-400">GRAND TOTAL</span>
          <span className="text-amber-400 text-lg">₹{total}</span>
        </div>
      </div>

      {/* TICKET INCLUSIONS */}
      <div className="space-y-3">
        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest block">
          WHAT YOUR TICKET INCLUDES
        </span>

        <div className="grid grid-cols-1 gap-2 text-xs font-mono">
          <div className="p-3 bg-[#141420] border border-[#222234] flex items-start space-x-3">
            <Ticket className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block uppercase">EVENT ENTRY PASS</strong>
              <span className="text-zinc-400">Your unique QR code gives instant door access at the auditorium.</span>
            </div>
          </div>

          <div className="p-3 bg-[#141420] border border-[#222234] flex items-start space-x-3">
            <Radio className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block uppercase">LIVE MOBILE VOTING</strong>
              <span className="text-zinc-400">Cast 1–10 ratings for each act during the live show from your phone.</span>
            </div>
          </div>

          <div className="p-3 bg-[#141420] border border-[#222234] flex items-start space-x-3">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block uppercase">ONE IDENTITY</strong>
              <span className="text-zinc-400">No passwords or accounts needed. Your ticket is your voting identity.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
