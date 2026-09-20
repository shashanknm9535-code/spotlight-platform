import { supabase, isSupabaseEnabled, logSupabaseError } from '../lib/supabase/client';
import type { VolunteerIdentity, VolunteerCreationResult, EntryScanResult, EntryStats } from '../types';

// Mock storage for local developer testing when VITE_USE_SUPABASE=false
let MOCK_ENTRY_SCANNING_OPEN = true;
const MOCK_ENTERED_TICKETS = new Set<string>();
const MOCK_VOLUNTEERS: VolunteerIdentity[] = [
  {
    id: 'vol-01',
    code: 'VOL-01',
    name: 'Alex Rivera',
    email: 'alex.vol@student.edu',
    phone: '+91 98765 11111',
    isActive: true,
    scansCount: 42,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vol-02',
    code: 'VOL-02',
    name: 'Priya Sharma',
    email: 'priya.vol@student.edu',
    phone: '+91 98765 22222',
    isActive: true,
    scansCount: 28,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Triggers atomic entry scanning RPC record_ticket_entry(p_ticket_code).
 */
export const recordTicketEntry = async (ticketCode: string): Promise<EntryScanResult> => {
  const normalized = ticketCode.trim().toUpperCase();
  if (!normalized) {
    return {
      success: false,
      resultCode: 'INVALID_TICKET',
      message: 'No ticket pass code provided.',
    };
  }

  if (!isSupabaseEnabled || !supabase) {
    if (!MOCK_ENTRY_SCANNING_OPEN) {
      return {
        success: false,
        resultCode: 'ENTRY_CLOSED',
        message: 'Venue entry scanning is currently CLOSED by event administration.',
      };
    }

    if (!normalized.startsWith('SPT-TKT-')) {
      return {
        success: false,
        resultCode: 'INVALID_TICKET',
        message: 'Ticket pass not found in event registry.',
      };
    }

    if (MOCK_ENTERED_TICKETS.has(normalized)) {
      return {
        success: false,
        resultCode: 'ALREADY_ENTERED',
        message: 'Attendee has ALREADY ENTERED the venue.',
        firstScannedAt: new Date(Date.now() - 15 * 60000).toISOString(),
        scannedBy: 'Alex Rivera (VOL-01)',
        attendeeName: 'Mock Attendee',
        ticketCode: normalized,
      };
    }

    MOCK_ENTERED_TICKETS.add(normalized);
    return {
      success: true,
      resultCode: 'VALID_ENTRY',
      message: 'ENTRY GRANTED',
      attendeeName: 'Mock Spotlight Attendee',
      ticketCode: normalized,
      scannedAt: new Date().toISOString(),
    };
  }

  try {
    const { data, error } = await (supabase as any).rpc('record_ticket_entry', {
      p_ticket_code: normalized,
    });

    if (error || !data) {
      logSupabaseError('VolunteerService', 'recordTicketEntry', error);
      return {
        success: false,
        resultCode: 'SCANNER_ERROR',
        message: error?.hint || error?.message || 'Entry scanning error. Please try again.',
      };
    }

    return {
      success: data.success === true,
      resultCode: data.result_code || (data.success ? 'VALID_ENTRY' : 'SCANNER_ERROR'),
      message: data.message || 'Scan completed.',
      attendeeName: data.attendee_name,
      ticketCode: data.ticket_code,
      scannedAt: data.scanned_at,
      firstScannedAt: data.first_scanned_at,
      scannedBy: data.scanned_by,
    };
  } catch (err: any) {
    logSupabaseError('VolunteerService', 'recordTicketEntry', err);
    return {
      success: false,
      resultCode: 'SCANNER_ERROR',
      message: err?.message || 'Scanner execution error.',
    };
  }
};

/**
 * Fetch volunteer roster for Admin Control Center.
 */
export const getVolunteers = async (): Promise<VolunteerIdentity[]> => {
  if (!isSupabaseEnabled || !supabase) {
    return MOCK_VOLUNTEERS;
  }

  try {
    const { data, error } = await (supabase as any).rpc('admin_get_volunteers');
    if (error || !data) {
      logSupabaseError('VolunteerService', 'getVolunteers', error);
      return [];
    }

    return (data as any[]).map((v) => ({
      id: v.id,
      code: v.volunteerCode,
      name: v.name,
      email: v.email,
      phone: v.phone || undefined,
      isActive: v.isActive,
      scansCount: v.scansCount || 0,
      createdAt: v.createdAt,
    }));
  } catch (err) {
    logSupabaseError('VolunteerService', 'getVolunteers', err);
    return [];
  }
};

/**
 * Invoke create_volunteer Edge Function to safely create a new volunteer.
 */
export const createVolunteer = async (
  name: string,
  email: string,
  phone?: string
): Promise<VolunteerCreationResult> => {
  if (!name.trim() || !email.trim()) {
    return {
      success: false,
      alreadyExists: false,
      volunteer: { id: '', name: '', email: '', code: '', isActive: false, authLinked: false },
      message: 'Name and email are required.',
    };
  }

  if (!isSupabaseEnabled || !supabase) {
    const volId = `vol-${Date.now()}`;
    const volCode = `VOL-0${MOCK_VOLUNTEERS.length + 1}`;
    const newVol: VolunteerIdentity = {
      id: volId,
      code: volCode,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      isActive: true,
      scansCount: 0,
      createdAt: new Date().toISOString(),
    };
    MOCK_VOLUNTEERS.push(newVol);

    return {
      success: true,
      alreadyExists: false,
      volunteer: {
        id: volId,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim(),
        code: volCode,
        isActive: true,
        authLinked: false, // Mock: pending Google sign-in
      },
      message: `Mock volunteer created. ${name.trim()} would need to sign in with Google using ${email.trim()} to activate scanner access.`,
    };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke('create_volunteer', {
      body: { name: name.trim(), email: email.trim(), phone: phone?.trim() },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (error || !data) {
      logSupabaseError('VolunteerService', 'createVolunteer', error);
      return {
        success: false,
        alreadyExists: false,
        volunteer: { id: '', name: '', email: '', code: '', isActive: false, authLinked: false },
        message: error?.message || 'Failed to create volunteer account.',
      };
    }

    return {
      success: data.success === true,
      alreadyExists: data.alreadyExists === true,
      volunteer: data.volunteer,
      message: data.message || 'Volunteer action complete.',
    };
  } catch (err: any) {
    logSupabaseError('VolunteerService', 'createVolunteer', err);
    return {
      success: false,
      alreadyExists: false,
      volunteer: { id: '', name: '', email: '', code: '', isActive: false, authLinked: false },
      message: err?.message || 'Edge function execution error.',
    };
  }
};

/**
 * Toggle active status for a volunteer.
 */
export const toggleVolunteerActive = async (
  volunteerId: string,
  isActive: boolean
): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) {
    const v = MOCK_VOLUNTEERS.find((x) => x.id === volunteerId);
    if (v) v.isActive = isActive;
    return true;
  }

  try {
    const { error } = await (supabase as any)
      .from('volunteers')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', volunteerId);

    if (error) {
      logSupabaseError('VolunteerService', 'toggleVolunteerActive', error);
      return false;
    }
    return true;
  } catch (err) {
    logSupabaseError('VolunteerService', 'toggleVolunteerActive', err);
    return false;
  }
};

/**
 * Retrieve entry stats & recent scans for Admin Control Center.
 */
export const getEntryStats = async (): Promise<EntryStats> => {
  if (!isSupabaseEnabled || !supabase) {
    return {
      totalEntries: MOCK_ENTERED_TICKETS.size,
      totalPaidTickets: 643,
      scanningOpen: MOCK_ENTRY_SCANNING_OPEN,
      recentEntries: Array.from(MOCK_ENTERED_TICKETS).map((code, idx) => ({
        id: `entry-${idx}`,
        ticketCode: code,
        attendeeName: 'Mock Attendee',
        volunteerName: 'Alex Rivera (VOL-01)',
        scannedAt: new Date(Date.now() - idx * 2 * 60000).toISOString(),
      })),
    };
  }

  try {
    const { data, error } = await (supabase as any).rpc('admin_get_entry_stats');
    if (error || !data) {
      logSupabaseError('VolunteerService', 'getEntryStats', error);
      return { totalEntries: 0, totalPaidTickets: 0, scanningOpen: false, recentEntries: [] };
    }

    return {
      totalEntries: data.totalEntries || 0,
      totalPaidTickets: data.totalPaidTickets || 0,
      scanningOpen: data.scanningOpen === true,
      recentEntries: (data.recentEntries || []).map((r: any) => ({
        id: r.id,
        ticketCode: r.ticketCode,
        attendeeName: r.attendeeName,
        volunteerName: r.volunteerName,
        scannedAt: r.scannedAt,
      })),
    };
  } catch (err) {
    logSupabaseError('VolunteerService', 'getEntryStats', err);
    return { totalEntries: 0, totalPaidTickets: 0, scanningOpen: false, recentEntries: [] };
  }
};

/**
 * Admin toggle for entry scanning gate (OPEN / CLOSED).
 */
export const toggleEntryScanning = async (open: boolean): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) {
    MOCK_ENTRY_SCANNING_OPEN = open;
    return true;
  }

  try {
    const { data: latestEvent } = await (supabase as any)
      .from('events')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { id: string } | null };

    if (!latestEvent?.id) return false;

    const { error } = await (supabase as any)
      .from('events')
      .update({ entry_scanning_open: open, updated_at: new Date().toISOString() })
      .eq('id', latestEvent.id);

    if (error) {
      logSupabaseError('VolunteerService', 'toggleEntryScanning', error);
      return false;
    }
    return true;
  } catch (err) {
    logSupabaseError('VolunteerService', 'toggleEntryScanning', err);
    return false;
  }
};
