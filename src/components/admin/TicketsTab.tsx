import React, { useState } from 'react';
import { getAdminTickets } from '../../services/adminService';
import { Badge } from '../ui/Badge';
import { Search, Ticket, DollarSign, Users } from 'lucide-react';

export const TicketsTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const tickets = getAdminTickets();

  const CAPACITY = 800;
  const SOLD = 643;
  const REMAINING = CAPACITY - SOLD;
  const REVENUE = SOLD * 10;

  const filtered = tickets.filter((t) =>
    t.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.buyerPhone.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <Badge variant="gold">TICKET MONITORING</Badge>
        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-1">
          TICKET SALES & CAPACITY
        </h1>
        <p className="text-xs font-mono text-zinc-400">
          Track auditorium capacity, ticket sales orders, and mock entrance revenue.
        </p>
      </div>

      {/* METRIC CARDS & CAPACITY BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-3 font-mono">
          <span className="text-xs text-zinc-400 uppercase">TICKETS SOLD / CAPACITY</span>
          <div className="text-3xl font-display font-extrabold text-amber-400">
            {SOLD} <span className="text-lg font-sans text-zinc-500">/ {CAPACITY}</span>
          </div>
          <div className="w-full bg-[#181826] h-2 overflow-hidden border border-[#27273C]">
            <div className="bg-amber-400 h-full w-[80.3%]" />
          </div>
          <span className="text-[11px] text-zinc-400 block">{REMAINING} Seats Remaining</span>
        </div>

        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-2 font-mono">
          <span className="text-xs text-zinc-400 uppercase">MOCK TICKET REVENUE</span>
          <div className="text-3xl font-display font-extrabold text-emerald-400">
            ₹{REVENUE.toLocaleString()}
          </div>
          <span className="text-[11px] text-zinc-400 block">643 Passes @ ₹10 Entry</span>
        </div>

        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-2 font-mono">
          <span className="text-xs text-zinc-400 uppercase">AUDIENCE ENTRY PASSES</span>
          <div className="text-3xl font-display font-extrabold text-white">643</div>
          <span className="text-[11px] text-emerald-400 font-bold block">● QR Pass Active</span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="p-4 bg-[#0E0E16] border border-[#1E1E2C]">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Ticket ID, Buyer Name, Email..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#141420] border border-[#27273C] text-white font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="bg-[#0E0E16] border border-[#1E1E2C] overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-[#141420] border-b border-[#27273C] text-zinc-400 uppercase">
              <th className="p-3.5">ORDER ID</th>
              <th className="p-3.5">PAYMENT ID</th>
              <th className="p-3.5">BUYER NAME</th>
              <th className="p-3.5">CONTACT</th>
              <th className="p-3.5">QTY</th>
              <th className="p-3.5">TOTAL</th>
              <th className="p-3.5">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C1C2A]">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-[#141420]/50 transition-colors">
                <td className="p-3.5 font-bold text-amber-400">{t.id}</td>
                <td className="p-3.5 text-zinc-300">{t.paymentId}</td>
                <td className="p-3.5 text-white font-bold">{t.buyerName}</td>
                <td className="p-3.5 text-zinc-400">{t.buyerPhone} | {t.buyerEmail}</td>
                <td className="p-3.5 font-bold">{t.quantity}</td>
                <td className="p-3.5 text-emerald-400 font-bold">₹{t.totalAmount}</td>
                <td className="p-3.5"><Badge variant="gold">{t.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
