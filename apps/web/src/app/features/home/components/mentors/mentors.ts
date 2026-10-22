import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../section-heading/section-heading';
import { CardMentorComponent, Mentor } from '../../../../shared/components/card-mentor/card-mentor.component';
import { MENTORS } from '../../../../shared/data/mentors.data';

@Component({
  selector: 'app-mentors',
  standalone: true,
  imports: [SectionHeading, RouterLink, CardMentorComponent],
  templateUrl: './mentors.html',
  styleUrl: './mentors.css',
})
export class Mentors {
  readonly mentors: Mentor[] = MENTORS;
}
