import { Component, computed, signal } from '@angular/core';
import { CardProjet, Project } from '../../../shared/components/card-project/card-projet';

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CardProjet],
  templateUrl: './projets.html',
  styleUrl: './projets.css',
})
export class Projets {
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
      city: 'Lagos',
    },
    {
      image: 'assets/images/img_projet_1.png',
      stars: '198',
      title: 'Moja Ride',
      description:
        'Plateforme de mobilité urbaine qui connecte passagers et chauffeurs dans les grandes villes.',
      tags: ['Flutter', 'Dart', 'Node'],
      city: 'Abidjan',
    },
    {
      image: 'assets/images/img_projet_2.png',
      stars: '421',
      title: 'KilimoAI',
      description:
        'Modèle de détection des maladies des cultures à partir de photos prises au champ.',
      tags: ['Python', 'TensorFlow', 'FastAPI'],
      city: 'Nairobi',
    },
    {
      image: 'assets/images/img_projet_3.png',
      stars: '156',
      title: 'SantéLink',
      description:
        'Dossier médical partagé et prise de rendez-vous pour les centres de santé communautaires.',
      tags: ['Vue', 'Laravel', 'MySQL'],
      city: 'Dakar',
    },
    {
      image: 'assets/images/img_projet_1.png',
      stars: '305',
      title: 'AfriLearn',
      description:
        "Application d'apprentissage hors-ligne pour les élèves sans accès permanent à Internet.",
      tags: ['React Native', 'TypeScript', 'SQLite'],
      city: 'Accra',
    },
    {
      image: 'assets/images/img_projet_2.png',
      stars: '233',
      title: 'Farmix',
      description: 'Suivi des stocks et de la logistique pour les petites exploitations agricoles.',
      tags: ['Django', 'PostgreSQL', 'React'],
      city: 'Kampala',
    },
    {
      image: 'assets/images/img_projet_3.png',
      stars: '377',
      title: 'BodaPay',
      description: 'Portefeuille mobile et paiements instantanés pour les conducteurs de moto-taxi.',
      tags: ['Go', 'Flutter', 'Redis'],
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
