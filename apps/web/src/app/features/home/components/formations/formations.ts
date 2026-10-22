import { Component } from '@angular/core';
import { SectionHeading } from '../section-heading/section-heading';
import { Icon } from '../icon/icon';

@Component({
    selector: 'app-formations',
    standalone: true,
    imports: [SectionHeading, Icon],
    templateUrl: './formations.html',
    styleUrl: './formations.css',
})
export class Formations {
  readonly formations = [
    {
      image: 'assets/images/img_projet_1.png',
      stars: '342',
      title: 'React pour réseaux faibles',
      description: 'Nadia Eze · 3 modules · 52 min',
      price: '15 000 FCFA ',
    },
    {
      image: 'assets/images/img_projet_2.png',
      stars: '518',
      title: 'SwahiliTTS',
      description: 'Moteur de synthèse vocale open source pour le swahili et le kinyarwanda.',
      tags: ['Python', 'PyTorch', 'PostgreSQL'],
      price: '15 000 FCFA ',
    },
    {
      image: 'assets/images/img_projet_3.png',
      stars: '267',
      title: 'PayBridge',
      description:
        'SDK unifié pour agréger Orange Money, Wave, MTN MoMo et M-Pesa en une seule API.',
      tags: ['TypeScript', 'Go', 'PostgreSQL'],
      price: '15 000 FCFA ',
    },
  ];
}
