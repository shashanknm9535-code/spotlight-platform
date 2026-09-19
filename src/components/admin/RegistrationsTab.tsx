import React, { useState } from 'react';
import type { AdminRegistration, RegistrationStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Search, Filter, CheckCircle2, XCircle, Eye, User, Users, X } from 'lucide-react';

export interface RegistrationsTabProps {
  registrations: AdminRegistration[];
  onUpdateStatus: (id: string, status: RegistrationStatus) => void;
}

export const RegistrationsTab: React.FC<RegistrationsTabProps> = ({
  registrations,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRegistration, setSelectedRegistration] = useState<AdminRegistration | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);

  // Filter registrations
  const filtered = registrations.filter((r) => {
    const matchesSearch =
      r.performerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.actId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const getStatusBadge = (status: RegistrationStatus) => {
    if (status === 'confirmed') return <Badge variant="gold">CONFIRMED</Badge>;
    if (status === 'rejected') return <Badge variant="outline" className="border-red-500 text-red-400">REJECTED</Badge>;
    return <Badge variant="dark" className="bg-amber-400/20 text-amber-400">PENDING</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="gold">PERFORMER MANAGEMENT</Badge>
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-1">
            REGISTRATIONS ({registrations.length})
          </h1>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 bg-[#0E0E16] border border-[#1E1E2C] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Name, Act ID, Dept..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#141420] border border-[#27273C] text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#141420] border border-[#27273C] text-white focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Categories (Solo & Group)</option>
            <option value="solo">Solo Acts Only</option>
            <option value="group">Group Acts Only</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#141420] border border-[#27273C] text-white focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Statuses (Pending/Confirmed/Rejected)</option>
            <option value="pending">Pending Review Only</option>
            <option value="confirmed">Confirmed Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>
      </div>

      {/* REGISTRATIONS TABLE / CONTAINER */}
      <div className="bg-[#0E0E16] border border-[#1E1E2C] overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-[#141420] border-b border-[#27273C] text-zinc-400 uppercase">
              <th className="p-3.5">ACT ID</th>
              <th className="p-3.5">PERFORMER / ACT</th>
              <th className="p-3.5">CATEGORY</th>
              <th className="p-3.5">DEPARTMENT</th>
              <th className="p-3.5">SELF RATING</th>
              <th className="p-3.5">STATUS</th>
              <th className="p-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C1C2A]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  No registrations found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-[#141420]/60 transition-colors">
                  <td className="p-3.5 font-bold text-amber-400">{r.actId}</td>
                  <td className="p-3.5 text-white font-bold">{r.performerName}</td>
                  <td className="p-3.5 uppercase">{r.category} ({r.performanceType})</td>
                  <td className="p-3.5 text-zinc-400">{r.department} ({r.year})</td>
                  <td className="p-3.5 font-bold text-amber-400">{r.selfRating} / 10</td>
                  <td className="p-3.5">{getStatusBadge(r.status)}</td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRegistration(r)}
                        className="p-1.5 text-zinc-400 hover:text-amber-400 bg-[#141420] border border-[#27273C]"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {r.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(r.id, 'confirmed')}
                            className="px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRejectId(r.id)}
                            className="px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REGISTRATION DETAIL MODAL */}
      {selectedRegistration && (
        <div className="fixed inset-0 z-50 bg-[#08080C]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0E0E16] border border-amber-400 p-6 sm:p-8 relative space-y-6">
            <button
              type="button"
              onClick={() => setSelectedRegistration(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 border-b border-[#1C1C2A] pb-4">
              <div className="w-20 h-20 bg-[#141420] border border-amber-400 overflow-hidden shrink-0">
                <img src={selectedRegistration.photoUrl} alt="Stage Photo" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-amber-400">{selectedRegistration.actId}</span>
                <h2 className="text-2xl font-display font-bold text-white uppercase">{selectedRegistration.performerName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(selectedRegistration.status)}
                  <span className="text-xs font-mono text-zinc-400 uppercase">{selectedRegistration.category} • {selectedRegistration.performanceType}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#141420] border border-[#27273C]">
                <span className="text-zinc-500 block">DEPARTMENT</span>
                <span className="text-white font-bold">{selectedRegistration.department}</span>
              </div>
              <div className="p-3 bg-[#141420] border border-[#27273C]">
                <span className="text-zinc-500 block">YEAR</span>
                <span className="text-white font-bold">{selectedRegistration.year}</span>
              </div>
              <div className="p-3 bg-[#141420] border border-[#27273C]">
                <span className="text-zinc-500 block">PHONE</span>
                <span className="text-white font-bold">{selectedRegistration.phone}</span>
              </div>
              <div className="p-3 bg-[#141420] border border-[#27273C]">
                <span className="text-zinc-500 block">EMAIL</span>
                <span className="text-white font-bold truncate block">{selectedRegistration.email}</span>
              </div>
            </div>

            <div className="p-4 bg-[#141420] border border-[#27273C] text-xs font-sans">
              <strong className="text-zinc-300 font-mono uppercase block mb-1">ACT BIO:</strong>
              <p className="text-zinc-300 leading-relaxed font-sans">"{selectedRegistration.blurb}"</p>
            </div>

            {selectedRegistration.teamMembers.length > 0 && (
              <div className="space-y-2 text-xs font-mono">
                <span className="text-amber-400 font-bold uppercase">TEAM ROSTER ({selectedRegistration.teamMembers.length}):</span>
                <div className="space-y-1">
                  {selectedRegistration.teamMembers.map((m, i) => (
                    <div key={m.id} className="p-2 bg-[#141420] border border-[#27273C] text-zinc-300">
                      0{i + 1}. {m.name} ({m.department} - {m.year})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-[#1C1C2A]">
              {selectedRegistration.status === 'pending' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onUpdateStatus(selectedRegistration.id, 'rejected');
                      setSelectedRegistration(null);
                    }}
                    className="text-red-400 border-red-500/40 hover:bg-red-500/10"
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onUpdateStatus(selectedRegistration.id, 'confirmed');
                      setSelectedRegistration(null);
                    }}
                  >
                    Approve Registration
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REJECT DIALOG */}
      {confirmRejectId && (
        <div className="fixed inset-0 z-50 bg-[#08080C]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0E0E16] border border-red-500 p-6 text-center space-y-4 font-mono text-xs">
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-lg font-display font-bold text-white uppercase">CONFIRM REJECTION</h3>
            <p className="text-zinc-400 font-sans">Are you sure you want to reject this performer registration?</p>
            <div className="flex justify-center space-x-3 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmRejectId(null)}>Cancel</Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-400 border-red-500 hover:bg-red-500/20"
                onClick={() => {
                  onUpdateStatus(confirmRejectId, 'rejected');
                  setConfirmRejectId(null);
                }}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
