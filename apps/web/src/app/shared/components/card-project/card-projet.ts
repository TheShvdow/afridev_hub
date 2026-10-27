import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Project {
  id?: string;
  slug?: string;
  image: string;
  stars: string;
  title: string;
  description: string;
  tags: string[];
  city: string;
  author?: string;
  href?: string;
  detailHref?: string;
}

@Component({
  selector: 'app-card-projet',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './card-projet.html',
})
export class CardProjet {
  readonly project = input.required<Project>();
  readonly ctaLabel = input('Découvrir');
}
