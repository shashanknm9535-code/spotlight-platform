export interface EventStat {
  id: string;
  value: string;
  label: string;
  description?: string;
  highlight?: boolean;
}

export interface ParticipantType {
  id: string;
  role: 'PERFORMERS' | 'AUDIENCE' | 'JUDGES' | 'ORGANIZERS';
  title: string;
  tagline: string;
  description: string;
  iconName: string;
  highlights: string[];
}

export interface StepFlow {
  stepNumber: string;
  title: string;
  subtitle: string;
  description: string;
  actionText?: string;
}

export interface RubricItem {
  name: string;
  maxPoints: number;
  weight: string;
  description: string;
}

export interface ScoringSystem {
  judgesWeight: number;
  audienceWeight: number;
  rubric: RubricItem[];
  audienceRange: string;
}

export interface CompetitionTrack {
  id: 'solo' | 'group';
  badge: string;
  title: string;
  tagline: string;
  description: string;
  performerLimit: string;
  stageTime: string;
  highlights: string[];
  ctaText: string;
  ctaHref: string;
}

export interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
  isCTA?: boolean;
  ctaVariant?: 'primary' | 'secondary';
}

/* Phase 2: Performer Registration Types */
export type ActCategory = 'solo' | 'group';

export interface TeamMember {
  id: string;
  name: string;
  department: string;
  year: string;
}

export interface RegistrationFormData {
  category: ActCategory | null;
  name: string;
  department: string;
  year: string;
  phone: string;
  email: string;
  performanceType: string;
  otherPerformanceType?: string;
  blurb: string;
  photo: File | null;
  photoPreview: string | null;
  selfRating: number;
  teamMembers: TeamMember[];
  isConfirmed: boolean;
}

export interface RegistrationResult {
  actId: string;
  submittedAt: string;
  status: 'PENDING REVIEW';
  formData: RegistrationFormData;
}

/* Phase 3: Audience Ticketing Types */
export type TicketStatus = 'CONFIRMED' | 'PENDING' | 'FAILED';

export interface Ticket {
  id: string;
  qrValue: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  status: TicketStatus;
  createdAt: string;
  userId?: string;
  eventId?: string;
}

export interface TicketOrder {
  id: string;
  paymentId: string;
  tickets: Ticket[];
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: TicketStatus;
  createdAt: string;
}

export interface BuyerDetails {
  name: string;
  email: string;
  phone: string;
  quantity: number;
}

/* Phase 4: Live Audience Voting Types */
export type VotingState =
  | 'ticket_required'
  | 'scanning'
  | 'validating'
  | 'ticket_invalid'
  | 'waiting'
  | 'voting_open'
  | 'submitting'
  | 'voted'
  | 'already_voted'
  | 'voting_closed';

export interface Act {
  id: string;
  actCode?: string;
  slotNumber: number;
  category: 'solo' | 'group';
  title: string;
  performerName: string;
  department: string;
  year: string;
  performanceType: string;
  blurb: string;
  photoUrl: string;
}

export interface VoteRecord {
  ticketId: string;
  actId: string;
  rating: number;
  timestamp: string;
}

/* Phase 5: Judge Judging Types */
export type JudgingState =
  | 'access'
  | 'loading'
  | 'scoring'
  | 'review'
  | 'submitting'
  | 'locked'
  | 'already_scored';

export interface JudgeIdentity {
  id: string;
  code: string;
  name: string;
  title: string;
  role: string;
  email?: string;
  isAnchor?: boolean;
  isActive?: boolean;
}

export interface JudgeDetail {
  id: string;
  name: string;
  email: string;
  code: string;
  isAnchor: boolean;
  isActive: boolean;
  authUserId?: string | null;
  createdAt?: string;
}

