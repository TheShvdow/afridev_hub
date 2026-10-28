import { Component, computed, signal } from '@angular/core';
import { CardMentorComponent, Mentor } from '../../../shared/components/card-mentor/card-mentor.component';
import { MentorFiltersComponent } from '../../../shared/components/mentor-filters/mentor-filters.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { PreviewBannerComponent } from '../../../shared/components/preview-banner/preview-banner.component';
import {
  ALL_SLOTS,
  ALL_SPECIALTIES,
  filterMentors,
  MENTORS,
  MENTOR_SLOTS,
  MENTOR_SPECIALTIES,
} from '../../../shared/data/mentors.data';

@Component({
  selector: 'app-mentor-list',
  standalone: true,
  imports: [PreviewBannerComponent, CardMentorComponent, MentorFiltersComponent, PageHeroComponent],
  templateUrl: './mentor-list.component.html',
})
export class MentorListComponent {
  readonly mentors: Mentor[] = MENTORS;

  readonly specialties = MENTOR_SPECIALTIES;
  readonly slots = MENTOR_SLOTS;

  readonly selectedSpecialty = signal(ALL_SPECIALTIES);
  readonly selectedSlot = signal(ALL_SLOTS);

  readonly filteredMentors = computed(() =>
    filterMentors(this.mentors, {
      specialty: this.selectedSpecialty(),
      slot: this.selectedSlot(),
    }),
  );
}
