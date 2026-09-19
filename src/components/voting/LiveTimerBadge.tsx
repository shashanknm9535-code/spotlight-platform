import React, { useState, useEffect } from 'react';
import { Clock, Radio } from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface LiveTimerBadgeProps {
  initialSeconds?: number;
  onTimerExpire?: () => void;
  isOpen: boolean;
}

export const LiveTimerBadge: React.FC<LiveTimerBadgeProps> = ({
  initialSeconds = 45,
  onTimerExpire,
  isOpen,
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isOpen || seconds <= 0) return;
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimerExpire) onTimerExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, seconds, onTimerExpire]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="p-4 bg-[#141420] border border-[#27273C] flex items-center justify-between font-mono text-xs">
      <div className="flex items-center space-x-2">
        <Radio className={`w-4 h-4 ${isOpen && seconds > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`} />
        <span className="font-bold text-white uppercase">
          {isOpen && seconds > 0 ? 'VOTING OPEN' : 'VOTING CLOSED'}
        </span>
      </div>

      <div className="flex items-center space-x-2 text-amber-400">
        <Clock className="w-4 h-4" />
        <span className="font-mono font-bold text-base tracking-wider text-amber-400">
          {isOpen && seconds > 0 ? formatTimer(seconds) : '00:00'}
        </span>
      </div>
    </div>
  );
};
