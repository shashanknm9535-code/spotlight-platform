import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserTicket, sendTicketEmail, getEmailDeliveryStatus, type EmailDeliveryStatus } from '../services/ticketService';
import type { Ticket as TicketType } from '../types';
import { TicketCard } from '../components/ticketing/TicketCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Ticket, LogOut, ShieldCheck, Mail, Calendar, Key, CheckCircle, Loader2, Sparkles, Send, CheckCircle2 } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { user, profile, isLoading, signOut, isAdmin, judge } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [userTicket, setUserTicket] = useState<TicketType | null>(null);
  const [ticketLoading, setTicketLoading] = useState<boolean>(true);
  const [emailSending, setEmailSending] = useState<boolean>(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [emailDelivery, setEmailDelivery] = useState<EmailDeliveryStatus | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setTicketLoading(false);
      return;
    }

    let isMounted = true;
    getUserTicket(user.id).then((ticket) => {
      if (isMounted) {
        setUserTicket(ticket);
        setTicketLoading(false);
        if (ticket?.id) {
          getEmailDeliveryStatus(ticket.id).then((status) => {
            if (isMounted) setEmailDelivery(status);
          });
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);


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

  const handleResendEmail = async () => {
    if (!userTicket?.id) return;
    setEmailSending(true);
    setResendMessage(null);
    try {
      const res = await sendTicketEmail(userTicket.id, true);
      setResendMessage(res.message || (res.success ? 'Ticket pass emailed!' : 'Email delivery failed.'));
      const updatedStatus = await getEmailDeliveryStatus(userTicket.id);
      setEmailDelivery(updatedStatus);
    } catch (err) {
      setResendMessage('Failed to send email pass.');
    } finally {
      setEmailSending(false);
    }
  };

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

        {/* MY SPOTLIGHT TICKET SECTION */}
        <div className="bg-[#12121A] border border-[#27273A] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-4">
            <div className="flex items-center space-x-3">
              <Ticket className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-display font-bold text-white uppercase tracking-wide">
                MY SPOTLIGHT TICKET
              </h2>
            </div>
            {userTicket && (
              <Badge variant="gold" icon={<Sparkles className="w-3 h-3 text-amber-400" />}>
                VALID PASS
              </Badge>
            )}
          </div>

          {ticketLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin mr-2" />
              <span className="text-xs font-mono text-zinc-400">Loading ticket status...</span>
            </div>
          ) : userTicket ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono bg-[#181824] p-4 border border-[#222232]">
                <div>
                  <span className="block text-zinc-500">TICKET CODE</span>
                  <span className="text-white font-bold">{userTicket.id}</span>
                </div>
                <div>
                  <span className="block text-zinc-500">PRICE</span>
                  <span className="text-amber-400 font-bold">₹10</span>
                </div>
                <div>
                  <span className="block text-zinc-500">STATUS</span>
                  <span className="text-emerald-400 font-bold">{userTicket.status}</span>
                </div>
              </div>

              {/* EMAIL DELIVERY STATUS & RESEND ACTION */}
              <div className="p-4 bg-[#181824] border border-[#222232] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-zinc-400 block uppercase text-[10px]">EMAIL DELIVERY</span>
                    <span className="text-white font-semibold">
                      {emailDelivery?.delivered
                        ? `Delivered to ${emailDelivery.recipientEmail || displayEmail}`
                        : emailDelivery?.status === 'FAILED'
                        ? 'Email delivery failed'
                        : `Ready to send to ${displayEmail}`}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleResendEmail}
                  disabled={emailSending}
                  variant="outline"
                  size="sm"
                  icon={emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                >
                  {emailSending ? 'Sending...' : 'Email Pass'}
                </Button>
              </div>

              {resendMessage && (
                <p className="text-xs font-mono text-amber-400 text-center animate-in fade-in">
                  {resendMessage}
                </p>
              )}

              {/* Reused TicketCard Component for presentation */}
              <TicketCard ticket={userTicket} ticketIndex={1} totalTickets={1} />
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-[#181824] border border-[#222232] space-y-4">
              <p className="text-sm font-sans text-zinc-300">
                You don't have a Spotlight audience ticket yet.
              </p>
              <Button href="/ticket" variant="primary" size="md" icon={<Ticket className="w-4 h-4" />}>
                Get Your ₹10 Ticket
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

