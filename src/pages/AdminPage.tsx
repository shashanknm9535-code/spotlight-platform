import React, { useState } from 'react';
import type { AdminTab, AdminRegistration, Act, LiveEventState, RegistrationStatus } from '../types';
import { MOCK_ACTS } from '../data/eventData';
import {
  authenticateAdminCode,
  getAdminRegistrations,
  updateRegistrationStatus,
  getRunningOrder,
  reorderActs,
  getLiveEventState,
  updateLiveEventState,
} from '../services/adminService';
import { PageContainer } from '../components/ui/PageContainer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AdminHeader } from '../components/admin/AdminHeader';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { OverviewTab } from '../components/admin/OverviewTab';
import { RegistrationsTab } from '../components/admin/RegistrationsTab';
import { RunningOrderTab } from '../components/admin/RunningOrderTab';
import { LiveEventTab } from '../components/admin/LiveEventTab';
import { JudgesTab } from '../components/admin/JudgesTab';
import { TicketsTab } from '../components/admin/TicketsTab';
import { StageTab } from '../components/admin/StageTab';
import { AdminDevControls } from '../components/admin/AdminDevControls';
import { Shield, KeyRound, ArrowRight, AlertTriangle } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin Data Stores
  const [registrations, setRegistrations] = useState<AdminRegistration[]>(getAdminRegistrations());
  const [runningOrder, setRunningOrder] = useState<Act[]>(getRunningOrder());
  const [liveState, setLiveState] = useState<LiveEventState>(getLiveEventState());

  const currentAct = runningOrder.find((a) => a.id === liveState.currentActId) || runningOrder[0];

  // Handle Mock Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoggingIn(true);

    try {
      const isValid = await authenticateAdminCode(codeInput);
      if (isValid) {
        setIsAuthenticated(true);
      } else {
        setErrorMsg('Admin access code not recognized. Try code: ADMIN-2026');
      }
    } catch (err: any) {
      setErrorMsg('Authentication error. Try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Status update callback
  const handleUpdateRegistrationStatus = async (id: string, status: RegistrationStatus) => {
    await updateRegistrationStatus(id, status);
    setRegistrations(getAdminRegistrations());
  };

  // Reorder callback
  const handleReorderActs = async (newActs: Act[]) => {
    const updated = await reorderActs(newActs);
    setRunningOrder(updated);
  };

  // Set Active Act
  const handleSetActiveAct = async (actId: string) => {
    const updated = await updateLiveEventState({ currentActId: actId });
    setLiveState(updated);
  };

  // Update Live State
  const handleUpdateLiveState = async (newState: Partial<LiveEventState>) => {
    const updated = await updateLiveEventState(newState);
    setLiveState(updated);
  };

  // Next Act
  const handleNextAct = async () => {
    const currentIdx = runningOrder.findIndex((a) => a.id === liveState.currentActId);
    const nextIdx = (currentIdx + 1) % runningOrder.length;
    const nextActId = runningOrder[nextIdx].id;
    await handleSetActiveAct(nextActId);
  };

  // Prev Act
  const handlePrevAct = async () => {
    const currentIdx = runningOrder.findIndex((a) => a.id === liveState.currentActId);
    const prevIdx = (currentIdx - 1 + runningOrder.length) % runningOrder.length;
    const prevActId = runningOrder[prevIdx].id;
    await handleSetActiveAct(prevActId);
  };

  return (
    <main className="min-h-screen bg-[#08080C] bg-noise">
      {!isAuthenticated ? (
        /* MOCK ADMIN LOGIN SCREEN */
        <div className="min-h-screen pt-32 pb-24 flex items-center justify-center px-4">
          <div className="w-full max-w-md p-8 sm:p-10 bg-[#0E0E16] border border-[#1E1E2C] text-center space-y-8 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto bg-amber-400 text-black flex items-center justify-center font-bold shadow-[0_0_30px_rgba(250,204,21,0.3)]">
              <KeyRound className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <Badge variant="gold">OFFICIAL ADMIN PORTAL</Badge>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase tracking-tight mt-3 mb-2">
                CONTROL CENTER
              </h1>
              <p className="text-sm text-zinc-400 font-sans">
                Manage the Spotlight event from one place.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-left font-mono text-xs">
              <div>
                <label className="block font-bold text-zinc-300 uppercase mb-2">
                  ADMIN ACCESS CODE <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="e.g. ADMIN-2026"
                  className="w-full px-4 py-3.5 bg-[#141420] border border-[#27273C] text-white text-sm uppercase tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isLoggingIn}
                icon={
                  isLoggingIn ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )
                }
              >
                {isLoggingIn ? 'AUTHENTICATING...' : 'Enter Control Center'}
              </Button>
            </form>

            <div className="p-3 bg-[#141420] border border-[#222234] text-[11px] font-mono text-zinc-400">
              <span className="text-amber-400 font-bold block mb-1">MOCK DEMO ACCESS CODE:</span>
              <code>ADMIN-2026</code>
            </div>
          </div>
        </div>
      ) : (
        /* AUTHENTICATED DASHBOARD LAYOUT */
        <div className="flex flex-col min-h-screen">
          <AdminHeader
            onLogout={() => setIsAuthenticated(false)}
            mobileMenuOpen={mobileMenuOpen}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          />

          <div className="flex grow">
            <AdminSidebar
              activeTab={activeTab}
              onSelectTab={(tab) => setActiveTab(tab)}
              mobileMenuOpen={mobileMenuOpen}
              onCloseMobileMenu={() => setMobileMenuOpen(false)}
            />

            <section className="grow p-6 sm:p-10 max-w-[1440px] mx-auto overflow-hidden">
              {activeTab === 'overview' && (
                <OverviewTab
                  liveState={liveState}
                  currentAct={currentAct}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onToggleVoting={() => handleUpdateLiveState({ votingOpen: !liveState.votingOpen })}
                  onNextAct={handleNextAct}
                />
              )}

              {activeTab === 'registrations' && (
                <RegistrationsTab
                  registrations={registrations}
                  onUpdateStatus={handleUpdateRegistrationStatus}
                />
              )}

              {activeTab === 'running-order' && (
                <RunningOrderTab
                  runningOrder={runningOrder}
                  activeActId={liveState.currentActId}
                  onReorder={handleReorderActs}
                  onSetActiveAct={handleSetActiveAct}
                />
              )}

              {activeTab === 'tickets' && <TicketsTab />}

              {activeTab === 'live' && (
                <LiveEventTab
                  liveState={liveState}
                  currentAct={currentAct}
                  onUpdateState={handleUpdateLiveState}
                  onNextAct={handleNextAct}
                />
              )}

              {activeTab === 'judges' && <JudgesTab />}

              {activeTab === 'stage' && (
                <StageTab
                  currentAct={currentAct}
                  onNextAct={handleNextAct}
                  onPrevAct={handlePrevAct}
                />
              )}
            </section>
          </div>

          {/* DEV CONTROLS TOOLBAR */}
          <AdminDevControls
            onResetEvent={() => {
              setRegistrations(getAdminRegistrations());
              setRunningOrder(getRunningOrder());
              setLiveState(getLiveEventState());
            }}
            onNextAct={handleNextAct}
            onToggleVoting={() => handleUpdateLiveState({ votingOpen: !liveState.votingOpen })}
          />
        </div>
      )}
    </main>
  );
};
