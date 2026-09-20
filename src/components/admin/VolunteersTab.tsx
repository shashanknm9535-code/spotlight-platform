import React, { useState, useEffect } from 'react';
import type { VolunteerIdentity, VolunteerCreationResult, EntryStats } from '../../types';
import {
  getVolunteers,
  createVolunteer,
  toggleVolunteerActive,
  getEntryStats,
  toggleEntryScanning,
} from '../../services/volunteerService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Users,
  UserPlus,
  QrCode,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Power,
  ShieldCheck,
  Clock,
  Search,
} from 'lucide-react';

export const VolunteersTab: React.FC = () => {
  const [volunteers, setVolunteers] = useState<VolunteerIdentity[]>([]);
  const [stats, setStats] = useState<EntryStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTogglingGate, setIsTogglingGate] = useState<boolean>(false);

  // Add Volunteer Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<VolunteerCreationResult | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vols, st] = await Promise.all([getVolunteers(), getEntryStats()]);
      setVolunteers(vols);
      setStats(st);
    } catch (err) {
      console.warn('[VolunteersTab] Error loading volunteer data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleGate = async () => {
    if (!stats) return;
    setIsTogglingGate(true);
    try {
      const newOpen = !stats.scanningOpen;
      const success = await toggleEntryScanning(newOpen);
      if (success) {
        setStats((prev) => (prev ? { ...prev, scanningOpen: newOpen } : prev));
      }
    } finally {
      setIsTogglingGate(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const success = await toggleVolunteerActive(id, !currentActive);
    if (success) {
      setVolunteers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, isActive: !currentActive } : v))
      );
    }
  };

  const handleCreateVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim()) {
      setErrorMsg('Full name and email are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await createVolunteer(nameInput, emailInput, phoneInput);
      if (!res.success) {
        setErrorMsg(res.message || 'Failed to create volunteer account.');
      } else {
        setCreationResult(res);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create volunteer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setNameInput('');
    setEmailInput('');
    setPhoneInput('');
    setErrorMsg(null);
    setCreationResult(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* SECTION HEADER & ENTRY GATE CONTROL BANNER */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Badge variant="gold" icon={<Users className="w-3.5 h-3.5 text-amber-400" />}>
              VOLUNTEER OPERATIONS
            </Badge>
            {stats?.scanningOpen ? (
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ENTRY GATE OPEN
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/40 text-red-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                ENTRY GATE CLOSED
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tight">
            GATE VOLUNTEERS & <span className="text-amber-400">ENTRY CONTROL</span>
          </h2>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            Manage event gate volunteers, control whole-day venue entry scanning, and monitor live scans.
          </p>
        </div>

        {/* GATE CONTROL SWITCH & ACTION */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="p-3 bg-[#141420] border border-[#27273C] flex items-center space-x-4">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase block">VENUE ENTRY SCANNING</span>
              <span className={`text-sm font-bold uppercase font-mono ${stats?.scanningOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats?.scanningOpen ? 'OPEN FOR ENTRY' : 'SCANNING CLOSED'}
              </span>
            </div>
            <Button
              onClick={handleToggleGate}
              disabled={isTogglingGate}
              variant={stats?.scanningOpen ? 'outline' : 'primary'}
              size="sm"
              icon={isTogglingGate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
            >
              {stats?.scanningOpen ? 'CLOSE GATE' : 'OPEN GATE'}
            </Button>
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            size="md"
            icon={<UserPlus className="w-4 h-4" />}
          >
            Add Volunteer
          </Button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-5 bg-[#0E0E16] border border-[#1E1E2C] space-y-1">
          <span className="text-xs text-zinc-400 uppercase block">ACTIVE VOLUNTEERS</span>
          <span className="text-3xl font-display font-black text-amber-400">
            {volunteers.filter((v) => v.isActive).length} / {volunteers.length}
          </span>
        </div>

        <div className="p-5 bg-[#0E0E16] border border-[#1E1E2C] space-y-1">
          <span className="text-xs text-zinc-400 uppercase block">TOTAL VENUE ENTRIES</span>
          <span className="text-3xl font-display font-black text-emerald-400">
            {stats?.totalEntries || 0}
          </span>
        </div>

        <div className="p-5 bg-[#0E0E16] border border-[#1E1E2C] space-y-1">
          <span className="text-xs text-zinc-400 uppercase block">ENTRY THROUGHPUT</span>
          <span className="text-3xl font-display font-black text-white">
            {stats?.totalPaidTickets ? Math.round(((stats.totalEntries || 0) / stats.totalPaidTickets) * 100) : 0}%
          </span>
          <span className="text-[10px] text-zinc-500 block font-sans">
            of {stats?.totalPaidTickets || 0} paid ticket holders entered
          </span>
        </div>
      </div>

      {/* VOLUNTEERS ROSTER TABLE */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-display font-bold text-white uppercase">
              VOLUNTEER ROSTER
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {volunteers.length} Registered Volunteers
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mr-2" />
            <span className="text-xs font-mono text-zinc-400">Loading volunteer roster...</span>
          </div>
        ) : volunteers.length === 0 ? (
          <div className="text-center py-12 bg-[#141420] border border-[#222234] space-y-3">
            <Users className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-xs font-mono text-zinc-400">No gate volunteers registered yet.</p>
            <Button onClick={() => setShowAddModal(true)} variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}>
              Add First Volunteer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#1C1C2A] text-zinc-400 uppercase text-[10px]">
                  <th className="py-3 px-4">CODE</th>
                  <th className="py-3 px-4">NAME</th>
                  <th className="py-3 px-4">EMAIL</th>
                  <th className="py-3 px-4">SCANS RECORDED</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C2A]">
                {volunteers.map((vol) => (
                  <tr key={vol.id} className="hover:bg-[#141420] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-amber-400">{vol.code}</td>
                    <td className="py-3.5 px-4 text-white font-bold">{vol.name}</td>
                    <td className="py-3.5 px-4 text-zinc-300">{vol.email}</td>
                    <td className="py-3.5 px-4 text-white font-bold">{vol.scansCount || 0}</td>
                    <td className="py-3.5 px-4">
                      {vol.isActive ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-500/10 border border-zinc-500/40 text-zinc-400 text-[10px] font-bold uppercase">
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        onClick={() => handleToggleActive(vol.id, vol.isActive)}
                        variant="outline"
                        size="sm"
                      >
                        {vol.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT VENUE ENTRIES STREAM */}
      {stats?.recentEntries && stats.recentEntries.length > 0 && (
        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-display font-bold text-white uppercase">
                LIVE VENUE SCAN LOGS
              </h3>
            </div>
            <span className="text-xs font-mono text-zinc-500">RECENT ENTRY SCANS</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#1C1C2A] text-zinc-400 uppercase text-[10px]">
                  <th className="py-3 px-4">ATTENDEE</th>
                  <th className="py-3 px-4">TICKET CODE</th>
                  <th className="py-3 px-4">GATE VOLUNTEER</th>
                  <th className="py-3 px-4 text-right">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C2A]">
                {stats.recentEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#141420] transition-colors">
                    <td className="py-3 px-4 text-white font-bold">{entry.attendeeName}</td>
                    <td className="py-3 px-4 text-amber-400 font-bold">{entry.ticketCode}</td>
                    <td className="py-3 px-4 text-zinc-300">{entry.volunteerName}</td>
                    <td className="py-3 px-4 text-right text-zinc-400">
                      {new Date(entry.scannedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD VOLUNTEER MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0E0E16] border-2 border-amber-400/80 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1C1C2A] pb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-display font-bold text-white uppercase">
                  REGISTER NEW GATE VOLUNTEER
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-zinc-400 hover:text-white text-xl font-mono"
              >
                ✕
              </button>
            </div>

            {creationResult ? (
              <div className="space-y-6 text-center">
                <div className="w-12 h-12 mx-auto bg-emerald-400 text-black flex items-center justify-center rounded-full font-bold">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div>
                  <Badge variant="gold">VOLUNTEER CREATED</Badge>
                  <h4 className="text-xl font-display font-black text-white uppercase mt-2">
                    {creationResult.volunteer.name} ({creationResult.volunteer.code})
                  </h4>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    Linked to <strong>{creationResult.volunteer.email}</strong>.
                  </p>
                </div>

                {!creationResult.volunteer.authLinked ? (
                  <div className="p-4 bg-[#141420] border border-amber-400/60 text-left space-y-2">
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">
                      ACTIVATION REQUIRED — GOOGLE SIGN-IN
                    </span>
                    <p className="text-xs font-mono text-zinc-300 leading-relaxed">
                      Send{' '}
                      <strong className="text-white">{creationResult.volunteer.name}</strong> the
                      following instructions:
                    </p>
                    <div className="bg-black p-3 border border-[#27273C] space-y-1">
                      <p className="text-xs font-mono text-zinc-300">
                        1. Go to{' '}
                        <strong className="text-amber-400">{window.location.origin}/login</strong>
                      </p>
                      <p className="text-xs font-mono text-zinc-300">
                        2. Sign in with Google using{' '}
                        <strong className="text-amber-400">{creationResult.volunteer.email}</strong>
                      </p>
                      <p className="text-xs font-mono text-zinc-300">
                        3. Navigate to{' '}
                        <strong className="text-amber-400">/scanner</strong> — access activates
                        automatically.
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500">
                      No password. No separate login. Google account only.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-zinc-400">
                    Google account already linked. Volunteer can access /scanner immediately.
                  </p>
                )}

                <Button onClick={handleCloseModal} variant="primary" size="md" fullWidth>
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateVolunteer} className="space-y-4 font-mono text-xs text-left">
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block font-bold text-zinc-300 uppercase mb-2">
                    Full Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full px-4 py-3 bg-[#141420] border border-[#27273C] text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-300 uppercase mb-2">
                    Email Address <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="alex.vol@student.edu"
                    className="w-full px-4 py-3 bg-[#141420] border border-[#27273C] text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-300 uppercase mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 bg-[#141420] border border-[#27273C] text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#1C1C2A]">
                  <Button type="button" onClick={handleCloseModal} variant="secondary" size="md">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} variant="primary" size="md">
                    {isSubmitting ? 'Creating Account...' : 'Create Volunteer'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
