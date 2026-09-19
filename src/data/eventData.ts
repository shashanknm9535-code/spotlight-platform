import type { EventStat, ParticipantType, StepFlow, ScoringSystem, CompetitionTrack, NavItem, Act, JudgeIdentity } from '../types';

export const EVENT_INFO = {
  name: 'SPOTLIGHT',
  edition: '2026 Annual Production',
  tagline: 'A live performance competition where talent meets the spotlight.',
  headline: 'YOUR STAGE. YOUR MOMENT.',
  subheadline: 'Where raw talent meets live audience power. A real-time arena for music, dance, theater, and showmanship.',
  year: '2026',
  ticketPrice: '₹10',
};

export const EVENT_STATS: EventStat[] = [
  {
    id: 'capacity',
    value: '800',
    label: 'Audience Capacity',
    description: 'Packed auditoriums cheering in real-time',
    highlight: true,
  },
  {
    id: 'price',
    value: '₹10',
    label: 'Entry Ticket',
    description: 'Accessible live audience access',
    highlight: false,
  },
  {
    id: 'rating',
    value: '1–10',
    label: 'Live Audience Rating',
    description: 'Instant mobile QR voting per act',
    highlight: false,
  },
  {
    id: 'split',
    value: '60/40',
    label: 'Panel × Audience',
    description: 'Weighted grand leaderboard formula',
    highlight: true,
  },
];

export const PARTICIPANTS_DATA: ParticipantType[] = [
  {
    id: 'performers',
    role: 'PERFORMERS',
    title: 'Performers',
    tagline: 'Step onto the stage and compete.',
    description: 'Showcase your talent in front of a live crowd and an expert judge panel. Claim the stage, feel the lights, and conquer the leaderboard.',
    iconName: 'Mic',
    highlights: ['Solo & Group Tracks', 'Live Backstage Queue', 'Instant Performance Analytics'],
  },
  {
    id: 'audience',
    role: 'AUDIENCE',
    title: 'Audience',
    tagline: 'Watch, rate and influence the results.',
    description: 'Your vote isn’t just hype—it carries a 40% weight in deciding who wins. Scan your ticket QR, vote live, and push your favorites to the top.',
    iconName: 'Users',
    highlights: ['₹10 Access Ticket', 'Instant QR Mobile Voting', 'Real-time Leaderboard Sync'],
  },
  {
    id: 'judges',
    role: 'JUDGES',
    title: 'Judges',
    tagline: 'Evaluate performances using a structured rubric.',
    description: 'A distinguished panel of mentors and industry veterans scoring execution, creativity, stage presence, and audience engagement.',
    iconName: 'Award',
    highlights: ['10-Point Standardized Rubric', 'Weighted 60% Impact', 'Encrypted Judge Slate'],
  },
  {
    id: 'organizers',
    role: 'ORGANIZERS',
    title: 'Organizers',
    tagline: 'Run the event from a centralized control system.',
    description: 'Command center control over stage sequence, live voting windows, stage displays, and instant result lockouts.',
    iconName: 'Sliders',
    highlights: ['Stage Manager Control', 'Automated Voting Timer', 'Mainstage Display Engine'],
  },
];

export const HOW_IT_WORKS_STEPS: StepFlow[] = [
  {
    stepNumber: '01',
    title: 'REGISTER',
    subtitle: 'Submit your act and profile',
    description: 'Performers register their act details, audio tracks, track type (Solo or Group), and team roster to lock in their audition slot.',
    actionText: 'Register Act',
  },
  {
    stepNumber: '02',
    title: 'TAKE THE STAGE',
    subtitle: 'Perform according to running order',
    description: 'Performers take center stage under professional lighting with synced audio-visual feeds according to the live event queue.',
    actionText: 'View Schedule',
  },
  {
    stepNumber: '03',
    title: 'RATE',
    subtitle: 'Audience votes while judges score',
    description: 'As the spotlight shines, judges input rubric scores on their tablets while 800 audience members cast 1–10 ratings on their phones.',
    actionText: 'Live Voting Demo',
  },
  {
    stepNumber: '04',
    title: 'SPOTLIGHT',
    subtitle: 'Panel & audience scores combine',
    description: 'The automated engine calculates the 60/40 weighted formula and updates the live auditorium stage display in real-time.',
    actionText: 'See Leaderboard',
  },
];

export const SCORING_DATA: ScoringSystem = {
  judgesWeight: 60,
  audienceWeight: 40,
  audienceRange: '1–10 Rating Scale per Act',
  rubric: [
    {
      name: 'Creativity',
      maxPoints: 3,
      weight: '30%',
      description: 'Originality, artistic choice, arrangement, and innovation.',
    },
    {
      name: 'Execution',
      maxPoints: 3,
      weight: '30%',
      description: 'Technical precision, pitch/vocal or choreo fidelity, rhythm.',
    },
    {
      name: 'Stage Presence',
      maxPoints: 2,
      weight: '20%',
      description: 'Confidence, expressiveness, visual impact, and stage command.',
    },
    {
      name: 'Audience Engagement',
      maxPoints: 2,
      weight: '20%',
      description: 'Crowd reaction, energy flow, and atmosphere resonance.',
    },
  ],
};

