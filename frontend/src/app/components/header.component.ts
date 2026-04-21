import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from './button.component';
import { TallerRespuesta } from '../models/tipos';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav
      class="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md shadow-[0_12px_32px_rgba(0,28,56,0.08)]"
    >
      <div class="flex justify-between items-center max-w-7xl mx-auto px-6 h-20">
        <!-- Logo -->
        <div class="text-2xl font-['Manrope'] font-extrabold tracking-tighter text-blue-700 dark:text-blue-400">
          CeroEspera
        </div>

        <!-- Menu Desktop -->
        <div class="hidden md:flex items-center gap-8">
          <a
            *ngFor="let link of menuLinks"
            [href]="link.url"
            class="text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg px-3 py-2 font-['Manrope'] font-semibold text-sm tracking-tight"
          >
            {{ link.label }}
          </a>
        </div>

        <!-- Right Actions -->
        <div class="flex items-center gap-4">
          <button
            *ngIf="!tallerActual"
            class="hidden md:block text-sm px-4 py-2 rounded-lg text-on-surface hover:bg-surface-container transition-all"
            (click)="onIniciarSesion.emit()"
          >
            Iniciar sesión
          </button>
          <button
            *ngIf="!tallerActual"
            class="hidden lg:block text-primary font-semibold px-4 py-2 hover:bg-primary-fixed rounded-lg transition-all active:scale-95"
            (click)="onRegistarTaller.emit()"
          >
            Registrar Taller
          </button>
          <button
            *ngIf="tallerActual"
            class="hidden lg:block text-sm px-3 py-2 rounded-lg hover:bg-surface-container text-on-surface transition-all"
            (click)="onCerrarSesion.emit()"
          >
            Cerrar sesión
          </button>
          <button
            class="bg-gradient-to-br from-primary to-primary-container text-white px-6 py-2.5 rounded-lg font-bold shadow-lg active:scale-95 transition-all"
            (click)="onDescargarApp.emit()"
          >
            Descargar App
          </button>
        </div>
      </div>
    </nav>
  `,
})
export class AppHeaderComponent {
  @Input() tallerActual: TallerRespuesta | null = null;
  @Output() onRegistarTaller = new EventEmitter<void>();
  @Output() onIniciarSesion = new EventEmitter<void>();
  @Output() onDescargarApp = new EventEmitter<void>();
  @Output() onCerrarSesion = new EventEmitter<void>();

  menuLinks = [
    { label: 'Cómo funciona', url: '#' },
    { label: 'Para Talleres', url: '#' },
    { label: 'Precios', url: '#' },
  ];
}
