import React from 'react';
import { Badge } from '../ui/Badge';
import { Shield, LogOut, Radio, Menu, X } from 'lucide-react';

export interface AdminHeaderProps {
  onLogout: () => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onLogout,
  mobileMenuOpen,
  onToggleMobileMenu,
}) => {
  return (
    <header className="bg-[#08080C] border-b border-[#1E1E2C] sticky top-0 z-40 py-3.5 px-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 text-zinc-400 hover:text-white md:hidden bg-[#141420] border border-[#27273C]"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-8 h-8 bg-amber-400 text-black flex items-center justify-center font-black font-display text-lg">
            S
          </div>

          <div>
            <span className="font-display font-black text-lg text-white uppercase tracking-wider block leading-none">
              SPOTLIGHT CONTROL CENTER
            </span>
            <span className="text-[10px] font-mono text-amber-400">
              OPERATIONAL ADMIN DASHBOARD
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <Badge variant="gold">EVENT LIVE</Badge>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-xs font-mono text-zinc-400 hover:text-white bg-[#141420] border border-[#27273C] flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
