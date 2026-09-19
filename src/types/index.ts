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
