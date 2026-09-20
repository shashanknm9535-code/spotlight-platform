import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { User, LogOut, ShieldCheck, Mail, Calendar, Key, CheckCircle, Loader2 } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { user, profile, isLoading, signOut, isAdmin, judge } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  // If loading, show styled spinner
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#08080C]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-xs font-mono text-zinc-400">VERIFYING SPOTLIGHT IDENTITY...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated users are redirected to /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  const displayName = profile?.fullName || user.user_metadata?.full_name || user.user_metadata?.name || 'Spotlight User';
  const displayEmail = profile?.email || user.email || 'No email provided';
  const avatarUrl = profile?.avatarUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const createdAt = profile?.createdAt || user.created_at;

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Session';

  return (
    <div className="min-h-[85vh] bg-[#08080C] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1E1E2C]">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Badge variant="gold" icon={<ShieldCheck className="w-3 h-3 text-amber-400" />}>
                VERIFIED IDENTITY
              </Badge>
              {isAdmin && <Badge variant="outline">ADMIN ACCESS</Badge>}
              {judge && <Badge variant="gold">JUDGE PANEL</Badge>}
            </div>
            <h1 className="text-3xl font-display font-black tracking-wider text-white uppercase">
              YOUR SPOTLIGHT <span className="text-amber-400">ACCOUNT</span>
            </h1>
            <p className="text-sm font-sans text-zinc-400 mt-1">
              Unified Google identity for Spotlight Live 2026.
            </p>
          </div>

          <Button
            onClick={handleSignOut}
            disabled={isSigningOut}
            variant="secondary"
            size="md"
            icon={<LogOut className="w-4 h-4 text-red-400" />}
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </div>

        {/* Profile Card */}
        <div className="bg-[#12121A] border border-[#27273A] p-6 sm:p-8 space-y-8 shadow-2xl">
          {/* Avatar & Primary Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-20 h-20 rounded-full border-2 border-amber-400/80 object-cover shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-amber-400/10 border-2 border-amber-400 text-amber-400 flex items-center justify-center font-display font-black text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wide">
                {displayName}
              </h2>
              <div className="flex items-center space-x-2 text-sm font-sans text-zinc-300 mt-1">
                <Mail className="w-4 h-4 text-zinc-500" />
                <span>{displayEmail}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 mt-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Google OAuth Verified</span>
              </div>
            </div>
          </div>

          {/* Identity Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[#1E1E2C]">
            <div className="p-4 bg-[#181824] border border-[#222232] space-y-1">
              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 uppercase">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Account Created</span>
              </div>
              <p className="text-sm font-sans text-white font-medium">{formattedDate}</p>
            </div>

            <div className="p-4 bg-[#181824] border border-[#222232] space-y-1">
              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 uppercase">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Spotlight Identity ID</span>
              </div>
              <p className="text-xs font-mono text-zinc-300 truncate" title={user.id}>
                {user.id}
              </p>
            </div>
          </div>

          {/* Privileged Portals Shortcuts */}
          {(isAdmin || judge) && (
            <div className="pt-6 border-t border-[#1E1E2C] space-y-3">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest block">
                Privileged Access Roles Enabled
              </span>
              <div className="flex flex-wrap gap-3">
                {isAdmin && (
                  <Button href="/admin" variant="primary" size="sm">
                    Open Admin Control Center
                  </Button>
                )}
                {judge && (
                  <Button href="/judge" variant="secondary" size="sm">
                    Open Judge Portal ({judge.code})
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
