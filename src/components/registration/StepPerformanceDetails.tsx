import React from 'react';
import { PERFORMANCE_CATEGORIES } from '../../data/eventData';
import { Badge } from '../ui/Badge';
import { Sparkles, Music2, FileText } from 'lucide-react';

export interface StepPerformanceDetailsProps {
  performanceType: string;
  otherPerformanceType: string;
  blurb: string;
  errors: Record<string, string>;
  onChangeField: (field: string, value: string) => void;
}

export const StepPerformanceDetails: React.FC<StepPerformanceDetailsProps> = ({
  performanceType,
  otherPerformanceType,
  blurb,
  errors,
  onChangeField,
}) => {
  const MAX_BLURB_LENGTH = 300;

  return (
    <div className="space-y-10 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="text-center max-w-xl mx-auto">
        <Badge variant="gold">STEP 03</Badge>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase tracking-tight mt-3 mb-2">
          PERFORMANCE DETAILS
        </h2>
        <p className="text-sm text-zinc-400 font-sans">
          Tell organizers and judges about your performance genre, setup needs, and act description.
        </p>
      </div>

      <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] space-y-8">
        {/* PERFORMANCE TYPE CATEGORY CARDS / SELECTOR */}
        <div>
          <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-[#1C1C2A]">
            <Music2 className="w-5 h-5 text-amber-400" />
            <label className="text-base font-display font-bold text-white uppercase">
              PERFORMANCE CATEGORY <span className="text-amber-400">*</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {PERFORMANCE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onChangeField('performanceType', cat)}
                className={`p-3.5 border text-center font-mono text-xs uppercase tracking-wider transition-all duration-200 ${
                  performanceType === cat
                    ? 'bg-amber-400 text-black font-bold border-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] scale-[1.02]'
                    : 'bg-[#141420] text-zinc-300 border-[#27273C] hover:border-amber-400/50 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {errors.performanceType && (
            <p className="text-xs text-red-400 font-mono mt-1">{errors.performanceType}</p>
          )}

          {/* IF OTHER IS SELECTED */}
          {performanceType === 'Other' && (
            <div className="mt-4 p-4 bg-[#141420] border border-[#27273C] space-y-2 animate-in fade-in duration-200">
              <label className="block text-xs font-mono font-bold text-amber-400 uppercase">
                Specify Custom Category *
              </label>
              <input
                type="text"
                value={otherPerformanceType}
                onChange={(e) => onChangeField('otherPerformanceType', e.target.value)}
                placeholder="e.g. Beatboxing & Live Looping"
                className={`w-full px-4 py-2.5 bg-[#0C0C14] border text-white text-xs font-sans focus:outline-none focus:border-amber-400 ${
                  errors.otherPerformanceType ? 'border-red-500' : 'border-[#27273C]'
                }`}
              />
              {errors.otherPerformanceType && (
                <p className="text-xs text-red-400 font-mono">{errors.otherPerformanceType}</p>
              )}
            </div>
          )}
        </div>

        {/* ACT DESCRIPTION TEXTAREA */}
        <div>
          <div className="flex items-center justify-between mb-2 pb-3 border-b border-[#1C1C2A]">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-amber-400" />
              <label className="text-base font-display font-bold text-white uppercase">
                TELL US ABOUT YOUR ACT <span className="text-amber-400">*</span>
              </label>
            </div>
            <span
              className={`text-xs font-mono font-bold ${
                blurb.length > MAX_BLURB_LENGTH ? 'text-red-400' : 'text-zinc-400'
              }`}
            >
              {blurb.length} / {MAX_BLURB_LENGTH}
            </span>
          </div>

          <p className="text-xs font-sans text-zinc-400 mb-3">
            Give the audience and organizers a quick introduction to your performance style, theme, or musical pieces.
          </p>

          <textarea
            rows={5}
            value={blurb}
            maxLength={MAX_BLURB_LENGTH}
            onChange={(e) => onChangeField('blurb', e.target.value)}
            placeholder="Describe your act in 2-3 sentences. This bio will be used by the event host during stage intro..."
            className={`w-full p-4 bg-[#141420] border text-white font-sans text-sm leading-relaxed focus:outline-none focus:border-amber-400 transition-colors resize-none ${
              errors.blurb ? 'border-red-500' : 'border-[#27273C]'
            }`}
          />
          {errors.blurb && <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.blurb}</p>}
        </div>
      </div>
    </div>
  );
};
