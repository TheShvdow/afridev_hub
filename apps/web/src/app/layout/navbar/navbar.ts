import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly menuOpen = signal(false);

  readonly links = [
    { label: 'Forum', link: '/forum' },
    { label: 'Projets', link: '/projets' },
    { label: 'Mentorat', link: '/', fragment: 'mentorat' },
    { label: 'Emplois', link: '/', fragment: 'emplois' },
    { label: 'Communautés', link: '/communautes' },
  ];
}
