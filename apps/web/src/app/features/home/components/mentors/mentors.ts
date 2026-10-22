import { Component } from '@angular/core';
import { SectionHeading } from '../section-heading/section-heading';
import { Icon } from '../icon/icon';

export interface Mentor {
  name: string;
  role: string;
  start: string;
  tags: string[];
  availability: string;
  price: string;
  flag: 'sn' | 'gh' | 'mr' | 'cm';
  avatar?: string;
  initials?: string;
}

@Component({
  selector: 'app-mentors',
  standalone: true,
  imports: [SectionHeading, Icon],
  templateUrl: './mentors.html',
  styleUrl: './mentors.css',
})
export class Mentors {
  readonly mentors: Mentor[] = [
    {
      name: 'Awa Diallo',
      role: 'Staff Engineer · Backend',
      start: '4.9(42)',
      tags: ['Go', 'Node', 'PostgreSQL'],
      availability: '3 créneaux cette semainesemaineline-clamp-1',
      price: '15 000 FCFA / 45 min',
      flag: 'sn',
      avatar: 'assets/images/awa.png',
    },
    {
      name: 'Eleanor Pena',
      role: 'Lead Mobile · Flutter',
      start: '4.9(42)',
      tags: ['Flutter', 'Offline-first', 'PostgreSQL'],
      price: '15 000 FCFA / 45 min',
      availability: '2 créneaux cette semaine',
      flag: 'gh',
      avatar: 'assets/images/eleanor.png',
    },
    {
      name: 'Brooklyn Simmons',
      role: 'Data Scientist · IA',
      start: '4.9(42)',
      tags: ['ML', 'NLP', 'PostgreSQL'],
      availability: 'Disponible demain',
      price: '15 000 FCFA / 45 min',
      flag: 'mr',
      initials: 'BS',
    },
    {
      name: 'Brooklyn Simmons',
      role: 'DevOps · Cloud',
      start: '4.9(42)',
      tags: ['Kubernetes', 'AWS', 'PostgreSQL'],
      availability: '4 créneaux cette semaine',
      price: '15 000 FCFA / 45 min',
      flag: 'cm',
      avatar: 'assets/images/brooklyn.png',
    },
  ];
}