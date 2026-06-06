import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../components/header.component';
import { AppFooterComponent } from '../components/footer.component';
import { AuthService } from '../services/auth.service';
import { TallerRespuesta } from '../models/tipos';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <app-header
      [tallerActual]="tallerActual"
      (onIniciarSesion)="irAIniciarSesion()"
      (onRegistarTaller)="irARegistroTaller()"
      (onCerrarSesion)="cerrarSesion()"
    ></app-header>

    <!-- Pricing Section -->
    <section class="pt-32 pb-24 bg-surface min-h-screen">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h1 class="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Planes diseñados para tu taller
          </h1>
          <p class="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Comienza gratis y escala cuando lo necesites. Sin permanencia, cancela cuando quieras.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <!-- Plan Gratuito -->
          <div class="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg hover:shadow-xl transition-all">
            <div class="mb-6">
              <span class="inline-block bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-bold mb-4">
                PLAN GRATUITO
              </span>
              <h3 class="text-3xl font-bold mb-2">$0 <span class="text-base font-normal text-gray-500">/mes</span></h3>
              <p class="text-gray-500">Ideal para talleres que están comenzando</p>
            </div>

            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-green-500">check_circle</span>
                <span>Hasta <strong>2 técnicos</strong> activos</span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-green-500">check_circle</span>
                <span>Hasta <strong>10 incidentes/mes</strong></span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-green-500">check_circle</span>
                <span>Diagnóstico por IA</span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-green-500">check_circle</span>
                <span>Tracking en tiempo real</span>
              </li>
              <li class="flex items-center gap-3 text-gray-400">
                <span class="material-symbols-outlined">block</span>
                <span>Sin reportes avanzados</span>
              </li>
              <li class="flex items-center gap-3 text-gray-400">
                <span class="material-symbols-outlined">block</span>
                <span>Soporte estándar</span>
              </li>
            </ul>

            <button
              (click)="irARegistroTaller()"
              class="w-full py-3 rounded-xl border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-all"
            >
              Comenzar gratis
            </button>
          </div>

          <!-- Plan Premium -->
          <div class="bg-gradient-to-br from-primary to-primary-container text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-yellow-400 text-primary px-4 py-1 rounded-bl-2xl text-sm font-bold">
              POPULAR
            </div>
            <div class="mb-6">
              <span class="inline-block bg-white/20 text-white px-4 py-1 rounded-full text-sm font-bold mb-4">
                PLAN PREMIUM
              </span>
              <h3 class="text-3xl font-bold mb-2">$29 <span class="text-base font-normal text-white/70">/mes</span></h3>
              <p class="text-white/80">Para talleres profesionales con alta demanda</p>
            </div>

            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-white">check_circle</span>
                <span><strong>Técnicos ilimitados</strong></span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-white">check_circle</span>
                <span><strong>Incidentes ilimitados</strong></span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-white">check_circle</span>
                <span>Diagnóstico por IA</span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-white">check_circle</span>
                <span>Tracking en tiempo real</span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-white">check_circle</span>
                <span><strong>Reportes avanzados</strong></span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-white">check_circle</span>
                <span><strong>Soporte prioritario</strong> 24/7</span>
              </li>
            </ul>

            <button
              (click)="irARegistroTaller()"
              class="w-full py-3 rounded-xl bg-white text-primary font-semibold hover:scale-105 transition-all"
            >
              Comenzar prueba de 30 días
            </button>
          </div>
        </div>

        <p class="text-center text-gray-400 text-sm mt-8">
          *Los precios son en USD. Puedes cancelar tu suscripción en cualquier momento.
        </p>
      </div>
    </section>

    <app-footer></app-footer>
  `,
})
export class PricingPage implements OnInit {
  tallerActual: TallerRespuesta | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.taller$.subscribe((taller) => {
      this.tallerActual = taller;
    });
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }

  irAIniciarSesion(): void {
    this.router.navigate(['/iniciar-sesion']);
  }

  irARegistroTaller(): void {
    this.router.navigate(['/registro-taller']);
  }
}