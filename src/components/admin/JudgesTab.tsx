import React, { useState, useEffect } from 'react';
import { MOCK_JUDGES, MOCK_ACTS } from '../../data/eventData';
import { getJudgeMatrix } from '../../services/adminService';
import { Badge } from '../ui/Badge';
import { Award, CheckCircle2, Minus } from 'lucide-react';

export const JudgesTab: React.FC = () => {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    let isMounted = true;
    getJudgeMatrix().then((m) => {
      if (isMounted) setMatrix(m);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <Badge variant="gold">JUDGE MONITORING</Badge>
        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight mt-1">
          JUDGES PANEL & SUBMISSION MATRIX
        </h1>
        <p className="text-xs font-mono text-zinc-400">
          Monitor live judge connectivity and verify score slate submissions for each performance slot.
        </p>
      </div>

      {/* JUDGES CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MOCK_JUDGES.map((j) => (
          <div key={j.id} className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white uppercase">{j.code}</span>
              </div>
              <Badge variant="gold">● ONLINE</Badge>
            </div>

            <div>
              <span className="text-sm font-bold text-white block">{j.name}</span>
              <span className="text-zinc-400 text-[11px] block">{j.title}</span>
            </div>

            <div className="pt-2 border-t border-[#181826] text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Score Slate Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* JUDGE SUBMISSION MATRIX TABLE */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
          <h3 className="text-lg font-display font-bold text-white uppercase">
            STAGE SUBMISSION MATRIX
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            ✓ = Slate Submitted | — = Pending Submission
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-[#141420] border-b border-[#27273C] text-zinc-400 uppercase">
                <th className="p-3 text-left">JUDGE PANEL MEMBER</th>
                {MOCK_ACTS.map((act) => (
                  <th key={act.id} className="p-3">
                    ACT #{act.slotNumber.toString().padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C2A]">
              {MOCK_JUDGES.map((j) => (
                <tr key={j.id} className="hover:bg-[#141420]/50 transition-colors">
                  <td className="p-3.5 text-left font-bold text-white">
                    {j.code} — {j.name}
                  </td>
                  {MOCK_ACTS.map((act) => {
                    const hasSubmitted = matrix[j.id]?.[act.id] ?? false;
                    return (
                      <td key={act.id} className="p-3.5">
                        {hasSubmitted ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>SUBMITTED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-zinc-500">
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
      </div>
    </div>
  );
};
