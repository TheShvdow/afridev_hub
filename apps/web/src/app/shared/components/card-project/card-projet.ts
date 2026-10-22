import { Component, input } from '@angular/core';

export interface Project {
  image: string;
  stars: string;
  title: string;
  description: string;
  tags: string[];
  city: string;
}

@Component({
  selector: 'app-card-projet',
  standalone: true,
  imports: [],
  templateUrl: './card-projet.html',
  styleUrl: './card-projet.css',
})
export class CardProjet {
  readonly project = input.required<Project>();
  readonly ctaLabel = input('Découvrir');
}
