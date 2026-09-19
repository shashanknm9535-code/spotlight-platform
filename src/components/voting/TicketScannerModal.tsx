import React from 'react';
import { Camera, X, Sparkles, Scan } from 'lucide-react';
import { Button } from '../ui/Button';

export interface TicketScannerModalProps {
  onSimulateScan: () => void;
  onClose: () => void;
}

export const TicketScannerModal: React.FC<TicketScannerModalProps> = ({
  onSimulateScan,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#08080C]/95 backdrop-blur-md flex flex-col items-center justify-between p-6 animate-in fade-in duration-200">
      {/* SCANNER HEADER */}
      <div className="w-full max-w-md flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">
            SPOTLIGHT TICKET SCANNER
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* CAMERA VIEWFINDER FRAME */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-auto">
        {/* Animated laser line */}
        <div className="absolute inset-x-4 top-4 h-0.5 bg-amber-400 shadow-[0_0_15px_#FACC15] animate-bounce" />

        {/* Viewfinder corner brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400" />

        {/* Center Target Icon */}
        <div className="text-amber-400/40 animate-pulse">
          <Scan className="w-24 h-24 stroke-[1]" />
        </div>
      </div>

      {/* SCANNER FOOTER & ACTION */}
      <div className="w-full max-w-md text-center space-y-4 pb-4">
        <div>
          <h3 className="text-lg font-display font-bold text-white uppercase mb-1">
            SCAN YOUR TICKET
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Place your Spotlight Audience Pass QR inside the frame.
          </p>
        </div>

        <Button
          type="button"
          onClick={onSimulateScan}
          variant="primary"
          size="lg"
          fullWidth
          icon={<Sparkles className="w-4 h-4" />}
        >
          Simulate Scan (Use Ticket SPT-TKT-2026-0001)
        </Button>

        <span className="text-[10px] font-mono text-zinc-500 block">
          Simulated camera viewfinder • No hardware permissions required
        </span>
      </div>
    </div>
  );
};
