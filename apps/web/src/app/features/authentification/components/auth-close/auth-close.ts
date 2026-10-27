import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../home/components/icon/icon';

@Component({
  selector: 'app-auth-close',
  standalone: true,
  imports: [Icon, RouterLink],
  templateUrl: './auth-close.html',
})
export class AuthClose {}
