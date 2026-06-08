import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { OfflineBannerComponent } from '../components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, OfflineBannerComponent],
  template: `
    <app-offline-banner></app-offline-banner>
    <router-outlet></router-outlet>
  `,
})
export class MainLayoutComponent {}
