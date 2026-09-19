import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface QuantitySelectorProps {
  quantity: number;
  unitPrice?: number;
  min?: number;
  max?: number;
  onChange: (qty: number) => void;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  unitPrice = 10,
  min = 1,
  max = 10,
  onChange,
}) => {
  const handleDecrement = () => {
    if (quantity > min) onChange(quantity - 1);
  };

  const handleIncrement = () => {
    if (quantity < max) onChange(quantity + 1);
  };

  return (
    <div className="p-4 bg-[#141420] border border-[#27273C] flex items-center justify-between">
      <div>
        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-0.5">
          TICKET QUANTITY
        </label>
        <span className="text-xs font-mono text-amber-400">
          ₹{unitPrice} × {quantity} Ticket{quantity > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={quantity <= min}
          className="w-9 h-9 bg-[#1E1E2E] border border-[#33334A] text-white flex items-center justify-center hover:bg-amber-400 hover:text-black hover:border-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease ticket quantity"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="text-2xl font-display font-black text-white w-8 text-center select-none">
          {quantity}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={quantity >= max}
          className="w-9 h-9 bg-[#1E1E2E] border border-[#33334A] text-white flex items-center justify-center hover:bg-amber-400 hover:text-black hover:border-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase ticket quantity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
