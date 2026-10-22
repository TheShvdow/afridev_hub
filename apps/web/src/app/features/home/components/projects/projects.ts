import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../section-heading/section-heading';
import { CardProjet, Project } from '../../../../shared/components/card-project/card-projet';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [SectionHeading, RouterLink, CardProjet],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  readonly projects: Project[] = [
    {
      image: 'assets/images/img_projet_1.png',
      stars: '342',
      title: 'AgriLink',
      description:
        'Marketplace reliant coopératives agricoles et acheteurs, avec suivi des prix en temps réel.',
      tags: ['React', 'Node', 'PostgreSQL'],
      city: 'Kigali',
    },
    {
      image: 'assets/images/img_projet_2.png',
      stars: '518',
      title: 'SwahiliTTS',
      description: 'Moteur de synthèse vocale open source pour le swahili et le kinyarwanda.',
      tags: ['Python', 'PyTorch', 'PostgreSQL'],
      city: 'Kigali',
    },
    {
      image: 'assets/images/img_projet_3.png',
      stars: '267',
      title: 'PayBridge',
      description:
        'SDK unifié pour agréger Orange Money, Wave, MTN MoMo et M-Pesa en une seule API.',
      tags: ['TypeScript', 'Go', 'PostgreSQL'],
      city: 'Kigali',
    },
  ];

  readonly tags = ['Tout', ...new Set(this.projects.flatMap((project) => project.tags))];
  readonly selectedTag = signal('Tout');

  readonly filteredProjects = computed(() => {
    const tag = this.selectedTag();
    return tag === 'Tout'
      ? this.projects
      : this.projects.filter((project) => project.tags.includes(tag));
  });

  toggleTag(tag: string): void {
    this.selectedTag.set(tag);
  }
}