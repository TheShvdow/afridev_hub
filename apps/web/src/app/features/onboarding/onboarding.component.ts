import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Country, CountriesService } from '../../core/services/countries.service';
import {
  EXPERIENCE_LEVELS,
  ExperienceLevel,
  MAX_STACK_ITEMS,
  MAX_STACK_ITEM_LENGTH,
  UsersService,
} from '../../core/services/users.service';
import { AuthStore } from '../../core/store/auth.store';
import { skipOnboarding } from '../../core/utils/onboarding';

const STEPS = 3;

/** Trois écrans après la première connexion : pays, niveau, technologies. Tout est facultatif. */
@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent implements OnInit {
  private readonly users = inject(UsersService);
  private readonly countriesApi = inject(CountriesService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly steps = STEPS;
  readonly levels = EXPERIENCE_LEVELS;
  readonly maxStack = MAX_STACK_ITEMS;

  readonly step = signal(1);
  readonly countries = signal<Country[]>([]);
  readonly country = signal('');
  readonly location = signal('');
  readonly level = signal<ExperienceLevel | null>(null);
  readonly stack = signal<string[]>([]);
  readonly stackInput = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly isLast = computed(() => this.step() === STEPS);

  ngOnInit(): void {
    this.countriesApi.list().subscribe({ next: (list) => this.countries.set(list), error: () => this.countries.set([]) });
  }

  next(): void {
    if (this.step() < STEPS) this.step.update((value) => value + 1);
  }

  back(): void {
    if (this.step() > 1) this.step.update((value) => value - 1);
  }

  selectLevel(value: ExperienceLevel): void {
    this.level.set(this.level() === value ? null : value);
  }

  addTech(): void {
    const value = this.stackInput().trim().slice(0, MAX_STACK_ITEM_LENGTH);
    this.stackInput.set('');
    if (!value || this.stack().length >= MAX_STACK_ITEMS) return;
    if (this.stack().some((tech) => tech.toLowerCase() === value.toLowerCase())) return;
    this.stack.update((list) => [...list, value]);
  }

  removeTech(tech: string): void {
    this.stack.update((list) => list.filter((item) => item !== tech));
  }

  skip(): void {
    const user = this.authStore.currentUser();
    if (user) skipOnboarding(user.id);
    this.leave();
  }

  finish(): void {
    this.addTech();
    const dto = {
      ...(this.country() && { country: this.country() }),
      ...(this.location().trim() && { location: this.location().trim() }),
      ...(this.level() && { level: this.level() as ExperienceLevel }),
      ...(this.stack().length > 0 && { stack: this.stack() }),
    };

    if (Object.keys(dto).length === 0) {
      this.skip();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.users.completeOnboarding(dto).subscribe({
      next: () => this.leave(),
      error: () => {
        this.saving.set(false);
        this.error.set('Enregistrement impossible pour le moment. Vous pourrez compléter votre profil plus tard.');
      },
    });
  }

  private leave(): void {
    this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/');
  }
}
