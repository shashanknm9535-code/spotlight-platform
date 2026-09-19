import React, { useState, useEffect } from 'react';
import type { VotingState, Act } from '../types';
import { MOCK_ACTS } from '../data/eventData';
import {
  validateTicketId,
  submitAudienceVote,
  hasVotedForAct,
  getVotedRating,
  resetMockVotes,
} from '../services/votingService';
import { PageContainer } from '../components/ui/PageContainer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TicketScannerModal } from '../components/voting/TicketScannerModal';
import { PerformerCard } from '../components/voting/PerformerCard';
import { LiveTimerBadge } from '../components/voting/LiveTimerBadge';
import { RatingSelector } from '../components/voting/RatingSelector';
import { DevControlsPanel } from '../components/voting/DevControlsPanel';
import {
  Radio,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  LogOut,
  Sparkles,
  Lock,
  Ticket as TicketIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const VotePage: React.FC = () => {
  const [votingState, setVotingState] = useState<VotingState>('ticket_required');
  const [ticketInput, setTicketInput] = useState('');
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const [activeActIndex, setActiveActIndex] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number>(8);
  const [isVotingOpen, setIsVotingOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const currentAct: Act = MOCK_ACTS[activeActIndex] || MOCK_ACTS[0];

  // Check if ticket already voted when act or ticket changes
  useEffect(() => {
    if (!activeTicket) return;
    const voted = hasVotedForAct(activeTicket, currentAct.id);
    if (voted) {
      setVotingState('already_voted');
    } else if (!isVotingOpen) {
      setVotingState('voting_closed');
    } else if (votingState !== 'submitting' && votingState !== 'voted') {
      setVotingState('voting_open');
    }
  }, [activeTicket, activeActIndex, isVotingOpen]);

  // Handle Ticket Validation
  const handleValidateTicket = async (idToValidate: string) => {
    setErrorMessage(null);
    setVotingState('validating');
    setShowScanner(false);

    try {
      const isValid = await validateTicketId(idToValidate);
      if (isValid) {
        const normalized = idToValidate.trim().toUpperCase();
        setActiveTicket(normalized);
        const alreadyVoted = hasVotedForAct(normalized, currentAct.id);
        if (alreadyVoted) {
          setVotingState('already_voted');
        } else if (!isVotingOpen) {
          setVotingState('voting_closed');
        } else {
          setVotingState('voting_open');
        }
      } else {
        setVotingState('ticket_invalid');
      }
    } catch (err: any) {
      setVotingState('ticket_invalid');
    }
  };

  // Submit Vote Handler
  const handleSubmitVote = async () => {
    if (!activeTicket) {
      setVotingState('ticket_required');
      return;
    }

    setErrorMessage(null);
    setVotingState('submitting');

    try {
      await submitAudienceVote(activeTicket, currentAct.id, selectedRating);
      setVotingState('voted');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit vote.');
      setVotingState('already_voted');
    }
  };

  // Dev harness callbacks
  const handleDevValidTicket = () => {
    setTicketInput('SPT-TKT-2026-0001');
    handleValidateTicket('SPT-TKT-2026-0001');
  };

  const handleDevInvalidTicket = () => {
    setTicketInput('SPT-TKT-INVALID-999');
    handleValidateTicket('SPT-TKT-INVALID-999');
  };

  const handleDevNextAct = () => {
    const nextIdx = (activeActIndex + 1) % MOCK_ACTS.length;
    setActiveActIndex(nextIdx);
    if (activeTicket) {
      const voted = hasVotedForAct(activeTicket, MOCK_ACTS[nextIdx].id);
      if (voted) setVotingState('already_voted');
      else setVotingState(isVotingOpen ? 'voting_open' : 'voting_closed');
    }
  };

  const handleDevToggleOpen = () => {
    setIsVotingOpen(!isVotingOpen);
    if (activeTicket) {
      if (!isVotingOpen) {
        const voted = hasVotedForAct(activeTicket, currentAct.id);
        setVotingState(voted ? 'already_voted' : 'voting_open');
      } else {
        setVotingState('voting_closed');
      }
    }
  };

  const handleDevResetVotes = () => {
    resetMockVotes();
    if (activeTicket) {
      setVotingState(isVotingOpen ? 'voting_open' : 'voting_closed');
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-28 bg-[#08080C] bg-noise">
      <PageContainer size="narrow">
        {/* COMPACT VOTING HEADER */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#1C1C2A]">
          <div className="flex items-center space-x-3">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <span className="font-display font-black text-xl text-white uppercase tracking-wider block">
                SPOTLIGHT VOTE
              </span>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">
                LIVE AUDIENCE POWER
              </span>
            </div>
          </div>

          {activeTicket ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right text-xs font-mono">
                <span className="text-zinc-500 block">ACTIVE PASS</span>
                <span className="text-amber-400 font-bold">{activeTicket}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTicket(null);
                  setVotingState('ticket_required');
                }}
                className="p-2 text-xs font-mono text-zinc-400 hover:text-white bg-[#141420] border border-[#27273C] flex items-center gap-1"
                title="Change Ticket"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          ) : (
            <Link
              to="/ticket"
              className="text-xs font-mono text-amber-400 hover:text-yellow-300 flex items-center gap-1"
            >
              <TicketIcon className="w-3.5 h-3.5" />
              <span>Get ₹10 Ticket</span>
            </Link>
          )}
        </div>

        {/* 1. STATE: TICKET REQUIRED */}
        {votingState === 'ticket_required' && (
          <div className="p-6 sm:p-10 bg-[#0E0E16] border border-[#1E1E2C] text-center space-y-8 animate-in fade-in duration-300">
            <div className="max-w-md mx-auto">
              <Badge variant="gold">LIVE VOTING PORTAL</Badge>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-tight mt-3 mb-2">
                YOUR VOICE <span className="text-amber-400 spotlight-text-glow">MATTERS.</span>
              </h1>
              <p className="text-sm text-zinc-300 font-sans leading-relaxed">
                Rate the performance currently on stage. Scan your ticket QR pass or enter your Ticket ID below.
              </p>
            </div>

            {/* ACTION 1: SCAN QR */}
            <div className="max-w-md mx-auto space-y-4">
              <Button
                type="button"
                onClick={() => setShowScanner(true)}
                variant="primary"
                size="lg"
                fullWidth
                icon={<Camera className="w-5 h-5" />}
              >
                Scan Ticket QR
              </Button>

              <div className="flex items-center my-4">
                <div className="grow border-t border-[#1C1C2A]" />
                <span className="px-3 text-xs font-mono text-zinc-500 uppercase">OR</span>
                <div className="grow border-t border-[#1C1C2A]" />
              </div>

              {/* ACTION 2: ENTER TICKET ID */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (ticketInput.trim()) handleValidateTicket(ticketInput);
                }}
                className="space-y-3 text-left"
              >
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
                  ENTER TICKET ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value)}
                    placeholder="SPT-TKT-2026-0001"
                    className="grow px-4 py-3 bg-[#141420] border border-[#27273C] text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                  <Button type="submit" variant="secondary" size="md">
                    Verify
                  </Button>
                </div>
              </form>
            </div>

            <p className="text-[11px] font-mono text-zinc-500 max-w-sm mx-auto">
              💡 Don't have a ticket pass yet? <Link to="/ticket" className="text-amber-400 underline">Buy a ₹10 Audience Ticket here</Link>.
            </p>
          </div>
        )}

        {/* 2. STATE: VALIDATING */}
        {votingState === 'validating' && (
          <div className="p-12 bg-[#0E0E16] border border-amber-400/40 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 mx-auto border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider">
              VERIFYING TICKET...
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              Checking your Spotlight audience pass validity.
            </p>
          </div>
        )}

        {/* 3. STATE: TICKET INVALID */}
        {votingState === 'ticket_invalid' && (
          <div className="p-8 bg-[#0E0E16] border border-red-500/50 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <Badge variant="outline" className="border-red-500/40 text-red-400">
                VERIFICATION FAILED
              </Badge>
              <h2 className="text-2xl font-display font-bold text-white uppercase mt-2">
                TICKET NOT RECOGNIZED
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                This ticket pass could not be verified against the event registry.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setVotingState('ticket_required')}
              variant="secondary"
              size="md"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* 4. STATE: VOTING OPEN & SUBMITTING */}
        {(votingState === 'voting_open' || votingState === 'submitting') && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* LIVE COUNTDOWN BADGE */}
            <LiveTimerBadge
              initialSeconds={45}
              isOpen={isVotingOpen}
              onTimerExpire={() => setVotingState('voting_closed')}
            />

            {/* CURRENT PERFORMER ON STAGE */}
            <PerformerCard act={currentAct} />

            {/* RATING SELECTOR */}
            <RatingSelector
              selectedRating={selectedRating}
              disabled={votingState === 'submitting'}
              onSelectRating={(r) => setSelectedRating(r)}
            />

            {errorMessage && (
              <p className="text-xs font-mono text-red-400 text-center p-3 bg-red-500/10 border border-red-500/30">
                ⚠️ {errorMessage}
              </p>
            )}

            {/* SUBMIT BUTTON */}
            <Button
              type="button"
              onClick={handleSubmitVote}
              disabled={votingState === 'submitting'}
              variant="primary"
              size="lg"
              fullWidth
              icon={
                votingState === 'submitting' ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )
              }
            >
              {votingState === 'submitting'
                ? 'RECORDING YOUR VOTE...'
                : `SUBMIT VOTE FOR ACT #${currentAct.slotNumber}`}
            </Button>
          </div>
        )}

        {/* 5. STATE: VOTED CONFIRMATION */}
        {votingState === 'voted' && (
          <div className="p-8 sm:p-10 bg-[#0E0E16] border border-amber-400/60 text-center space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 mx-auto bg-amber-400 text-black flex items-center justify-center shadow-[0_0_25px_rgba(250,204,21,0.4)]">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <Badge variant="gold" icon={<Sparkles className="w-3.5 h-3.5" />}>
              VOTE RECORDED
            </Badge>

            <h2 className="text-3xl sm:text-4xl font-display font-black text-white uppercase tracking-tight">
              VOTE LOCKED
            </h2>

            <p className="text-sm text-zinc-300 font-sans max-w-sm mx-auto">
              Your rating for <strong>{currentAct.title}</strong> has been locked into the live ledger.
            </p>

            <div className="p-4 bg-[#141420] border border-[#27273C] max-w-xs mx-auto font-mono text-xs space-y-1">
              <span className="text-zinc-500 block">ACT #{currentAct.slotNumber} YOUR RATING</span>
              <span className="text-3xl font-display font-black text-amber-400">
                {selectedRating} / 10
              </span>
            </div>

            <div className="pt-4 border-t border-[#1C1C2A] text-xs font-mono text-zinc-400">
              ⏳ Waiting for the next performance to begin...
            </div>
          </div>
        )}

        {/* 6. STATE: ALREADY VOTED */}
        {votingState === 'already_voted' && (
          <div className="p-8 bg-[#0E0E16] border border-[#1E1E2C] text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-14 h-14 mx-auto bg-[#141420] border border-[#27273C] text-amber-400 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>

            <Badge variant="gold">ONE VOTE PER ACT ENFORCED</Badge>

            <h2 className="text-2xl font-display font-bold text-white uppercase">
              ALREADY VOTED
            </h2>

            <p className="text-sm text-zinc-300 font-sans max-w-sm mx-auto">
              You have already cast your vote for <strong>{currentAct.title}</strong> (Act #{currentAct.slotNumber}).
            </p>

            {activeTicket && getVotedRating(activeTicket, currentAct.id) !== null && (
              <div className="p-3 bg-[#141420] border border-[#27273C] inline-block font-mono text-xs">
                <span className="text-zinc-500 block">YOUR SUBMITTED RATING</span>
                <span className="text-2xl font-display font-bold text-amber-400">
                  {getVotedRating(activeTicket, currentAct.id)} / 10
                </span>
              </div>
            )}

            <p className="text-xs font-mono text-zinc-400 pt-3 border-t border-[#1C1C2A]">
              Your ticket is ready to vote again when the next act takes the stage.
            </p>
          </div>
        )}

        {/* 7. STATE: VOTING CLOSED */}
        {votingState === 'voting_closed' && (
          <div className="p-8 bg-[#0E0E16] border border-[#1E1E2C] text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-14 h-14 mx-auto bg-[#141420] border border-[#27273C] text-zinc-500 flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>

            <Badge variant="dark">VOTING WINDOW CLOSED</Badge>

            <h2 className="text-2xl font-display font-bold text-white uppercase">
              VOTING IS CURRENTLY CLOSED
            </h2>

            <p className="text-sm text-zinc-300 font-sans max-w-sm mx-auto">
              The voting window for Act #{currentAct.slotNumber} has ended. The next act will begin shortly.
            </p>

            <div className="p-4 bg-[#141420] border border-[#27273C] max-w-xs mx-auto font-mono text-xs">
              <span className="text-amber-400 block font-bold">NEXT UP ON STAGE</span>
              <span className="text-white">
                Act #{(activeActIndex + 2 > MOCK_ACTS.length ? 1 : activeActIndex + 2)} —{' '}
                {MOCK_ACTS[(activeActIndex + 1) % MOCK_ACTS.length].title}
              </span>
            </div>
          </div>
        )}

        {/* SCANNER MODAL */}
        {showScanner && (
          <TicketScannerModal
            onSimulateScan={() => handleValidateTicket('SPT-TKT-2026-0001')}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* DEV CONTROLS OVERLAY FOR TESTING */}
        <DevControlsPanel
          onUseValidTicket={handleDevValidTicket}
          onUseInvalidTicket={handleDevInvalidTicket}
          onNextAct={handleDevNextAct}
          onToggleVotingOpen={handleDevToggleOpen}
          onResetVotes={handleDevResetVotes}
          isVotingOpen={isVotingOpen}
          activeActSlot={currentAct.slotNumber}
        />
      </PageContainer>
    </main>
  );
};
