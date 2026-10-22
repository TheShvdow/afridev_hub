import { Component, input } from '@angular/core';
import { Icon } from '../../../home/components/icon/icon';

export interface AuthStep {
  number: string;
  title: string;
  description: string;
  state: 'done' | 'active' | 'todo';
}

export interface AuthFeature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-auth-side',
  imports: [Icon],
  templateUrl: './auth-side.html',
  styleUrl: './auth-side.css',
})
export class AuthSide {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly steps = input<AuthStep[]>([]);
  readonly features = input<AuthFeature[]>([]);
}
