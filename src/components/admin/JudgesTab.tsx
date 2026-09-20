import React, { useState, useEffect, useCallback } from 'react';
import {
  getJudgeMatrix,
  getJudges,
  createJudge,
  setJudgeActive,
  getRunningOrder,
} from '../../services/adminService';
import type { JudgeDetail } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Award,
  CheckCircle2,
  Minus,
  UserPlus,
  Power,
  PowerOff,
  RefreshCw,
  AlertTriangle,
  Anchor,
  Users,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateJudgeForm {
  name: string;
  email: string;
  isAnchor: boolean;
}

const EMPTY_FORM: CreateJudgeForm = { name: '', email: '', isAnchor: false };

// ─── Component ───────────────────────────────────────────────────────────────

export const JudgesTab: React.FC = () => {
  // ── Judge roster ────────────────────────────────────────────────────────────
  const [judges, setJudges] = useState<JudgeDetail[]>([]);
  const [judgesLoading, setJudgesLoading] = useState(true);
  const [judgesError, setJudgesError] = useState<string | null>(null);

  // ── Submission matrix ────────────────────────────────────────────────────────
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [matrixActs, setMatrixActs] = useState<{ id: string; slotNumber: number; title: string }[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(true);

  // ── Create-judge form ────────────────────────────────────────────────────────
  const [form, setForm] = useState<CreateJudgeForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // ── Toggle active ────────────────────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Load judges ──────────────────────────────────────────────────────────────
  const loadJudges = useCallback(async () => {
    setJudgesLoading(true);
    setJudgesError(null);
    try {
      const list = await getJudges();
      setJudges(list);
    } catch {
      setJudgesError('Failed to load judges. Please refresh.');
    } finally {
      setJudgesLoading(false);
    }
  }, []);

  // ── Load matrix ──────────────────────────────────────────────────────────────
  const loadMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      // getJudgeMatrix returns { judgeKey: { actKey: submitted } }
      const m = await getJudgeMatrix();
      setMatrix(m);

      // Fetch approved acts for column headers
      const acts = await getRunningOrder();
      setMatrixActs(acts.map((a) => ({ id: a.id, slotNumber: a.slotNumber, title: a.title })));
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJudges();
    loadMatrix();
  }, [loadJudges, loadMatrix]);

  // ── Create judge handler ─────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!form.name.trim()) {
      setFormError('Judge full name is required.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }

    setIsCreating(true);
    try {
      const created = await createJudge(form.name.trim(), form.email.trim(), form.isAnchor);
      if (created) {
        setFormSuccess(`Judge ${created.code} — ${created.name} created successfully.`);
        setForm(EMPTY_FORM);
        await loadJudges();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create judge.');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Toggle active handler ────────────────────────────────────────────────────
  const handleToggleActive = async (judge: JudgeDetail) => {
    setTogglingId(judge.id);
    try {
      const ok = await setJudgeActive(judge.id, !judge.isActive);
      if (ok) {
        setJudges((prev) =>
          prev.map((j) => (j.id === judge.id ? { ...j, isActive: !j.isActive } : j))
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const activeJudges = judges.filter((j) => j.isActive);
  const inactiveJudges = judges.filter((j) => !j.isActive);

  return (
    <div className="space-y-10 animate-in fade-in duration-300">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <div>
        <Badge variant="gold">JUDGE MANAGEMENT</Badge>
        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-1">
          JUDGES PANEL &amp; SCORE MATRIX
        </h1>
        <p className="text-xs font-mono text-zinc-400 mt-1">
          Create judge accounts, manage panel membership, and monitor live score submissions.
        </p>
      </div>

      {/* ── CREATE JUDGE FORM ─────────────────────────────────────────────────── */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1C1C2A]">
          <UserPlus className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-display font-bold text-white uppercase tracking-wide">
            ADD JUDGE TO PANEL
          </h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                id="judge-name-input"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Dr. Priya Nair"
                className="w-full px-3 py-2.5 bg-[#141420] border border-[#2A2A3C] text-white text-sm font-mono
                           focus:outline-none focus:border-amber-400/60 transition-colors placeholder:text-zinc-600"
                disabled={isCreating}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                id="judge-email-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="judge@college.edu"
                className="w-full px-3 py-2.5 bg-[#141420] border border-[#2A2A3C] text-white text-sm font-mono
                           focus:outline-none focus:border-amber-400/60 transition-colors placeholder:text-zinc-600"
                disabled={isCreating}
                autoComplete="off"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
            <div
              onClick={() => !isCreating && setForm((f) => ({ ...f, isAnchor: !f.isAnchor }))}
              className={`w-10 h-5 rounded-full flex items-center transition-colors cursor-pointer
                ${form.isAnchor ? 'bg-amber-500' : 'bg-[#2A2A3C]'}`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform mx-0.5
                  ${form.isAnchor ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
            <span className="text-sm font-mono text-zinc-300 flex items-center gap-1.5">
              <Anchor className="w-3.5 h-3.5 text-amber-400" />
              Designate as Anchor Judge (tie-breaker)
            </span>
          </label>

          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/30 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              {formSuccess}
            </div>
          )}

          <div>
            <Button
              id="create-judge-btn"
              type="submit"
              variant="primary"
              size="sm"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Judge Account'}
            </Button>
          </div>
        </form>
      </div>

      {/* ── JUDGE ROSTER ─────────────────────────────────────────────────────── */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-display font-bold text-white uppercase tracking-wide">
              JUDGE ROSTER
            </h2>
            <span className="text-xs font-mono text-zinc-400">
              ({activeJudges.length} active / {judges.length} total)
            </span>
          </div>
          <button
            id="refresh-judges-btn"
            onClick={loadJudges}
            disabled={judgesLoading}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
            title="Refresh judges"
          >
            <RefreshCw className={`w-4 h-4 ${judgesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {judgesError && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/30 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            {judgesError}
          </div>
        )}

        {judgesLoading && !judgesError && (
          <div className="text-center py-8 text-zinc-500 font-mono text-xs animate-pulse">
            Loading judges...
          </div>
        )}

        {!judgesLoading && judges.length === 0 && !judgesError && (
          <div className="text-center py-8 text-zinc-500 font-mono text-xs">
            No judges added yet. Use the form above to add panelists.
          </div>
        )}

        {judges.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...activeJudges, ...inactiveJudges].map((judge) => (
              <div
                key={judge.id}
                className={`p-5 border space-y-3 font-mono text-xs transition-opacity
                  ${judge.isActive
                    ? 'bg-[#0A0A14] border-[#1E1E2C]'
                    : 'bg-[#0A0A12] border-[#18181E] opacity-60'
                  }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1C1C2A]">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="font-bold text-white uppercase tracking-wide">{judge.code}</span>
                    {judge.isAnchor && (
                      <span title="Anchor Judge" className="text-amber-300">
                        <Anchor className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  {judge.isActive ? (
                    <Badge variant="gold">● ACTIVE</Badge>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">INACTIVE</span>
                  )}
                </div>

                {/* Details */}
                <div>
                  <span className="text-sm font-bold text-white block">{judge.name}</span>
                  <span className="text-zinc-500 text-[11px] block truncate">{judge.email || '—'}</span>
                  {judge.isAnchor && (
                    <span className="text-amber-400/70 text-[10px] block mt-0.5">Anchor / Tie-breaker</span>
                  )}
                </div>

                {/* Toggle Active Button */}
                <div className="pt-2 border-t border-[#181826]">
                  <button
                    id={`judge-toggle-${judge.id}`}
                    onClick={() => handleToggleActive(judge)}
                    disabled={togglingId === judge.id}
                    className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors
                      disabled:opacity-40 cursor-pointer
                      ${judge.isActive
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                  >
                    {togglingId === judge.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : judge.isActive ? (
                      <PowerOff className="w-3.5 h-3.5" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    {togglingId === judge.id
                      ? 'Updating...'
                      : judge.isActive
                      ? 'Deactivate'
                      : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SCORE SUBMISSION MATRIX ───────────────────────────────────────────── */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
          <h2 className="text-base font-display font-bold text-white uppercase tracking-wide">
            SCORE SUBMISSION MATRIX
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-zinc-400">
              ✓ Submitted &nbsp;—&nbsp; — Pending
            </span>
            <button
              id="refresh-matrix-btn"
              onClick={loadMatrix}
              disabled={matrixLoading}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
              title="Refresh matrix"
            >
              <RefreshCw className={`w-4 h-4 ${matrixLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {matrixLoading && (
          <div className="text-center py-6 text-zinc-500 font-mono text-xs animate-pulse">
            Loading score matrix...
          </div>
        )}

        {!matrixLoading && activeJudges.length === 0 && (
          <div className="text-center py-6 text-zinc-500 font-mono text-xs">
            No active judges on the panel yet.
          </div>
        )}

        {!matrixLoading && matrixActs.length === 0 && activeJudges.length > 0 && (
          <div className="text-center py-6 text-zinc-500 font-mono text-xs">
            No approved acts in the running order yet.
          </div>
        )}

        {!matrixLoading && activeJudges.length > 0 && matrixActs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-center font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-[#141420] border-b border-[#27273C] text-zinc-400 uppercase">
                  <th className="p-3 text-left">JUDGE</th>
                  {matrixActs.map((act) => (
                    <th key={act.id} className="p-3 whitespace-nowrap">
                      ACT #{act.slotNumber.toString().padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C2A]">
                {activeJudges.map((judge) => (
                  <tr key={judge.id} className="hover:bg-[#141420]/50 transition-colors">
                    <td className="p-3.5 text-left whitespace-nowrap">
                      <span className="font-bold text-white">{judge.code}</span>
                      <span className="text-zinc-500 ml-1.5">— {judge.name}</span>
                    </td>
                    {matrixActs.map((act) => {
                      // Check by judgeId and judge code for compatibility
                      const submitted =
                        matrix[judge.id]?.[act.id] ??
                        matrix[judge.code]?.[act.id] ??
                        false;
                      return (
                        <td key={act.id} className="p-3.5">
                          {submitted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>SUBMITTED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500">
                              <Minus className="w-3.5 h-3.5" />
                              <span>PENDING</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
