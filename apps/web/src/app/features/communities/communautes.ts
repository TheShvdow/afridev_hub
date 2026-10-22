import { Component } from '@angular/core';
import { Icon } from '../home/components/icon/icon';

@Component({
  selector: 'app-communautes',
  standalone: true,
  imports: [Icon],
  templateUrl: './communautes.html',
  styleUrl: './communautes.css',
})
export class Communautes {
  readonly communities = [
    {
      chip: 'Pays',
      members: 158,
      title: 'Dev Sénégal',
      event: 'Meetup Wave & paiements',
      meta: 'Sam. 24 oct. · 16:00 · Dakar · CTIC',
    },
    {
      chip: 'Pays',
      members: 158,
      title: 'Dev Nigeria',
      event: 'Lagos Fintech Night',
      meta: 'Jeu. 29 oct. · 18:30 · Lagos · Yaba',
    },
    {
      chip: 'Pays',
      members: 540,
      title: 'Dev Côte d\'Ivoire',
      event: 'Dev Côte d\'Ivoire',
      meta: 'Ven. 6 nov. · 17:00 · Abidjan · Cocody',
    },
    {
      chip: 'Techno',
      members: 423,
      title: 'Flutter Afrique',
      event: 'Offline-first en pratique',
      meta: 'Mar. 27 oct. · 19:00 · En ligne',
    },
    {
      chip: 'Techno',
      members: 390,
      title: 'Python & IA',
      event: 'NLP pour les langues africaines',
      meta: 'Mer. 4 nov. · 18:00 · En ligne',
    },
    {
      chip: 'Techno',
      members: 305,
      title: 'DevOps & Cloud',
      event: 'Kubernetes sur budget serré',
      meta: 'Sam. 14 nov. · 11:00 · En ligne',
    },
  ];

}
