import React from 'react';
import type { AdminTab } from '../../types';
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  Ticket,
  Radio,
  Award,
  BarChart2,
  Tv,
  Shield,
} from 'lucide-react';

export interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

const NAV_ITEMS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'registrations', label: 'Registrations', icon: <Users className="w-4 h-4" /> },
  { id: 'running-order', label: 'Running Order', icon: <ListOrdered className="w-4 h-4" /> },
  { id: 'tickets', label: 'Tickets', icon: <Ticket className="w-4 h-4" /> },
  { id: 'live', label: 'Live Event', icon: <Radio className="w-4 h-4" /> },
  { id: 'judges', label: 'Judges', icon: <Award className="w-4 h-4" /> },
  { id: 'results', label: 'Results', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'stage', label: 'Stage Display', icon: <Tv className="w-4 h-4" /> },
];


export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  mobileMenuOpen,
  onCloseMobileMenu,
}) => {
  const content = (
    <div className="flex flex-col justify-between h-full py-6 px-4 font-mono text-xs">
      <div className="space-y-6">
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-3 block">
          ADMIN NAVIGATION
        </span>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobileMenu();
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 border transition-all text-left uppercase tracking-wider font-semibold ${
                  isActive
                    ? 'bg-amber-400 text-black border-amber-400 font-bold shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                    : 'bg-transparent text-zinc-400 border-transparent hover:bg-[#141420] hover:text-white hover:border-[#27273C]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-[#1E1E2C] space-y-2">
        <div className="p-3 bg-[#12121A] border border-[#27273A] flex items-center space-x-2">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="truncate">
            <span className="text-white font-bold block truncate">Admin Organizer</span>
            <span className="text-[10px] text-zinc-500 block">ADMIN-2026</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:block w-64 bg-[#08080C] border-r border-[#1E1E2C] shrink-0 min-h-[calc(100vh-65px)]">
        {content}
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-[#08080C]/98 backdrop-blur-xl z-50 border-t border-[#1E1E2C] animate-in fade-in duration-200">
          {content}
        </div>
      )}
    </>
  );
};
