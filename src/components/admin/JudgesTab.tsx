import React, { useState, useEffect, useCallback } from 'react';
import {
  getJudgeMatrix,
  getJudges,
  createJudge,
  setJudgeActive,
  getRunningOrder,
} from '../../services/adminService';
import {
  getJudgeAssignments,
  createJudgeAssignment,
  updateJudgeAssignment,
  deleteJudgeAssignment,
} from '../../services/judgeAssignmentService';
import type { JudgeDetail, JudgeAssignment, JudgeCreationResult } from '../../types';
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
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Copy,
  X,
  ChevronDown,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
};

const toLocalDatetime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateJudgeForm {
  name: string;
  email: string;
  isAnchor: boolean;
}

interface AssignmentForm {
  judgeId: string;
  startTime: string;
  endTime: string;
  roleOverride: 'ANCHOR' | 'PANEL' | '';
  notes: string;
}

const EMPTY_JUDGE_FORM: CreateJudgeForm = { name: '', email: '', isAnchor: false };
const EMPTY_ASSIGN_FORM: AssignmentForm = {
  judgeId: '',
  startTime: '',
  endTime: '',
  roleOverride: '',
  notes: '',
};

// ─── Creation success banner ──────────────────────────────────────────────────

const JudgeCreatedBanner: React.FC<{
  result: JudgeCreationResult;
  onDismiss: () => void;
}> = ({ result, onDismiss }) => {
  const [copied, setCopied] = useState(false);
  const loginText = result.tempPassword
    ? `Judge: ${result.judge.name}\nCode: ${result.judge.code}\nEmail: ${result.judge.email}\nTemp Password: ${result.tempPassword}`
    : `Judge: ${result.judge.name}\nCode: ${result.judge.code}\nEmail: ${result.judge.email}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(loginText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-5 bg-emerald-950/40 border border-emerald-500/40 space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wide">
          <CheckCircle2 className="w-4 h-4" />
          {result.alreadyExists ? 'JUDGE ALREADY EXISTS' : 'JUDGE CREATED'}
        </div>
        <button onClick={onDismiss} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-zinc-300">
        <span className="text-zinc-500">Name</span>
        <span className="text-white font-bold">{result.judge.name}</span>
        <span className="text-zinc-500">Code</span>
        <span className="text-amber-400 font-bold">{result.judge.code}</span>
        <span className="text-zinc-500">Email</span>
        <span>{result.judge.email}</span>
        {result.tempPassword && (
          <>
            <span className="text-zinc-500">Temp Password</span>
            <span className="text-amber-300 font-bold tracking-wider">{result.tempPassword}</span>
          </>
        )}
        <span className="text-zinc-500">Auth Linked</span>
        <span className={result.judge.authLinked ? 'text-emerald-400' : 'text-zinc-500'}>
          {result.judge.authLinked ? '✓ Yes' : '— No'}
        </span>
      </div>

      {result.tempPassword && (
        <p className="text-amber-400/80 text-[10px] leading-relaxed">
          ⚠ Copy and share these credentials now. The password will not be shown again.
        </p>
      )}

      <button
        id="copy-judge-credentials-btn"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide
                   text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500
                   px-3 py-1.5 transition-colors"
      >
        <Copy className="w-3 h-3" />
        {copied ? 'Copied!' : 'Copy Login Details'}
      </button>
    </div>
  );
};

// ─── Assignment Form ──────────────────────────────────────────────────────────

const AssignmentFormPanel: React.FC<{
  judges: JudgeDetail[];
  initial?: AssignmentForm & { id?: string };
  onSave: (form: AssignmentForm) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}> = ({ judges, initial, onSave, onCancel, isSaving }) => {
  const [form, setForm] = useState<AssignmentForm>(
    initial
      ? {
          judgeId: initial.judgeId,
          startTime: initial.startTime,
          endTime: initial.endTime,
          roleOverride: initial.roleOverride,
          notes: initial.notes,
        }
      : EMPTY_ASSIGN_FORM
  );
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.judgeId) { setErr('Select a judge.'); return; }
    if (!form.startTime) { setErr('Start time is required.'); return; }
    if (!form.endTime) { setErr('End time is required.'); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setErr('End time must be after start time.');
      return;
    }
    try {
      await onSave(form);
    } catch (ex: any) {
      setErr(ex?.message || 'Failed to save assignment.');
    }
  };

  const activeJudges = judges.filter((j) => j.isActive);

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-[#0A0A14] border border-amber-400/30 space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#1C1C2A]">
        <span className="text-amber-400 font-bold uppercase text-[11px] tracking-wide">
          {initial?.id ? 'EDIT ASSIGNMENT' : 'NEW ASSIGNMENT'}
        </span>
        <button type="button" onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Judge */}
        <div>
          <label className="block text-zinc-400 uppercase mb-1">Judge *</label>
          <div className="relative">
            <select
              value={form.judgeId}
              onChange={(e) => setForm((f) => ({ ...f, judgeId: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[#141420] border border-[#2A2A3C] text-white text-xs font-mono
                         appearance-none focus:outline-none focus:border-amber-400/60 transition-colors"
              disabled={isSaving}
            >
              <option value="">— select judge —</option>
              {activeJudges.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.code} — {j.name}{j.isAnchor ? ' (Anchor)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Role Override */}
        <div>
          <label className="block text-zinc-400 uppercase mb-1">Role Override</label>
          <div className="relative">
            <select
              value={form.roleOverride}
              onChange={(e) =>
                setForm((f) => ({ ...f, roleOverride: e.target.value as AssignmentForm['roleOverride'] }))
              }
              className="w-full px-3 py-2.5 bg-[#141420] border border-[#2A2A3C] text-white text-xs font-mono
                         appearance-none focus:outline-none focus:border-amber-400/60 transition-colors"
              disabled={isSaving}
            >
              <option value="">— use judge default —</option>
              <option value="ANCHOR">Anchor Judge</option>
              <option value="PANEL">Panel Judge</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-zinc-400 uppercase mb-1">Start Time *</label>
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="w-full px-3 py-2.5 bg-[#141420] border border-[#2A2A3C] text-white text-xs font-mono
                       focus:outline-none focus:border-amber-400/60 transition-colors"
            disabled={isSaving}
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-zinc-400 uppercase mb-1">End Time *</label>
          <input
            type="datetime-local"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            className="w-full px-3 py-2.5 bg-[#141420] border border-[#2A2A3C] text-white text-xs font-mono
                       focus:outline-none focus:border-amber-400/60 transition-colors"
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-zinc-400 uppercase mb-1">Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Optional organisational note..."
          className="w-full px-3 py-2.5 bg-[#141420] border border-[#2A2A3C] text-white text-xs font-mono
                     focus:outline-none focus:border-amber-400/60 transition-colors placeholder:text-zinc-600"
          disabled={isSaving}
        />
      </div>

      {err && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/30 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {err}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving...' : initial?.id ? 'Save Changes' : 'Add Assignment'}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const JudgesTab: React.FC = () => {
  // ── Judge roster ──────────────────────────────────────────────────────────
  const [judges, setJudges] = useState<JudgeDetail[]>([]);
  const [judgesLoading, setJudgesLoading] = useState(true);
  const [judgesError, setJudgesError] = useState<string | null>(null);

  // ── Submission matrix ─────────────────────────────────────────────────────
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [matrixActs, setMatrixActs] = useState<{ id: string; slotNumber: number }[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(true);

  // ── Create-judge form ─────────────────────────────────────────────────────
  const [form, setForm] = useState<CreateJudgeForm>(EMPTY_JUDGE_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<JudgeCreationResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // ── Toggle active ─────────────────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Assignments ───────────────────────────────────────────────────────────
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<(AssignmentForm & { id: string }) | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load judges ───────────────────────────────────────────────────────────
  const loadJudges = useCallback(async () => {
    setJudgesLoading(true);
    setJudgesError(null);
    try {
      setJudges(await getJudges());
    } catch {
      setJudgesError('Failed to load judges. Please refresh.');
    } finally {
      setJudgesLoading(false);
    }
  }, []);

  // ── Load matrix ───────────────────────────────────────────────────────────
  const loadMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const [m, acts] = await Promise.all([getJudgeMatrix(), getRunningOrder()]);
      setMatrix(m);
      setMatrixActs(acts.map((a) => ({ id: a.id, slotNumber: a.slotNumber })));
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  // ── Load assignments ──────────────────────────────────────────────────────
  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    try {
      setAssignments(await getJudgeAssignments());
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJudges();
    loadMatrix();
    loadAssignments();
  }, [loadJudges, loadMatrix, loadAssignments]);

  // ── Create judge ──────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreationResult(null);

    if (!form.name.trim()) { setFormError('Judge full name is required.'); return; }
    if (!form.email.trim() || !form.email.includes('@')) {
      setFormError('A valid email address is required.'); return;
    }

    setIsCreating(true);
    try {
      const result = await createJudge(form.name.trim(), form.email.trim(), form.isAnchor);
      setCreationResult(result);
      setForm(EMPTY_JUDGE_FORM);
      await loadJudges();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create judge.');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggleActive = async (judge: JudgeDetail) => {
    setTogglingId(judge.id);
    try {
      const ok = await setJudgeActive(judge.id, !judge.isActive);
      if (ok) setJudges((prev) => prev.map((j) => j.id === judge.id ? { ...j, isActive: !j.isActive } : j));
    } finally {
      setTogglingId(null);
    }
  };

  // ── Create assignment ─────────────────────────────────────────────────────
  const handleSaveAssignment = async (formData: AssignmentForm) => {
    setSavingAssign(true);
    try {
      if (editingAssignment?.id) {
        const updated = await updateJudgeAssignment(editingAssignment.id, {
          judgeId: formData.judgeId,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          roleOverride: formData.roleOverride || null,
          notes: formData.notes || null,
        });
        setAssignments((prev) => prev.map((a) => a.id === updated.id ? updated : a));
        setEditingAssignment(null);
      } else {
        const created = await createJudgeAssignment({
          judgeId: formData.judgeId,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          roleOverride: formData.roleOverride || null,
          notes: formData.notes || null,
        });
        setAssignments((prev) => [...prev, created].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ));
        setShowAssignForm(false);
      }
    } finally {
      setSavingAssign(false);
    }
  };

  // ── Delete assignment ─────────────────────────────────────────────────────
  const handleDeleteAssignment = async (id: string) => {
    setDeletingId(id);
    try {
      const ok = await deleteJudgeAssignment(id);
      if (ok) setAssignments((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const activeJudges = judges.filter((j) => j.isActive);
  const inactiveJudges = judges.filter((j) => !j.isActive);

  // Group assignments by time-slot bucket (start+end pair)
  const assignmentGroups = assignments.reduce<Map<string, JudgeAssignment[]>>((acc, a) => {
    const key = `${a.startTime}__${a.endTime}`;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(a);
    return acc;
  }, new Map());

  return (
    <div className="space-y-10 animate-in fade-in duration-300">

      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <div>
        <Badge variant="gold">JUDGE MANAGEMENT</Badge>
        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-1">
          JUDGES PANEL &amp; SCORE MATRIX
        </h1>
        <p className="text-xs font-mono text-zinc-400 mt-1">
          Create judge accounts, manage panel membership, set schedules, and monitor live score submissions.
        </p>
      </div>

      {/* ── CREATE JUDGE FORM ─────────────────────────────────────────────── */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1C1C2A]">
          <UserPlus className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-display font-bold text-white uppercase tracking-wide">
            ADD JUDGE TO PANEL
          </h2>
        </div>

        {creationResult && (
          <JudgeCreatedBanner result={creationResult} onDismiss={() => setCreationResult(null)} />
        )}

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

          <Button id="create-judge-btn" type="submit" variant="primary" size="sm" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Judge Account'}
          </Button>
        </form>
      </div>

      {/* ── JUDGE ROSTER ─────────────────────────────────────────────────── */}
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
          <div className="text-center py-8 text-zinc-500 font-mono text-xs animate-pulse">Loading judges...</div>
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
                  ${judge.isActive ? 'bg-[#0A0A14] border-[#1E1E2C]' : 'bg-[#0A0A12] border-[#18181E] opacity-60'}`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1C1C2A]">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="font-bold text-white uppercase tracking-wide">{judge.code}</span>
                    {judge.isAnchor && <span title="Anchor Judge"><Anchor className="w-3 h-3 text-amber-300" /></span>}
                  </div>
                  {judge.isActive
                    ? <Badge variant="gold">● ACTIVE</Badge>
                    : <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">INACTIVE</span>
                  }
                </div>

                <div>
                  <span className="text-sm font-bold text-white block">{judge.name}</span>
                  <span className="text-zinc-500 text-[11px] block truncate">{judge.email || '—'}</span>
                  {judge.isAnchor && <span className="text-amber-400/70 text-[10px] block mt-0.5">Anchor / Tie-breaker</span>}
                  {judge.authUserId && <span className="text-emerald-400/60 text-[10px] block">✓ Auth linked</span>}
                </div>

                <div className="pt-2 border-t border-[#181826]">
                  <button
                    id={`judge-toggle-${judge.id}`}
                    onClick={() => handleToggleActive(judge)}
                    disabled={togglingId === judge.id}
                    className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide
                      transition-colors disabled:opacity-40 cursor-pointer
                      ${judge.isActive ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                  >
                    {togglingId === judge.id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : judge.isActive
                      ? <PowerOff className="w-3.5 h-3.5" />
                      : <Power className="w-3.5 h-3.5" />
                    }
                    {togglingId === judge.id ? 'Updating...' : judge.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── JUDGE SCHEDULE ───────────────────────────────────────────────── */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-display font-bold text-white uppercase tracking-wide">
              JUDGE SCHEDULE
            </h2>
            <span className="text-xs font-mono text-zinc-400">
              (organisational — does not control login access)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="refresh-assignments-btn"
              onClick={loadAssignments}
              disabled={assignmentsLoading}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${assignmentsLoading ? 'animate-spin' : ''}`} />
            </button>
            {!showAssignForm && !editingAssignment && (
              <button
                id="add-assignment-btn"
                onClick={() => setShowAssignForm(true)}
                disabled={activeJudges.length === 0}
                className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wide
                           text-amber-400 hover:text-amber-300 border border-amber-400/40 hover:border-amber-400/70
                           px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={activeJudges.length === 0 ? 'Add active judges first' : 'Add assignment'}
              >
                <Plus className="w-3.5 h-3.5" />
                ADD ASSIGNMENT
              </button>
            )}
          </div>
        </div>

        {/* New assignment form */}
        {showAssignForm && (
          <AssignmentFormPanel
            judges={judges}
            onSave={handleSaveAssignment}
            onCancel={() => setShowAssignForm(false)}
            isSaving={savingAssign}
          />
        )}

        {assignmentsLoading && (
          <div className="text-center py-6 text-zinc-500 font-mono text-xs animate-pulse">Loading schedule...</div>
        )}

        {!assignmentsLoading && assignments.length === 0 && !showAssignForm && (
          <div className="text-center py-8 text-zinc-500 font-mono text-xs">
            No assignments yet. Click + ADD ASSIGNMENT to schedule judges.
          </div>
        )}

        {/* Assignment groups */}
        {!assignmentsLoading && assignments.length > 0 && (
          <div className="space-y-6">
            {Array.from(assignmentGroups.entries()).map(([key, groupAssignments]) => {
              const [startTime, endTime] = key.split('__');
              const anchors = groupAssignments.filter(
                (a) => (a.roleOverride ?? (a.judgeIsAnchor ? 'ANCHOR' : 'PANEL')) === 'ANCHOR'
              );
              const panel = groupAssignments.filter(
                (a) => (a.roleOverride ?? (a.judgeIsAnchor ? 'ANCHOR' : 'PANEL')) !== 'ANCHOR'
              );

              return (
                <div key={key} className="border border-[#1C1C2A] bg-[#0A0A14]">
                  {/* Time slot header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1C1C2A] bg-[#111120]">
                    <Clock className="w-3.5 h-3.5 text-amber-400/70" />
                    <span className="text-sm font-mono font-bold text-white">
                      {fmt(startTime)} — {fmt(endTime)}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {anchors.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-2">ANCHOR</p>
                        <div className="space-y-2">
                          {anchors.map((a) => (
                            <AssignmentRow
                              key={a.id}
                              assignment={a}
                              isEditing={editingAssignment?.id === a.id}
                              isSaving={savingAssign}
                              isDeleting={deletingId === a.id}
                              judges={judges}
                              onEdit={() =>
                                setEditingAssignment({
                                  id: a.id,
                                  judgeId: a.judgeId,
                                  startTime: toLocalDatetime(a.startTime),
                                  endTime: toLocalDatetime(a.endTime),
                                  roleOverride: (a.roleOverride as AssignmentForm['roleOverride']) ?? '',
                                  notes: a.notes ?? '',
                                })
                              }
                              onCancelEdit={() => setEditingAssignment(null)}
                              onSave={handleSaveAssignment}
                              onDelete={() => handleDeleteAssignment(a.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {panel.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">PANEL</p>
                        <div className="space-y-2">
                          {panel.map((a) => (
                            <AssignmentRow
                              key={a.id}
                              assignment={a}
                              isEditing={editingAssignment?.id === a.id}
                              isSaving={savingAssign}
                              isDeleting={deletingId === a.id}
                              judges={judges}
                              onEdit={() =>
                                setEditingAssignment({
                                  id: a.id,
                                  judgeId: a.judgeId,
                                  startTime: toLocalDatetime(a.startTime),
                                  endTime: toLocalDatetime(a.endTime),
                                  roleOverride: (a.roleOverride as AssignmentForm['roleOverride']) ?? '',
                                  notes: a.notes ?? '',
                                })
                              }
                              onCancelEdit={() => setEditingAssignment(null)}
                              onSave={handleSaveAssignment}
                              onDelete={() => handleDeleteAssignment(a.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SCORE SUBMISSION MATRIX ──────────────────────────────────────── */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
          <h2 className="text-base font-display font-bold text-white uppercase tracking-wide">
            SCORE SUBMISSION MATRIX
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-zinc-400">✓ Submitted &nbsp;—&nbsp; — Pending</span>
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
          <div className="text-center py-6 text-zinc-500 font-mono text-xs animate-pulse">Loading score matrix...</div>
        )}

        {!matrixLoading && activeJudges.length === 0 && (
          <div className="text-center py-6 text-zinc-500 font-mono text-xs">No active judges on the panel yet.</div>
        )}

        {!matrixLoading && matrixActs.length === 0 && activeJudges.length > 0 && (
          <div className="text-center py-6 text-zinc-500 font-mono text-xs">No approved acts in the running order yet.</div>
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
                      const submitted = matrix[judge.id]?.[act.id] ?? matrix[judge.code]?.[act.id] ?? false;
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

// ─── Assignment Row sub-component ─────────────────────────────────────────────

const AssignmentRow: React.FC<{
  assignment: JudgeAssignment;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  judges: JudgeDetail[];
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (form: AssignmentForm) => Promise<void>;
  onDelete: () => void;
}> = ({ assignment, isEditing, isSaving, isDeleting, judges, onEdit, onCancelEdit, onSave, onDelete }) => {
  const displayCode = assignment.judgeCode ?? '—';
  const displayName = assignment.judgeName ?? 'Unknown';
  const displayNotes = assignment.notes;

  if (isEditing) {
    return (
      <AssignmentFormPanel
        judges={judges}
        initial={{
          id: assignment.id,
          judgeId: assignment.judgeId,
          startTime: toLocalDatetime(assignment.startTime),
          endTime: toLocalDatetime(assignment.endTime),
          roleOverride: (assignment.roleOverride as AssignmentForm['roleOverride']) ?? '',
          notes: assignment.notes ?? '',
        }}
        onSave={onSave}
        onCancel={onCancelEdit}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-[#0E0E18] border border-[#1E1E2C] font-mono text-xs group">
      <div className="flex items-center gap-3">
        <Award className="w-3.5 h-3.5 text-amber-400/60 flex-shrink-0" />
        <span>
          <span className="text-white font-bold">{displayCode}</span>
          <span className="text-zinc-400 ml-1.5">— {displayName}</span>
        </span>
        {displayNotes && (
          <span className="text-zinc-600 text-[10px] hidden sm:inline">· {displayNotes}</span>
        )}
      </div>
      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          id={`edit-assign-${assignment.id}`}
          onClick={onEdit}
          className="flex items-center gap-1 text-zinc-400 hover:text-amber-400 transition-colors text-[10px] font-bold uppercase"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          id={`delete-assign-${assignment.id}`}
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-1 text-zinc-400 hover:text-red-400 transition-colors text-[10px] font-bold uppercase disabled:opacity-40"
        >
          {isDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};
