import React from 'react';
import type { RegistrationFormData } from '../../types';
import { SELF_RATING_QUALIFIERS } from '../../data/eventData';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Edit3, CheckCircle2, User, Users, Music2, Camera, Star, ArrowRight, ShieldCheck } from 'lucide-react';

export interface RegistrationReviewProps {
  formData: RegistrationFormData;
  isSubmitting: boolean;
  onEditStep: (step: number) => void;
  onToggleConfirm: (confirmed: boolean) => void;
  onSubmit: () => void;
  error?: string;
}

export const RegistrationReview: React.FC<RegistrationReviewProps> = ({
  formData,
  isSubmitting,
  onEditStep,
  onToggleConfirm,
  onSubmit,
  error,
}) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="text-center max-w-xl mx-auto">
        <Badge variant="gold">STEP 05</Badge>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase tracking-tight mt-3 mb-2">
          CHECK YOUR REGISTRATION
        </h2>
        <p className="text-sm text-zinc-400 font-sans">
          Review all your submission details before locking in your act for the auditorium stage slate.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono text-center">
          ⚠️ {error}
        </div>
      )}

      {/* REVIEW CARDS GRID */}
      <div className="space-y-6">
        {/* 1. ACT CATEGORY */}
        <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-[#161622] border border-[#27273C] flex items-center justify-center text-amber-400">
              {formData.category === 'group' ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs font-mono text-zinc-400 uppercase block">ACT CATEGORY</span>
              <span className="text-xl font-display font-bold text-white uppercase">
                {formData.category === 'group' ? 'GROUP ACT' : 'SOLO ACT'}
              </span>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onEditStep(1)} icon={<Edit3 className="w-3.5 h-3.5" />}>
            Edit
          </Button>
        </div>

        {/* 2. LEAD PERFORMER & TEAM */}
        <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase">
              PERFORMER & ROSTER DETAILS
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => onEditStep(2)} icon={<Edit3 className="w-3.5 h-3.5" />}>
              Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono text-zinc-300">
            <div>
              <span className="text-zinc-500 block">LEAD PERFORMER</span>
              <span className="font-bold text-white text-sm">{formData.name}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">DEPARTMENT</span>
              <span className="font-bold text-white">{formData.department}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">YEAR</span>
              <span className="font-bold text-white">{formData.year}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">PHONE & EMAIL</span>
              <span className="font-bold text-white block truncate">{formData.phone}</span>
              <span className="text-zinc-400 block truncate">{formData.email}</span>
            </div>
          </div>

          {/* IF GROUP, SHOW TEAM MEMBERS LIST */}
          {formData.category === 'group' && (
            <div className="pt-4 border-t border-[#1C1C2A] space-y-2">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase block">
                TEAM MEMBERS ({formData.teamMembers.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {formData.teamMembers.map((m, idx) => (
                  <div key={m.id} className="p-2.5 bg-[#141420] border border-[#27273C] text-xs font-mono flex items-center justify-between">
                    <span className="text-zinc-300">
                      <strong className="text-amber-400">0{idx + 1}.</strong> {m.name}
                    </span>
                    <span className="text-zinc-500 text-[11px]">{m.department} ({m.year})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. PERFORMANCE DETAILS */}
        <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C2A]">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase">
              PERFORMANCE CATEGORY & DESCRIPTION
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => onEditStep(3)} icon={<Edit3 className="w-3.5 h-3.5" />}>
              Edit
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-mono text-zinc-500 uppercase block">GENRE / TYPE</span>
              <span className="text-base font-display font-bold text-white uppercase">
                {formData.performanceType === 'Other'
                  ? `OTHER: ${formData.otherPerformanceType}`
                  : formData.performanceType}
              </span>
            </div>

            <div>
              <span className="text-xs font-mono text-zinc-500 uppercase block mb-1">ACT BIO / DESCRIPTION</span>
              <p className="p-4 bg-[#141420] border border-[#27273C] text-sm text-zinc-300 font-sans leading-relaxed">
                "{formData.blurb}"
              </p>
            </div>
          </div>
        </div>

        {/* 4. PHOTO & SELF-RATING */}
        <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-[#141420] border border-amber-400 overflow-hidden shrink-0">
              {formData.photoPreview ? (
                <img src={formData.photoPreview} alt="Stage Headshot" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Camera className="w-8 h-8" />
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-mono text-zinc-400 uppercase block">SELF-RATING</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-display font-black text-amber-400">
                  {formData.selfRating} / 10
                </span>
                <span className="text-xs font-mono text-white font-bold uppercase">
                  ({SELF_RATING_QUALIFIERS[formData.selfRating]})
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Stage photo ready
              </span>
            </div>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => onEditStep(4)} icon={<Edit3 className="w-3.5 h-3.5" />}>
            Edit
          </Button>
        </div>
      </div>

      {/* CONFIRMATION CHECKBOX */}
      <div className="p-6 bg-[#0E0E16] border border-[#1E1E2C] space-y-4">
        <label className="flex items-start space-x-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={formData.isConfirmed}
            onChange={(e) => onToggleConfirm(e.target.checked)}
            className="mt-1 w-4 h-4 accent-amber-400 bg-[#141420] border-[#27273C] cursor-pointer"
          />
          <span className="text-sm text-zinc-300 font-sans leading-relaxed">
            I confirm that the information provided above is accurate and I agree to adhere to the Spotlight live auditorium stage guidelines.
          </span>
        </label>

        {/* SUBMIT BUTTON */}
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!formData.isConfirmed || isSubmitting}
          variant="primary"
          size="lg"
          fullWidth
          icon={
            isSubmitting ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )
          }
        >
          {isSubmitting ? 'SUBMITTING REGISTRATION...' : 'SUBMIT REGISTRATION'}
        </Button>
      </div>
    </div>
  );
};
