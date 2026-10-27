import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-s-et-ti-ng-s',
  standalone: true,
  imports: [RouterOutlet],
  template: "<router-outlet></router-outlet>",
})
export class SettingsComponent {}