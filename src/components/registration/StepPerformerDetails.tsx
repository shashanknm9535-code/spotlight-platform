import React from 'react';
import type { ActCategory, TeamMember } from '../../types';
import { DEPARTMENT_OPTIONS, YEAR_OPTIONS } from '../../data/eventData';
import { User, Users, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface StepPerformerDetailsProps {
  category: ActCategory;
  name: string;
  department: string;
  year: string;
  phone: string;
  email: string;
  teamMembers: TeamMember[];
  errors: Record<string, string>;
  onChangeField: (field: string, value: string) => void;
  onAddTeamMember: () => void;
  onRemoveTeamMember: (id: string) => void;
  onUpdateTeamMember: (id: string, field: keyof TeamMember, value: string) => void;
}

export const StepPerformerDetails: React.FC<StepPerformerDetailsProps> = ({
  category,
  name,
  department,
  year,
  phone,
  email,
  teamMembers,
  errors,
  onChangeField,
  onAddTeamMember,
  onRemoveTeamMember,
  onUpdateTeamMember,
}) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="text-center max-w-xl mx-auto">
        <Badge variant="gold">STEP 02</Badge>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase tracking-tight mt-3 mb-2">
          {category === 'group' ? 'LEAD PERFORMER & TEAM ROSTER' : 'PERFORMER DETAILS'}
        </h2>
        <p className="text-sm text-zinc-400 font-sans">
          Provide primary contact details for communication, scheduling, and stage access credentials.
        </p>
      </div>

      {/* LEAD PERFORMER FORM CARD */}
      <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-[#1C1C2A]">
          <div className="w-8 h-8 bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-white uppercase">
              {category === 'group' ? 'LEAD PERFORMER (PRIMARY CONTACT)' : 'PERFORMER INFORMATION'}
            </h3>
            <span className="text-xs font-mono text-zinc-400">Official Campus Registration Data</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FULL NAME */}
          <div className="md:col-span-2">
            <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
              Full Name <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onChangeField('name', e.target.value)}
              placeholder="e.g. Alex Rivera"
              className={`w-full px-4 py-3 bg-[#141420] border text-white font-sans text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                errors.name ? 'border-red-500' : 'border-[#27273C]'
              }`}
            />
            {errors.name && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.name}</p>}
          </div>

          {/* DEPARTMENT */}
          <div>
            <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
              Department <span className="text-amber-400">*</span>
            </label>
            <select
              value={department}
              onChange={(e) => onChangeField('department', e.target.value)}
              className={`w-full px-4 py-3 bg-[#141420] border text-white font-sans text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                errors.department ? 'border-red-500' : 'border-[#27273C]'
              }`}
            >
              <option value="">Select Department...</option>
              {DEPARTMENT_OPTIONS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {errors.department && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.department}</p>}
          </div>

          {/* YEAR */}
          <div>
            <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
              Academic Year <span className="text-amber-400">*</span>
            </label>
            <select
              value={year}
              onChange={(e) => onChangeField('year', e.target.value)}
              className={`w-full px-4 py-3 bg-[#141420] border text-white font-sans text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                errors.year ? 'border-red-500' : 'border-[#27273C]'
              }`}
            >
              <option value="">Select Year...</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {errors.year && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.year}</p>}
          </div>

          {/* PHONE */}
          <div>
            <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
              Phone Number <span className="text-amber-400">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => onChangeField('phone', e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className={`w-full px-4 py-3 bg-[#141420] border text-white font-sans text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                errors.phone ? 'border-red-500' : 'border-[#27273C]'
              }`}
            />
            {errors.phone && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.phone}</p>}
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
              Email Address <span className="text-amber-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => onChangeField('email', e.target.value)}
              placeholder="alex.rivera@college.edu"
              className={`w-full px-4 py-3 bg-[#141420] border text-white font-sans text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                errors.email ? 'border-red-500' : 'border-[#27273C]'
              }`}
            />
            {errors.email && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.email}</p>}
          </div>
        </div>
      </div>

      {/* DYNAMIC TEAM MEMBERS SECTION FOR GROUP CATEGORY */}
      {category === 'group' && (
        <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1C1C2A] gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white uppercase">
                  TEAM MEMBERS ROSTER
                </h3>
                <span className="text-xs font-mono text-zinc-400">
                  Add all co-performers sharing the stage (Max 11 additional)
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={onAddTeamMember}
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              Add Team Member
            </Button>
          </div>

          {errors.teamMembers && (
            <p className="text-xs text-red-400 font-mono p-3 bg-red-500/10 border border-red-500/30">
              ⚠️ {errors.teamMembers}
            </p>
          )}

          {teamMembers.length === 0 ? (
            <div className="p-8 border border-dashed border-[#27273C] text-center text-zinc-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm font-sans">No team members added yet.</p>
              <p className="text-xs font-mono text-zinc-600">
                Group entries require at least 1 additional team member. Click "+ Add Team Member" above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member, idx) => (
                <div
                  key={member.id}
                  className="p-5 bg-[#141420] border border-[#27273C] space-y-4 hover:border-amber-400/40 transition-colors relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                      MEMBER 0{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveTeamMember(member.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1 p-1 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono font-bold text-zinc-400 uppercase mb-1">
                        Member Name *
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => onUpdateTeamMember(member.id, 'name', e.target.value)}
                        placeholder="Member Full Name"
                        className="w-full px-3 py-2 bg-[#0C0C14] border border-[#27273C] text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold text-zinc-400 uppercase mb-1">
                        Department *
                      </label>
                      <select
                        value={member.department}
                        onChange={(e) => onUpdateTeamMember(member.id, 'department', e.target.value)}
                        className="w-full px-3 py-2 bg-[#0C0C14] border border-[#27273C] text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                      >
                        <option value="">Department...</option>
                        {DEPARTMENT_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold text-zinc-400 uppercase mb-1">
                        Academic Year *
                      </label>
                      <select
                        value={member.year}
                        onChange={(e) => onUpdateTeamMember(member.id, 'year', e.target.value)}
                        className="w-full px-3 py-2 bg-[#0C0C14] border border-[#27273C] text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                      >
                        <option value="">Year...</option>
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
