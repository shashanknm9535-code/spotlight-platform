import React, { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recordTicketEntry, getEntryStats } from '../services/volunteerService';
import type { EntryScanResult, EntryStats } from '../types';
import { PageContainer } from '../components/ui/PageContainer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  User,
  RefreshCw,
  Search,
  Lock,
  History,
  Camera,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const ScannerPage: React.FC = () => {
  const { user, isVolunteer, volunteer, isAdmin, isLoading, signOut } = useAuth();
  const [manualCode, setManualCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<EntryScanResult | null>(null);
  const [stats, setStats] = useState<EntryStats | null>(null);
  const [autoResetSeconds, setAutoResetSeconds] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load entry gate stats
  const loadStats = async () => {
    const s = await getEntryStats();
    setStats(s);
  };

  useEffect(() => {
    if (isVolunteer) {
      loadStats();
    }
  }, [isVolunteer]);

  // Auto-reset timer after scan
  useEffect(() => {
    if (autoResetSeconds === null) return;
    if (autoResetSeconds <= 0) {
      setLastResult(null);
      setAutoResetSeconds(null);
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    const timer = setTimeout(() => {
      setAutoResetSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoResetSeconds]);

  if (isLoading) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-[#08080C]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-xs font-mono text-zinc-400">VERIFYING VOLUNTEER IDENTITY...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isVolunteer) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-[#08080C] px-4">
        <div className="max-w-md w-full p-8 bg-[#0E0E16] border border-red-500/40 text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500 text-red-500 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <Badge variant="outline">RESTRICTED PORTAL</Badge>
            <h1 className="text-2xl font-display font-black text-white uppercase mt-2">
              VOLUNTEER ACCESS REQUIRED
            </h1>
            <p className="text-xs font-sans text-zinc-400 mt-2 leading-relaxed">
              Your account <strong>{user.email}</strong> is not registered as an active gate volunteer.
            </p>
          </div>
          <Button href="/account" variant="secondary" size="md" fullWidth>
            Return to Account
          </Button>
        </div>
      </div>
    );
  }

  const handleScanSubmit = async (codeToSubmit?: string) => {
    const targetCode = codeToSubmit || manualCode;
    if (!targetCode.trim() || isProcessing) return;

    setIsProcessing(true);
    setLastResult(null);
    setAutoResetSeconds(null);

    try {
      const res = await recordTicketEntry(targetCode);
      setLastResult(res);
      setManualCode('');
      loadStats();
      setAutoResetSeconds(4); // 4-second auto reset
    } catch (err: any) {
      setLastResult({
        success: false,
        resultCode: 'SCANNER_ERROR',
        message: err?.message || 'Scanning system error.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanSubmit();
  };

  const volunteerDisplayName = volunteer?.name || (isAdmin ? 'Admin Gate Master' : 'Gate Volunteer');
  const volunteerCode = volunteer?.code || (isAdmin ? 'ADMIN-GATE' : 'VOL-XX');

  return (
    <main className="min-h-screen pt-28 pb-20 bg-[#08080C] bg-noise">
      <PageContainer size="narrow">
        <div className="space-y-6">
          {/* HEADER BAR */}
          <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <Badge variant="gold" icon={<ShieldCheck className="w-3 h-3 text-amber-400" />}>
                  GATE SCANNER
                </Badge>
                {stats?.scanningOpen ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold uppercase">
                    ENTRY OPEN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/40 text-red-400 font-mono text-[10px] font-bold uppercase">
                    ENTRY CLOSED
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                VENUE ENTRY <span className="text-amber-400">SCANNER</span>
              </h1>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Volunteer: <strong>{volunteerDisplayName}</strong> ({volunteerCode})
              </p>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right font-mono text-xs">
                <span className="text-zinc-500 block">TOTAL ENTERED</span>
                <span className="text-amber-400 font-bold text-base">
                  {stats?.totalEntries || 0} / {stats?.totalPaidTickets || 0}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN SCANNER RESULT CARD */}
          {lastResult && (
            <div
              className={`p-6 border-2 transition-all duration-300 animate-in zoom-in-95 ${
                lastResult.resultCode === 'VALID_ENTRY'
                  ? 'bg-[#061A12] border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.2)]'
                  : lastResult.resultCode === 'ALREADY_ENTERED'
                  ? 'bg-[#1C1608] border-amber-400 shadow-[0_0_50px_rgba(250,204,21,0.2)]'
                  : 'bg-[#1A0A0E] border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)]'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  {lastResult.resultCode === 'VALID_ENTRY' && (
                    <div className="w-10 h-10 bg-emerald-400 text-black flex items-center justify-center rounded-full font-bold">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                  {lastResult.resultCode === 'ALREADY_ENTERED' && (
                    <div className="w-10 h-10 bg-amber-400 text-black flex items-center justify-center rounded-full font-bold">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                  {lastResult.resultCode !== 'VALID_ENTRY' && lastResult.resultCode !== 'ALREADY_ENTERED' && (
                    <div className="w-10 h-10 bg-red-500 text-white flex items-center justify-center rounded-full font-bold">
                      <XCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest block text-zinc-400">
                      SCAN RESULT
                    </span>
                    <h2
                      className={`text-xl font-display font-black uppercase tracking-wide ${
                        lastResult.resultCode === 'VALID_ENTRY'
                          ? 'text-emerald-400'
                          : lastResult.resultCode === 'ALREADY_ENTERED'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {lastResult.message}
                    </h2>
                  </div>
                </div>

                {autoResetSeconds !== null && (
                  <span className="text-xs font-mono text-zinc-400 bg-black/40 px-2.5 py-1 border border-white/10">
                    Next scan in {autoResetSeconds}s
                  </span>
                )}
              </div>

              {/* DETAILS CONTENT */}
              <div className="pt-4 space-y-3 font-mono text-xs">
                {lastResult.attendeeName && (
                  <div className="p-3 bg-black/40 border border-white/10">
                    <span className="text-zinc-400 block text-[10px] uppercase">ATTENDEE NAME</span>
                    <span className="text-base font-bold text-white uppercase">{lastResult.attendeeName}</span>
                  </div>
                )}

                {lastResult.ticketCode && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-black/40 border border-white/10">
                      <span className="text-zinc-400 block text-[10px] uppercase">TICKET CODE</span>
                      <span className="text-amber-400 font-bold">{lastResult.ticketCode}</span>
                    </div>
                    <div className="p-2.5 bg-black/40 border border-white/10">
                      <span className="text-zinc-400 block text-[10px] uppercase">SCAN TIME</span>
                      <span className="text-white">
                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}

                {lastResult.resultCode === 'ALREADY_ENTERED' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      Previously Scanned Information
                    </p>
                    <p>Scanned By: <strong>{lastResult.scannedBy || 'Gate Volunteer'}</strong></p>
                    {lastResult.firstScannedAt && (
                      <p>Time: <strong>{new Date(lastResult.firstScannedAt).toLocaleTimeString()}</strong></p>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => {
                    setLastResult(null);
                    setAutoResetSeconds(null);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  variant="secondary"
                  size="md"
                  fullWidth
                >
                  Scan Next Ticket Pass
                </Button>
              </div>
            </div>
          )}

          {/* SCANNER INPUT FORM */}
          <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-[#1C1C2A]">
              <QrCode className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-display font-bold text-white uppercase">
                  ENTER OR SCAN TICKET CODE
                </h3>
                <span className="text-xs font-mono text-zinc-400">
                  Scan QR badge or enter code e.g. SPT-TKT-2026-422882
                </span>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
                  Ticket Code <span className="text-amber-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="SPT-TKT-2026-XXXXXX"
                    autoFocus
                    className="grow px-4 py-3.5 bg-[#141420] border border-[#27273C] text-white font-mono text-base tracking-wider focus:outline-none focus:border-amber-400 transition-colors uppercase"
                  />
                  <Button
                    type="submit"
                    disabled={isProcessing || !manualCode.trim()}
                    variant="primary"
                    size="md"
                    icon={isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  >
                    {isProcessing ? 'SCANNING...' : 'VERIFY ENTRY'}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* RECENT SCAN ACTIVITY DRAWER */}
          {stats?.recentEntries && stats.recentEntries.length > 0 && (
            <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1C1C2A] pb-3">
                <div className="flex items-center space-x-2 text-zinc-300">
                  <History className="w-4 h-4 text-amber-400" />
                  <span className="font-bold uppercase">RECENT GATE ENTRIES</span>
                </div>
                <span className="text-zinc-500 text-[10px]">LAST 20 SCANS</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {stats.recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-[#141420] border border-[#222234] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="text-white font-bold block">{entry.attendeeName}</span>
                      <span className="text-amber-400 text-[11px] block">{entry.ticketCode}</span>
                    </div>
                    <div className="text-right text-zinc-400 text-[11px]">
                      <span className="block text-zinc-300">{entry.volunteerName}</span>
                      <span className="block text-zinc-500">
                        {new Date(entry.scannedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </main>
  );
};