export interface JudgeAssignment {
  id: string;
  eventId: string;
  judgeId: string;
  judgeName?: string;
  judgeCode?: string;
  judgeIsAnchor?: boolean;
  startTime: string;
  endTime: string;
  roleOverride?: 'ANCHOR' | 'PANEL' | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Result returned by the create_judge Edge Function.
 * tempPassword is only present on first creation and MUST be copied immediately.
 */
export interface JudgeCreationResult {
  success: boolean;
  alreadyExists: boolean;
  judge: {
    id: string;
    name: string;
    email: string;
    code: string;
    isAnchor: boolean;
    isActive: boolean;
    authLinked: boolean;
    createdAt?: string;
  };
  /** Present only on first creation. null on subsequent calls or alreadyExists=true. */
  tempPassword: string | null;
  authCreated: boolean;
  message: string;
}


export interface JudgeScore {
  id: string;
  judgeId: string;
  actId: string;
  creativity: number;
  execution: number;
  stagePresence: number;
  audienceEngagement: number;
  total: number;
  notes?: string;
  submitted: boolean;
  createdAt: string;
}

/* Phase 6: Admin Dashboard Types */
export type AdminTab =
  | 'overview'
  | 'registrations'
  | 'running-order'
  | 'tickets'
  | 'live'
  | 'judges'
  | 'results'
  | 'stage';

export type RegistrationStatus = 'pending' | 'confirmed' | 'rejected';

export interface AdminRegistration {
  id: string;
  actId: string;
  performerName: string;
  category: 'solo' | 'group';
  performanceType: string;
  department: string;
  year: string;
  phone: string;
  email: string;
  blurb: string;
  photoUrl: string;
  selfRating: number;
  teamMembers: TeamMember[];
  status: RegistrationStatus;
  submittedAt: string;
}

export interface LiveEventState {
  eventStatus: 'scheduled' | 'live' | 'paused' | 'ended';
  currentActId: string;
  votingOpen: boolean;
  votingTimeRemaining: number;
  totalVotesReceived: number;
}

export interface AdminTicketOrder {
  id: string;
  paymentId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  quantity: number;
  totalAmount: number;
  status: 'CONFIRMED';
  createdAt: string;
  tickets?: string[];
}

export interface OverviewStats {
  totalPerformers: number;
  confirmedPerformers: number;
  pendingPerformers: number;
  ticketsSold: number;
  totalCapacity: number;
  activeJudges: number;
  totalJudges: number;
  totalRegistrations?: number;
  confirmedRegistrations?: number;
  pendingRegistrations?: number;
  rejectedRegistrations?: number;
  ticketCapacity?: number;
  ticketsRevenue?: number;
  activeJudgesCount?: number;
  totalJudgesCount?: number;
}

/* Phase 7: Score Aggregation Engine + Live Leaderboard Types */

export type TiebreakerReason = 'audience_score' | 'anchor_judge' | 'manual_review' | null;

export interface JudgeScoreBreakdown {
  judgeId: string;
  judgeName: string;
  creativity: number;
  execution: number;
  stagePresence: number;
  audienceEngagement: number;
  total: number;
}

export interface ActResult {
  actId: string;
  actTitle: string;
  performerName: string;
  category: 'solo' | 'group';
  performanceType: string;
  photoUrl: string;
  selfRating: number;
  selfRatingGap: number;
  // Raw inputs
  judgeBreakdowns: JudgeScoreBreakdown[];
  audienceVotes: number[];
  // Calculated
  panelScore: number;        // avg of submitted judge totals → /10
  audienceScore: number;     // avg of audience votes → /10
  finalScore: number;        // panelScore*0.6 + audienceScore*0.4
  judgesSubmitted: number;
  totalAudienceVotes: number;
  // Ranking
  rank: number;
  tiebreakerUsed: TiebreakerReason;
  isManualReview: boolean;
}

export interface LeaderboardState {
  soloResults: ActResult[];
  groupResults: ActResult[];
  lastCalculatedAt: string;
  isLive: boolean;
}

/* Unified Spotlight Identity (Phase 1) */
export interface UserProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

