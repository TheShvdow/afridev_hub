import { Component } from '@angular/core';
import { Hero } from './components/hero/hero';
import { Stats } from './components/stats/stats';
import { Forum } from './components/forum/forum';
import { Projects } from './components/projects/projects';
import { Mentors } from './components/mentors/mentors';
import { Jobs } from './components/jobs/jobs';
import { Formations } from './components/formations/formations';
import { Newsletter } from './components/newsletter/newsletter';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Hero, Stats, Forum, Projects, Mentors, Jobs, Formations, Newsletter],
  templateUrl: './home.html',
})
export class Home {

}
