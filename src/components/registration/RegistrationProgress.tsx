import React from 'react';
import { Check } from 'lucide-react';

export interface RegistrationProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  onStepClick?: (step: number) => void;
}

export const RegistrationProgress: React.FC<RegistrationProgressProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  onStepClick,
}) => {
  return (
    <div className="w-full mb-10 md:mb-14">
      {/* Mobile Step Header */}
      <div className="flex md:hidden items-center justify-between mb-4 px-2">
        <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
          STEP {currentStep.toString().padStart(2, '0')} OF {totalSteps.toString().padStart(2, '0')}
        </span>
        <span className="text-sm font-display font-bold text-white uppercase">
          {stepTitles[currentStep - 1]}
        </span>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full bg-[#161622] h-1.5 mb-6 relative overflow-hidden border border-[#27273C]">
        <div
          className="bg-amber-400 h-full transition-all duration-500 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Desktop Step Items */}
      <div className="hidden md:grid grid-cols-5 gap-2 text-center">
        {stepTitles.map((title, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isClickable = stepNumber < currentStep && onStepClick;

          return (
            <button
              key={stepNumber}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(stepNumber)}
              className={`p-3 border transition-all duration-200 text-left flex flex-col justify-between ${
                isCurrent
                  ? 'bg-[#141420] border-amber-400 text-white shadow-[0_0_20px_rgba(250,204,21,0.15)]'
                  : isCompleted
                  ? 'bg-[#0E0E16] border-[#2E2E44] text-zinc-300 hover:border-amber-400/50 cursor-pointer'
                  : 'bg-[#08080C] border-[#1C1C2A] text-zinc-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-mono font-bold ${
                    isCurrent ? 'text-amber-400' : isCompleted ? 'text-amber-400/80' : 'text-zinc-400'
                  }`}
                >
                  0{stepNumber}
                </span>
                {isCompleted && (
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <span className="text-xs font-display font-bold uppercase tracking-wider line-clamp-1">
                {title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
