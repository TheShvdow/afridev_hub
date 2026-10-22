import { Component, computed, signal } from '@angular/core';
import { SectionHeading } from '../section-heading/section-heading';
import { Icon } from '../icon/icon';

interface Job {
  logo: string;
  company: string;
  title: string;
  location: string;
  country: string;
  type: string;
  mode: string;
  experience: string;
  skills: string[];
  salary: string;
  currency: string;
  posted: string;
  description: string;
  missions: string[];
  profile: string[];
  benefits: string[];
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [SectionHeading, Icon],
  templateUrl: './jobs.html',
  styleUrl: './jobs.css',
})
export class Jobs {
  readonly jobs: Job[] = [
    {
      logo: 'assets/images/wave.png',
      company: 'Wave',
      title: 'Développeur·se Full-Stack',
      location: 'Dakar, Sénégal',
      country: 'Sénégal',
      type: 'CDI · Hybride',
      mode: 'Hybride',
      experience: '3+ ans',
      skills: ['React', 'Node', 'PostgreSQL'],
      salary: '1,2 – 1,8 M FCFA',
      currency: 'Local',
      posted: 'Publiée il y a 2 j',
      description:
        "Rejoignez l'équipe produit de Wave pour concevoir et maintenir les services qui font circuler les paiements Mobile Money à travers l'Afrique de l'Ouest. Vous travaillerez sur des APIs à fort trafic, des interfaces React performantes et l'intégration avec les opérateurs locaux.",
      missions: [
        "Concevoir et développer des APIs Node.js à fort trafic",
        "Construire des interfaces React accessibles et performantes",
        "Intégrer les passerelles Mobile Money des opérateurs locaux",
        "Participer aux revues de code et au mentorat de l'équipe",
      ],
      profile: [
        "3 ans et plus d'expérience en développement full-stack",
        "Maîtrise de React, Node.js et PostgreSQL",
        "Bonne compréhension des systèmes distribués",
        "Français et anglais courants",
      ],
      benefits: [
        "Couverture santé pour toute la famille",
        "Budget formation annuel",
        "Télétravail hybride flexible",
        "Prime de performance",
      ],
    },
    {
      logo: 'assets/images/moniepoint.png',
      company: 'Moniepoint',
      title: 'Ingénieur·e Mobile Flutter',
      location: 'Lagos, Nigeria',
      country: 'Nigeria',
      type: 'CDI · Sur site',
      mode: 'Sur site',
      experience: '2+ ans',
      skills: ['Flutter', 'Dart', 'SQLite'],
      salary: '₦900k – 1,4M',
      currency: 'Local',
      posted: 'Publiée il y a 4 j',
      description:
        "Vous développerez des applications Flutter utilisées par des milliers de commerçants au Nigeria. Vous serez responsable de la qualité, de la performance et de la robustesse hors-ligne de nos applications mobiles de paiement.",
      missions: [
        "Développer des fonctionnalités mobiles en Flutter",
        "Assurer un fonctionnement fiable hors-ligne",
        "Optimiser la performance et la taille des applications",
        "Collaborer avec les équipes produit et design",
      ],
      profile: [
        "2 ans et plus d'expérience en Flutter et Dart",
        "Expérience avec SQLite et la synchronisation de données",
        "Souci du détail et de la qualité du code",
        "Capacité à travailler sur site à Lagos",
      ],
      benefits: [
        "Assurance santé complète",
        "Transport pris en charge",
        "Restauration au bureau",
        "Évolution rapide dans une fintech en croissance",
      ],
    },
    {
      logo: 'assets/images/jumia.png',
      company: 'Jumia',
      title: 'Data Engineer',
      location: 'Casablanca, Maroc',
      country: 'Maroc',
      type: 'CDI · Hybride',
      mode: 'Hybride',
      experience: '4+ ans',
      skills: ['React', 'Node', 'PostgreSQL'],
      salary: '25 – 38k MAD',
      currency: 'Local',
      posted: 'Publiée il y a 1 sem.',
      description:
        'Vous construirez les pipelines de données qui alimentent la plateforme e-commerce panafricaine. Au programme : ingestion à grande échelle, modélisation et outils d’aide à la décision pour les équipes métier.',
      missions: [
        "Concevoir et maintenir des pipelines de données",
        "Modéliser les données pour l'analyse métier",
        "Automatiser l'ingestion à grande échelle",
        "Veiller à la qualité et à la gouvernance des données",
      ],
      profile: [
        "4 ans et plus d'expérience en data engineering",
        "Maîtrise de SQL, PostgreSQL et d'un langage de programmation",
        "Expérience avec des outils d'orchestration (Airflow, dbt…)",
        "Rigueur et esprit analytique",
      ],
      benefits: [
        "Mutuelle santé et prévoyance",
        "Télétravail hybride",
        "Budget conférences et formations",
        "Environnement international",
      ],
    },
    {
      logo: 'assets/images/gozem.png',
      company: 'Gozem',
      title: 'Frontend React (Freelance)',
      location: 'Lomé, Togo',
      country: 'Togo',
      type: 'Mission · Remote',
      mode: 'Remote',
      experience: 'Confirmé',
      skills: ['React', 'TypeScript', 'Tailwind'],
      salary: '350 – 500 €/sem.',
      currency: 'EUR',
      posted: 'Publiée il y a 3 j',
      description:
        'Mission freelance pour refondre les interfaces web de la super-app de mobilité. Vous travaillerez en autonomie avec les équipes design et backend pour livrer une expérience rapide et accessible.',
      missions: [
        "Refondre les interfaces web existantes en React",
        "Développer des composants réutilisables avec TypeScript",
        "Intégrer les maquettes avec Tailwind CSS",
        "Garantir la performance et l'accessibilité",
      ],
      profile: [
        "Expérience confirmée en React et TypeScript",
        "Maîtrise de Tailwind CSS",
        "Autonomie et sens des priorités",
        "Disponibilité en remote",
      ],
      benefits: [
        "Rémunération en euros",
        "Travail 100% à distance",
        "Horaires flexibles",
        "Possibilité de collaboration long terme",
      ],
    },
  ];

  readonly countries = [
    'Tous les pays',
    ...new Set(this.jobs.map((job) => job.country)),
  ];
  readonly workTypes = ['Tous', 'Remote', 'Hybride', 'Sur site'];
  readonly currencies = ['Tout', 'Local', 'EUR'];

  readonly selectedCountry = signal('Tous les pays');
  readonly selectedWorkType = signal('Tous');
  readonly selectedCurrency = signal('Tout');

  readonly selectedJob = signal<Job | null>(null);
  readonly isPanelOpen = signal(false);

  readonly filteredJobs = computed(() => {
    const country = this.selectedCountry();
    const workType = this.selectedWorkType();
    const currency = this.selectedCurrency();

    return this.jobs.filter(
      (job) =>
        (country === 'Tous les pays' || job.country === country) &&
        (workType === 'Tous' || job.mode === workType) &&
        (currency === 'Tout' || job.currency === currency),
    );
  });

  setCountry(value: string): void {
    this.selectedCountry.set(value);
  }

  setWorkType(workType: string): void {
    this.selectedWorkType.set(workType);
  }

  toggleCurrency(currency: string): void {
    this.selectedCurrency.set(currency);
  }

  openJob(job: Job): void {
    this.selectedJob.set(job);
    this.isPanelOpen.set(true);
  }

  closeJob(): void {
    this.isPanelOpen.set(false);
  }
}
