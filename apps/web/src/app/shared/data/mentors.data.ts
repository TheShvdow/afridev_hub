import { Mentor } from '../components/card-mentor/card-mentor.component';

export const MENTORS: Mentor[] = [
  {
    name: 'Awa Diallo',
    role: 'Staff Engineer · Backend',
    start: '4.9(42)',
    tags: ['Go', 'Node', 'PostgreSQL'],
    availability: '3 créneaux cette semaine',
    price: '15 000 FCFA / 45 min',
    flag: 'sn',
    avatar: 'assets/images/awa.png',
    slot: 'cette-semaine',
  },
  {
    name: 'Eleanor Pena',
    role: 'Lead Mobile · Flutter',
    start: '4.9(42)',
    tags: ['Flutter', 'Offline-first', 'PostgreSQL'],
    availability: '2 créneaux cette semaine',
    price: '15 000 FCFA / 45 min',
    flag: 'gh',
    avatar: 'assets/images/eleanor.png',
    slot: 'cette-semaine',
  },
  {
    name: 'Brooklyn Simmons',
    role: 'Data Scientist · IA',
    start: '4.9(42)',
    tags: ['ML', 'NLP', 'PostgreSQL'],
    availability: 'Disponible demain',
    price: '15 000 FCFA / 45 min',
    flag: 'mr',
    initials: 'BS',
    slot: 'demain',
  },
  {
    name: 'Brooklyn Simmons',
    role: 'DevOps · Cloud',
    start: '4.9(42)',
    tags: ['Kubernetes', 'AWS', 'PostgreSQL'],
    availability: '4 créneaux cette semaine',
    price: '15 000 FCFA / 45 min',
    flag: 'cm',
    avatar: 'assets/images/brooklyn.png',
    slot: 'cette-semaine',
  },
];

export const ALL_SPECIALTIES = 'Toutes';
export const ALL_SLOTS = 'Tous';

export const MENTOR_SPECIALTIES = [
  ALL_SPECIALTIES,
  ...new Set(MENTORS.flatMap((mentor) => mentor.tags)),
];

export const MENTOR_SLOTS: { value: string; label: string }[] = [
  { value: ALL_SLOTS, label: 'Tous' },
  { value: 'cette-semaine', label: 'Cette semaine' },
  { value: 'demain', label: 'Disponible demain' },
];

export interface MentorFilterCriteria {
  specialty: string;
  slot: string;
}

export function filterMentors(mentors: Mentor[], criteria: MentorFilterCriteria): Mentor[] {
  const { specialty, slot } = criteria;

  return mentors.filter(
    (mentor) =>
      (specialty === ALL_SPECIALTIES || mentor.tags.includes(specialty)) &&
      (slot === ALL_SLOTS || mentor.slot === slot),
  );
}
