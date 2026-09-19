import React, { useState } from 'react';
import type { RegistrationResult } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Sparkles, ArrowLeft, CheckCircle2, Ticket, Eye, Copy, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface RegistrationSuccessProps {
  result: RegistrationResult;
}

export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({ result }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(result.actId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-3xl mx-auto text-center">
      {/* SUCCESS STAGE HEADER */}
      <div className="p-8 sm:p-12 bg-[#0E0E16] border border-amber-400/50 relative overflow-hidden shadow-[0_0_50px_rgba(250,204,21,0.15)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-[90px] pointer-events-none" />

        <div className="w-20 h-20 mx-auto bg-amber-400 text-black flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(250,204,21,0.4)]">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div className="inline-block mb-3">
          <Badge variant="gold" icon={<Sparkles className="w-3.5 h-3.5" />}>
            REGISTRATION CONFIRMED
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-6xl font-display font-black text-white uppercase tracking-tight mb-3">
          YOU'RE IN.
        </h1>

        <p className="text-base sm:text-lg text-zinc-300 font-sans max-w-md mx-auto leading-relaxed mb-8">
          Your performer registration has been received and queued for the auditorium stage management slate.
        </p>

        {/* ACT ID CARD */}
        <div className="p-6 bg-[#141420] border border-[#27273C] max-w-md mx-auto mb-8 relative">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-1">
            OFFICIAL MOCK ACT ID
          </span>
          <div className="flex items-center justify-center space-x-3">
            <span className="text-3xl sm:text-4xl font-display font-black text-amber-400 tracking-wider">
              {result.actId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-2 text-zinc-400 hover:text-amber-400 bg-[#0C0C14] border border-[#27273C] transition-colors"
              title="Copy Act ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && (
            <span className="text-[10px] font-mono text-emerald-400 block mt-1">
              Copied to clipboard!
            </span>
          )}

          <div className="mt-4 pt-4 border-t border-[#222234] flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">STATUS:</span>
            <Badge variant="gold">{result.status}</Badge>
          </div>
        </div>

        {/* SUMMARY QUICK SPECS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono text-left max-w-md mx-auto mb-8">
          <div className="p-3 bg-[#141420] border border-[#222234]">
            <span className="text-zinc-500 block">CATEGORY</span>
            <span className="font-bold text-white uppercase">
              {result.formData.category}
            </span>
          </div>

          <div className="p-3 bg-[#141420] border border-[#222234]">
            <span className="text-zinc-500 block">GENRE</span>
            <span className="font-bold text-white uppercase">
              {result.formData.performanceType}
            </span>
          </div>

          <div className="p-3 bg-[#141420] border border-[#222234] col-span-2 sm:col-span-1">
            <span className="text-zinc-500 block">PERFORMER</span>
            <span className="font-bold text-white uppercase truncate block">
              {result.formData.name}
            </span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Button
            href="/"
            variant="primary"
            size="md"
            fullWidth
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Spotlight
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setShowDetails(!showDetails)}
            icon={<Eye className="w-4 h-4 text-amber-400" />}
          >
            {showDetails ? 'Hide Registration' : 'View Registration'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE REGISTRATION DETAILS SLATE */}
      {showDetails && (
        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] text-left text-xs font-mono space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
            <span className="font-bold text-amber-400 uppercase">LOCAL REGISTRATION SLATE</span>
            <span className="text-zinc-500">{new Date(result.submittedAt).toLocaleTimeString()}</span>
          </div>

          <div className="space-y-2 text-zinc-300">
            <div><strong className="text-zinc-500">Act ID:</strong> {result.actId}</div>
            <div><strong className="text-zinc-500">Lead Performer:</strong> {result.formData.name}</div>
            <div><strong className="text-zinc-500">Department:</strong> {result.formData.department} ({result.formData.year})</div>
            <div><strong className="text-zinc-500">Contact:</strong> {result.formData.phone} | {result.formData.email}</div>
            <div><strong className="text-zinc-500">Self Rating:</strong> {result.formData.selfRating} / 10</div>
            <div><strong className="text-zinc-500">Bio:</strong> "{result.formData.blurb}"</div>
            {result.formData.teamMembers.length > 0 && (
              <div>
                <strong className="text-zinc-500">Team Roster ({result.formData.teamMembers.length}):</strong>
                <ul className="pl-4 list-disc mt-1 text-zinc-400">
                  {result.formData.teamMembers.map((m) => (
                    <li key={m.id}>{m.name} — {m.department} ({m.year})</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
