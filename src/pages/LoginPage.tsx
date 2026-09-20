import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Shield, Sparkles, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // If already authenticated, redirect to /account immediately
  if (!isLoading && user) {
    return <Navigate to="/account" replace />;
  }

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSigningIn(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg(error);
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 bg-[#08080C] relative overflow-hidden">
      {/* Background ambiance glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#12121A]/90 backdrop-blur-xl border border-[#27273A] p-8 sm:p-10 shadow-2xl">
        {/* Header Badge */}
        <div className="flex justify-center mb-6">
          <Badge variant="gold" icon={<Sparkles className="w-3 h-3 text-amber-400" />}>
            SPOTLIGHT IDENTITY
          </Badge>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-wider uppercase text-white mb-3">
            SIGN IN TO <span className="text-amber-400">SPOTLIGHT</span>
          </h1>
          <p className="text-sm font-sans text-zinc-400 leading-relaxed">
            One unified account for your tickets, performance registrations, and event participation.
          </p>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/60 border border-red-800/80 text-red-200 text-xs font-mono flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn || isLoading}
          className="w-full py-4 px-6 bg-white hover:bg-zinc-100 text-zinc-900 font-sans font-bold text-sm tracking-wide transition-all flex items-center justify-center space-x-3 border border-zinc-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {isSigningIn ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              {/* Official Google G Logo */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-semibold text-zinc-900">Continue with Google</span>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Informational Subtext */}
        <p className="mt-4 text-[11px] font-mono text-zinc-500 text-center">
          Secure OAuth 2.0 authentication via Supabase Auth
        </p>

        {/* Divider */}
        <div className="my-8 flex items-center justify-between">
          <div className="h-px bg-[#27273A] flex-grow" />
          <span className="px-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            STAFF & OFFICIALS
          </span>
          <div className="h-px bg-[#27273A] flex-grow" />
        </div>

        {/* Shortcuts for Admin & Judge */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <a
            href="/admin"
            className="p-3 bg-[#181824] border border-[#2A2A3D] text-zinc-300 hover:text-amber-400 hover:border-amber-400/40 transition-colors flex items-center justify-center space-x-2"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Portal</span>
          </a>
          <a
            href="/judge"
            className="p-3 bg-[#181824] border border-[#2A2A3D] text-zinc-300 hover:text-amber-400 hover:border-amber-400/40 transition-colors flex items-center justify-center space-x-2"
          >
            <span>⚖️ Judge Portal</span>
          </a>
        </div>
      </div>
    </div>
  );
};
