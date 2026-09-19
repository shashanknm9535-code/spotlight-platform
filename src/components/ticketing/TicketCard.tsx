import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Ticket } from '../../types';
import { QRCodeDisplay } from './QRCodeDisplay';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Download, Sparkles, CheckCircle2, Ticket as TicketIcon, Radio } from 'lucide-react';

export interface TicketCardProps {
  ticket: Ticket;
  ticketIndex?: number;
  totalTickets?: number;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  ticketIndex = 1,
  totalTickets = 1,
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleSaveTicket = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="relative bg-[#0E0E16] border-2 border-amber-400/80 shadow-[0_0_40px_rgba(250,204,21,0.15)] overflow-hidden font-sans">
      {/* Top Gold Bar */}
      <div className="bg-amber-400 text-black py-2 px-6 flex items-center justify-between text-xs font-mono font-bold tracking-widest uppercase">
        <div className="flex items-center space-x-2">
          <TicketIcon className="w-4 h-4 fill-black" />
          <span>SPOTLIGHT AUDIENCE PASS 2026</span>
        </div>
        {totalTickets > 1 && (
          <span>TICKET {ticketIndex} OF {totalTickets}</span>
        )}
      </div>

      {/* Main Ticket Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Ticket Header & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1E1E2E] pb-4 gap-3">
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">
              OFFICIAL PASS ID
            </span>
            <span className="text-2xl font-display font-extrabold text-white tracking-wider">
              {ticket.id}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="gold" icon={<Sparkles className="w-3 h-3" />}>
              {ticket.status}
            </Badge>
          </div>
        </div>

        {/* Performer / Buyer Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#141420] border border-[#222234]">
            <span className="text-zinc-500 block">TICKET HOLDER</span>
            <span className="text-sm font-bold text-white uppercase block truncate">
              {ticket.buyerName}
            </span>
          </div>

          <div className="p-3 bg-[#141420] border border-[#222234]">
            <span className="text-zinc-500 block">EVENT ENTRY PRICE</span>
            <span className="text-sm font-bold text-amber-400 block">
              ₹10 (PAID)
            </span>
          </div>
        </div>

        {/* QR CODE SECTION */}
        <div className="p-6 bg-[#141420] border border-[#222234] text-center space-y-4">
          <div className="flex justify-center">
            <QRCodeDisplay value={ticket.qrValue} size={190} />
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block">
              SCAN THIS QR AT THE VENUE
            </span>
            <p className="text-xs text-zinc-400 font-sans mt-1">
              This QR is your live auditorium entry pass and voting key.
            </p>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-4 border-t border-[#1C1C2A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-400">
          <Link
            to="/vote"
            className="inline-flex items-center space-x-1.5 text-amber-400 hover:text-yellow-300 font-bold uppercase transition-colors"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Open Live Voting Portal</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveTicket}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            {downloaded ? 'Saved to Device' : 'Save Pass'}
          </Button>
        </div>
      </div>
    </div>
  );
};
