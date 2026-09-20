import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Menu, X, Mic2, Ticket, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const userDisplayName = profile?.fullName || user?.user_metadata?.full_name || 'Account';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#08080C]/90 backdrop-blur-md border-b border-[#1E1E2C] py-3.5 shadow-2xl'
          : 'bg-gradient-to-b from-[#08080C]/90 via-[#08080C]/40 to-transparent py-5'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* LEFT: LOGO */}
        <Link
          to="/"
          className="flex items-center space-x-3 group focus:outline-none"
        >
          <div className="w-9 h-9 bg-amber-400 text-black font-black flex items-center justify-center font-display text-xl tracking-tighter group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(250,204,21,0.4)]">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-xl sm:text-2xl tracking-wider text-white group-hover:text-amber-400 transition-colors uppercase">
              SPOTLIGHT
            </span>
            <span className="text-[10px] font-mono tracking-widest text-amber-400/80 uppercase -mt-1">
              LIVE 2026
            </span>
          </div>
        </Link>

        {/* CENTER/RIGHT: DESKTOP NAVIGATION */}
        <nav className="hidden md:flex items-center space-x-8">
          <a
            href="/#about"
            className="text-sm font-sans font-medium text-zinc-300 hover:text-amber-400 transition-colors tracking-wide uppercase"
          >
            About
          </a>
          <a
            href="/#how-it-works"
            className="text-sm font-sans font-medium text-zinc-300 hover:text-amber-400 transition-colors tracking-wide uppercase"
          >
            How It Works
          </a>
          <a
            href="/#scoring"
            className="text-sm font-sans font-medium text-zinc-300 hover:text-amber-400 transition-colors tracking-wide uppercase"
          >
            Scoring
          </a>
          <a
            href="/#tracks"
            className="text-sm font-sans font-medium text-zinc-300 hover:text-amber-400 transition-colors tracking-wide uppercase"
          >
            Tracks
          </a>
        </nav>

        {/* RIGHT: DESKTOP CTAS */}
        <div className="hidden lg:flex items-center space-x-4">
          {user ? (
            <Button href="/account" variant="secondary" size="sm" icon={<User className="w-3.5 h-3.5 text-amber-400" />}>
              {userDisplayName}
            </Button>
          ) : (
            <Button href="/login" variant="secondary" size="sm" icon={<User className="w-3.5 h-3.5 text-amber-400" />}>
              Sign In
            </Button>
          )}
          <Button href="/ticket" variant="secondary" size="sm" icon={<Ticket className="w-3.5 h-3.5 text-amber-400" />}>
            Get Ticket
          </Button>
          <Button href="/register" variant="primary" size="sm" icon={<Mic2 className="w-3.5 h-3.5" />}>
            Register
          </Button>
        </div>

        {/* MOBILE MENU TOGGLE BUTTON */}
        <div className="flex items-center space-x-3 md:hidden">
          {user ? (
            <Link to="/account" className="p-2 bg-[#12121A] border border-amber-400/50 text-amber-400 text-xs font-mono">
              👤
            </Link>
          ) : (
            <Link to="/login" className="p-2 bg-[#12121A] border border-[#27273A] text-zinc-300 text-xs font-mono">
              Sign In
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-300 hover:text-white bg-[#12121A] border border-[#27273A] focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-amber-400" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-[#08080C]/98 backdrop-blur-xl z-40 border-t border-[#1E1E2C] flex flex-col justify-between p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E1E2C]">
              <Badge variant="gold">SPOTLIGHT 2026</Badge>
              <span className="text-xs font-mono text-zinc-400">STAGE READY</span>
            </div>

            <nav className="flex flex-col space-y-4">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-display font-bold text-white hover:text-amber-400 transition-colors uppercase"
              >
                Home
              </Link>
              <Link
                to={user ? "/account" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-display font-bold text-amber-400 transition-colors uppercase flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>{user ? `Account (${userDisplayName})` : "Sign In / Register"}</span>
              </Link>
              <a
                href="/#about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-display font-bold text-zinc-300 hover:text-amber-400 transition-colors uppercase"
              >
                About Spotlight
              </a>
              <a
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-display font-bold text-zinc-300 hover:text-amber-400 transition-colors uppercase"
              >
                How It Works
              </a>
            </nav>

            <div className="pt-4 border-t border-[#1E1E2C] space-y-3">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest block mb-2">
                Module Shortcuts
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <Link to="/vote" className="p-2.5 bg-[#12121A] border border-[#222232] text-zinc-300 hover:text-amber-400">
                  ⚡ Live Voting
                </Link>
                <Link to="/stage" className="p-2.5 bg-[#12121A] border border-[#222232] text-zinc-300 hover:text-amber-400">
                  📺 Stage Display
                </Link>
                <Link to="/judge" className="p-2.5 bg-[#12121A] border border-[#222232] text-zinc-300 hover:text-amber-400">
                  ⚖️ Judge Portal
                </Link>
                <Link to="/admin" className="p-2.5 bg-[#12121A] border border-[#222232] text-zinc-300 hover:text-amber-400">
                  🎛️ Admin Control
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#1E1E2C] space-y-3">
            <Button href="/register" variant="primary" size="lg" fullWidth icon={<Mic2 className="w-4 h-4" />}>
              Register as Performer
            </Button>
            <Button href="/ticket" variant="secondary" size="lg" fullWidth icon={<Ticket className="w-4 h-4 text-amber-400" />}>
              Get Your ₹10 Ticket
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

