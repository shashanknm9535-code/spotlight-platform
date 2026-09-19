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
