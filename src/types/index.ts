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