export const TRACKS_DATA: CompetitionTrack[] = [
  {
    id: 'solo',
    badge: 'TRACK 01',
    title: 'SOLO',
    tagline: 'One performer. One stage. One spotlight.',
    description: 'For individual vocalists, solo dancers, instrumentalists, stand-up acts, and solo performers looking to command the entire stage.',
    performerLimit: '1 Performer',
    stageTime: '4 Minutes Max',
    highlights: ['Direct Spotlight Focus', 'Individual Feedback Slate', 'Solo Trophy Division'],
    ctaText: 'Register for Solo Track',
    ctaHref: '/register?track=solo',
  },
  {
    id: 'group',
    badge: 'TRACK 02',
    title: 'GROUP',
    tagline: 'Multiple performers. One act. One spotlight.',
    description: 'For dance crews, music bands, theater troupes, and collaborative ensembles delivering high-voltage synchronized acts.',
    performerLimit: '2 – 12 Performers',
    stageTime: '7 Minutes Max',
    highlights: ['Synchronized Group Scoring', 'Multi-Mic & Audio Setup', 'Group Championship Division'],
    ctaText: 'Register for Group Track',
    ctaHref: '/register?track=group',
  },
];

export const NAV_LINKS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '#about' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Schedule', href: '#schedule' },
];

/* Phase 2: Registration Data Options */
export const PERFORMANCE_CATEGORIES = [
  'Dance',
  'Music',
  'Singing',
  'Theatre',
  'Comedy',
  'Spoken Word',
  'Instrumental',
  'Other',
];

export const DEPARTMENT_OPTIONS = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Commerce / Business Administration',
  'Arts & Mass Communication',
  'Basic Sciences',
  'Other Department',
];

export const YEAR_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Post-Graduate',
];

export const SELF_RATING_QUALIFIERS: Record<number, string> = {
  1: 'FIRST TIMESTEP',
  2: 'EMERGING ACT',
  3: 'PRACTICED',
  4: 'READY TO COMPETE',
  5: 'SOLID PERFORMANCE',
  6: 'HIGH ENERGY',
  7: 'STAGE READY',
  8: 'CONFIDENT',
  9: 'SHOWSTOPPER',
  10: 'GRAND CHAMPION LEVEL',
};

/* Phase 4: Mock Live Acts & Valid Tickets */
export const MOCK_ACTS: Act[] = [
  {
    id: 'act-01',
    slotNumber: 1,
    category: 'group',
    title: 'Symphonic Echoes',
    performerName: 'Karan Mehta & The Resonance Crew',
    department: 'Music & Sound Arts',
    year: '3rd Year',
    performanceType: 'Music & Live Band',
    blurb: 'A 5-piece fusion ensemble blending classical Indian ragas with modern progressive rock dynamics.',
    photoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'act-02',
    slotNumber: 2,
    category: 'solo',
    title: 'Rhythm Rebels',
    performerName: 'Ananya Sharma',
    department: 'Electronics Engineering',
    year: '4th Year',
    performanceType: 'Contemporary Solo Dance',
    blurb: 'High-voltage acrobatic dance piece exploring the collision of technology and human emotion.',
    photoUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'act-03',
    slotNumber: 3,
    category: 'group',
    title: 'Echoes of Drama',
    performerName: 'The Natya Theatre Guild',
    department: 'Arts & Mass Communication',
    year: '2nd Year',
    performanceType: 'Street Play & Musical Theatre',
    blurb: 'A punchy satire addressing digital obsession and artificial intelligence in college life.',
    photoUrl: 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'act-04',
    slotNumber: 4,
    category: 'solo',
    title: 'Acoustic Horizon',
    performerName: 'Rohan Deshmukh',
    department: 'Computer Science',
    year: '1st Year',
    performanceType: 'Vocal Solo & Fingerstyle Guitar',
    blurb: 'Soulful acoustic medley featuring original compositions and vocal loops.',
    photoUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
  },
];

export const MOCK_VALID_TICKETS = [
  'SPT-TKT-2026-0001',
  'SPT-TKT-2026-0002',
  'SPT-TKT-2026-0003',
  'SPT-TKT-2026-00482',
  'SPT-TKT-2026-00483',
];

/* Phase 5: Mock Judge Profiles */
export const MOCK_JUDGES: JudgeIdentity[] = [
  {
    id: 'judge-01',
    code: 'JUDGE-01',
    name: 'Dr. Sarah Jenkins',
    title: 'Director of Vocal Performance & Sound Arts',
    role: 'Judge 01 (Music & Vocals)',
  },
  {
    id: 'judge-02',
    code: 'JUDGE-02',
    name: 'Marcus Chen',
    title: 'Principal Choreographer & Performing Artist',
    role: 'Judge 02 (Dance & Choreography)',
  },
  {
    id: 'judge-03',
    code: 'JUDGE-03',
    name: 'Prof. Vikram Patel',
    title: 'Chair of Dramatic Arts & Stage Direction',
    role: 'Judge 03 (Theater & Stage Presence)',
  },
];
