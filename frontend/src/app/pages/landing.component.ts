import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent } from '../components/header.component';
import { AppFooterComponent } from '../components/footer.component';
import { AuthService } from '../services/auth.service';
import { TallerRespuesta } from '../models/tipos';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <!-- Header -->
    <app-header
      [tallerActual]="tallerActual"
      (onIniciarSesion)="irAIniciarSesion()"
      (onRegistarTaller)="irARegistroTaller()"
      (onCerrarSesion)="cerrarSesion()"
    ></app-header>

    <!-- Hero Section -->
    <header class="relative pt-32 pb-20 overflow-hidden bg-surface">
      <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <!-- Texto Principal -->
        <div class="lg:col-span-7 z-10">
          <span
            class="inline-block bg-primary-fixed text-on-primary-fixed-variant px-4 py-1.5 rounded-full text-xs font-label tracking-widest font-bold mb-6"
          >
            INTELIGENCIA ARTIFICIAL AL VOLANTE
          </span>
          <h1
            class="font-headline text-5xl md:text-7xl font-extrabold text-on-surface tracking-tighter leading-[1.05] mb-8"
          >
            Asistencia Vehicular <span class="text-primary italic">Inteligente</span> cuando más la necesitas.
          </h1>
          <p class="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-10 leading-relaxed">
            CeroEspera utiliza algoritmos avanzados de IA para diagnosticar problemas mecánicos mediante audio y
            foto en segundos, conectándote con la grúa o taller más cercano de inmediato.
          </p>

          <!-- Botones CTA -->
          <div class="flex flex-wrap gap-4">
            <button
              (click)="irAIniciarSesion()"
              class="status-pulse bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-3 shadow-xl transition-all hover:shadow-2xl active:scale-95"
            >
              <span class="material-symbols-outlined" data-icon="phone_in_talk">phone_in_talk</span>
              Pedir Asistencia Ahora
            </button>
            <button
              (click)="irARegistroTaller()"
              class="bg-surface-container-high text-on-surface px-8 py-4 rounded-lg font-bold text-lg hover:bg-surface-container-highest transition-all active:scale-95"
            >
              Soy un Taller
            </button>
          </div>

          <!-- Social Proof -->
          <div class="mt-12 flex items-center gap-6 text-on-surface-variant opacity-75">
            <div class="flex -space-x-3">
              <img
                class="w-10 h-10 rounded-full border-2 border-white object-cover"
                alt="user1"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVXFyI19wdFTzPkCnKUz7cm7j4oBDOPkvfokznSUiJiHSHnntH26E5Z66Kw2DISGmDhwa9lnPB2Fe5NQOHZ9ZiVti74G7r3kabAs8X2uWIymz_kZqTdMwlicl_00-AZP8F_1eF-Ul6988bZYusJrzqfHbhD08CRhNKSLIThfwp6GnsgwNHupdS2lVw3VSYegUUZncUchH7eUVgghha2CktbPzwdCqlLgS69yTtD0sL7YR5ZRm0eiIJOyDMApiGNzUFjt2DAHrPH1Y"
              />
              <img
                class="w-10 h-10 rounded-full border-2 border-white object-cover"
                alt="user2"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHVorJJn5FhXODmckBMYyvu3K-Bua4voD9WCQrVftWpBITJnNtJFDixaOdRn_5uQjoYahvCieu5DWV0g__q67xEEQtm2ISP0NHlC4MbQZL1U1ngxAtTDN_sVlfbQE0w3OX73HempeCjTV0G9gcWMDlmjt2lOWmBZyqEIzHFtMY7De0YSgd44B4rXCGl4KtuJoGe9KanpmrYONZWhscH6VRV661U7IgGhqogYUnNqQkIrWPe9KYPz-dxIMqAYcKRqrsVu0v0f8G-_Y"
              />
              <img
                class="w-10 h-10 rounded-full border-2 border-white object-cover"
                alt="user3"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_-1g9SKnM2t8btJqGKhQ1LARzxZ-6uInhb9P744rrPrJ4LF7eDxidaQejh9GMM83ApFFV4Iub97BJ-b2G6Zp1y_xLknc5U0GCn_95kLQM09wscnjmimFCzQyx7CEgd78YdZDmwfLBPD1QftkRpI79NHJf1NeZXBWzHGVZRX2DLizBdujcb7T5xQwxu25OyYhyDWeaiivlsA5iggCHVCPrabjwX4cdqdEcWmbNWPVRAlxRxQDSE-ZkXuTCQISWs-ChIK8enNaJCQM"
              />
            </div>
            <span class="text-sm font-medium">+15,000 conductores protegidos en ruta</span>
          </div>
        </div>

        <!-- Imagen Principal -->
        <div class="lg:col-span-5 relative">
          <div class="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5] bg-surface-container-low group">
            <img
              class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
              alt="smartphone app interface"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZx-2LdnGlkw0DfDIuHbyYrYiayZUdXpq_xSAvf8ATo5j9HcYZtBHvU0sAQldY_a5QWyEl3_gGa1XZQcwjfxM5RAgYnBs8dE4_YY2zo26SfBlHRbs0INkAvICHh53smVpnyMrQEj8ye1kKdkoZyImEEfbBqTfwUFI6yKiP-iNQ3DTCB-JBu4NuxRLBqbq2LMnELg9H4j3eRAncLf_OqnPwMhI0jrfbXtD1SGXiikiEhSZ2PJg6FSe-xKvxKbrtLyWo6X0b_8c-D2s"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>

            <!-- Floating Card -->
            <div class="absolute bottom-6 left-6 right-6 glass-nav bg-white/60 p-4 rounded-2xl shadow-xl border border-white/30">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center text-white">
                  <span class="material-symbols-outlined" data-icon="troubleshoot">troubleshoot</span>
                </div>
                <div>
                  <p class="text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold">
                    Diagnóstico IA
                  </p>
                  <p class="text-sm font-headline font-bold">Alternador fallando (98% certeza)</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Background blurs -->
          <div class="absolute -top-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-10 -left-10 w-60 h-60 bg-primary/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </header>

    <!-- Cómo Funciona -->
    <section class="py-24 bg-surface-container-low">
      <div class="max-w-7xl mx-auto px-6">
        <div class="mb-16">
          <h2 class="font-headline text-4xl font-bold tracking-tight mb-4">Cómo funciona CeroEspera</h2>
          <p class="text-on-surface-variant max-w-xl">
            Tecnología propietaria que convierte tu smartphone en un mecánico experto disponible 24/7.
          </p>
        </div>

        <!-- Grid de pasos -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Paso 1 -->
          <div
            class="bg-surface p-8 rounded-3xl border border-outline-variant/15 flex flex-col justify-between group hover:shadow-xl transition-all"
          >
            <div>
              <div
                class="w-14 h-14 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:rotate-6 transition-transform"
              >
                <span class="material-symbols-outlined text-3xl">photo_camera</span>
              </div>
              <h3 class="font-headline text-2xl font-bold mb-4">Captura la Falla</h3>
              <p class="text-on-surface-variant leading-relaxed">
                Graba el sonido del motor o toma una foto del testigo en el tablero. Nuestra IA procesa datos
                sensoriales en tiempo real.
              </p>
            </div>
            <div class="mt-8 pt-8 border-t border-surface-container-high italic text-sm text-primary font-medium">
              "Análisis acústico activado..."
            </div>
          </div>

          <!-- Paso 2 -->
          <div class="bg-primary text-white p-8 rounded-3xl shadow-2xl flex flex-col justify-between group">
            <div>
              <div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <h3 class="font-headline text-2xl font-bold mb-4 text-on-primary-container">Análisis Neuronal</h3>
              <p class="text-on-primary-container opacity-90 leading-relaxed">
                Contrastamos la evidencia con una base de datos de millones de fallas para darte un diagnóstico preciso
                y costo estimado.
              </p>
            </div>
            <div class="mt-8 overflow-hidden rounded-xl h-2 bg-white/20">
              <div class="h-full bg-secondary-container w-[85%]"></div>
            </div>
          </div>

          <!-- Paso 3 -->
          <div
            class="bg-surface p-8 rounded-3xl border border-outline-variant/15 flex flex-col justify-between group hover:shadow-xl transition-all"
          >
            <div>
              <div
                class="w-14 h-14 bg-secondary-fixed rounded-2xl flex items-center justify-center text-secondary mb-6 group-hover:-rotate-6 transition-transform"
              >
                <span class="material-symbols-outlined text-3xl">auto_fix</span>
              </div>
              <h3 class="font-headline text-2xl font-bold mb-4">Rescate Activo</h3>
              <p class="text-on-surface-variant leading-relaxed">
                Despachamos la unidad de asistencia más cercana. Conoce quién viene, su ubicación y paga de forma
                transparente.
              </p>
            </div>
            <div class="mt-8 pt-8 border-t border-surface-container-high flex justify-between items-center">
              <span class="text-sm font-bold text-on-surface">ETA: 12 min</span>
              <div class="flex gap-1">
                <div class="w-2 h-2 rounded-full bg-secondary animate-bounce"></div>
                <div class="w-2 h-2 rounded-full bg-secondary animate-bounce" style="animation-delay: 100ms"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Secciones Duales -->
    <section class="py-24">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Para Conductores -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-32">
          <div class="order-2 lg:order-1">
            <img
              class="rounded-[2.5rem] shadow-2xl object-cover aspect-video lg:aspect-square"
              alt="luxury car interior"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuJyPZW5I1uZrGCuszZIa8j_eSi5pAZmfRLXzMI1vIEf_LFx9Gfn5vpFtWrxYGIyU7ic57wxGd2heXy5fUwB3UNgAHny8jWROCsx0vfKm58PFfEXPv9Ls7kKdvaDj_ukIaIcfhhsXzBC6fBekeH05EXyHF6-SmfX11xlObwki2iBdi_XEgpa4bVkE2zE1jdrUbIQg3q1neAX3dqW0uijFiQ5at0pVn43kWSPiA4Ir20zflSYfssxZUew6LVb_-e4XIGrEyqBWzHmM"
            />
          </div>
          <div class="order-1 lg:order-2">
            <h4 class="font-label text-primary font-bold tracking-[0.2em] mb-4 uppercase">Para Conductores</h4>
            <h2 class="font-headline text-4xl font-bold mb-8 leading-tight">
              Tu tranquilidad no tiene por qué ser cara ni lenta.
            </h2>
            <ul class="space-y-6">
              <li class="flex gap-4">
                <div class="flex-shrink-0 w-6 h-6 bg-primary-fixed rounded-full flex items-center justify-center mt-1">
                  <span class="material-symbols-outlined text-[16px] text-primary" data-weight="fill">check</span>
                </div>
                <p class="text-on-surface-variant leading-relaxed">
                  <strong>Pagos Transparentes:</strong> Olvida el regateo. El precio se cotiza por la IA antes de que
                  llegue la ayuda.
                </p>
              </li>
              <li class="flex gap-4">
                <div class="flex-shrink-0 w-6 h-6 bg-primary-fixed rounded-full flex items-center justify-center mt-1">
                  <span class="material-symbols-outlined text-[16px] text-primary" data-weight="fill">check</span>
                </div>
                <p class="text-on-surface-variant leading-relaxed">
                  <strong>Seguimiento Satelital:</strong> Mira el recorrido de tu grúa en tiempo real directamente en
                  el mapa.
                </p>
              </li>
              <li class="flex gap-4">
                <div class="flex-shrink-0 w-6 h-6 bg-primary-fixed rounded-full flex items-center justify-center mt-1">
                  <span class="material-symbols-outlined text-[16px] text-primary" data-weight="fill">check</span>
                </div>
                <p class="text-on-surface-variant leading-relaxed">
                  <strong>Asistencia Multi-falla:</strong> Desde cambio de llanta hasta remolque pesado, todo en un
                  toque.
                </p>
              </li>
            </ul>
          </div>
        </div>

        <!-- Para Talleres -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h4 class="font-label text-secondary font-bold tracking-[0.2em] mb-4 uppercase">
              Para Talleres y Grúas
            </h4>
            <h2 class="font-headline text-4xl font-bold mb-8 leading-tight">
              Maximiza tu rentabilidad con servicios pre-diagnosticados.
            </h2>
            <ul class="space-y-6">
              <li class="flex gap-4">
                <div class="flex-shrink-0 w-6 h-6 bg-secondary-fixed rounded-full flex items-center justify-center mt-1">
                  <span class="material-symbols-outlined text-[16px] text-secondary" data-weight="fill">bolt</span>
                </div>
                <p class="text-on-surface-variant leading-relaxed">
                  <strong>Sin Diagnósticos Infinitos:</strong> Recibe el reporte de la IA antes de salir, llevando las
                  piezas exactas.
                </p>
              </li>
              <li class="flex gap-4">
                <div class="flex-shrink-0 w-6 h-6 bg-secondary-fixed rounded-full flex items-center justify-center mt-1">
                  <span class="material-symbols-outlined text-[16px] text-secondary" data-weight="fill">bolt</span>
                </div>
                <p class="text-on-surface-variant leading-relaxed">
                  <strong>Gestión de Técnicos:</strong> Panel administrativo para asignar rutas y optimizar el
                  combustible.
                </p>
              </li>
              <li class="flex gap-4">
                <div class="flex-shrink-0 w-6 h-6 bg-secondary-fixed rounded-full flex items-center justify-center mt-1">
                  <span class="material-symbols-outlined text-[16px] text-secondary" data-weight="fill">bolt</span>
                </div>
                <p class="text-on-surface-variant leading-relaxed">
                  <strong>Ingresos Garantizados:</strong> Liquidación semanal de todos tus servicios realizados sin
                  complicaciones.
                </p>
              </li>
            </ul>
          </div>
          <div class="relative">
            <img
              class="rounded-[2.5rem] shadow-2xl object-cover aspect-video lg:aspect-square"
              alt="professional auto repair workshop"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSM8rtAD7vN7kLa4wwmiK8V2wqYPxxfqVnND4hY3rKNkdgYzX2Q4firg3j8uA5pkBVWtUcBB7Xg00B6XhxxX3eSFCTxK2QkM97NA9ujb9-dQhHBy93ZpRux5hyJffUoXB2wnrVBhmiBqi5TGPcoD5rU3bSPG8IeIkLfh20-uvVrOs_uTMs7xInel-96q6bZDAUAssf2zm3zV9h0OJvA6D8cq0nrOsGT65J2-wV0vfIfrvKiTUMDp9ZnrlgQq8c_cz5nAeqFlUfl98"
            />
            <!-- Overlay stat -->
            <div class="absolute -bottom-8 -left-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-[200px]">
              <p class="text-4xl font-headline font-extrabold text-primary mb-1">2.4x</p>
              <p class="text-xs font-label font-bold text-on-surface-variant uppercase tracking-tighter leading-tight">
                Más servicios por técnico diarios
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="py-20 bg-primary-container text-white overflow-hidden relative">
      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div class="text-4xl md:text-6xl font-headline font-extrabold mb-2">+500</div>
            <p class="text-primary-fixed-dim font-medium">Talleres Afiliados</p>
          </div>
          <div>
            <div class="text-4xl md:text-6xl font-headline font-extrabold mb-2">15m</div>
            <p class="text-primary-fixed-dim font-medium">Respuesta Media</p>
          </div>
          <div>
            <div class="text-4xl md:text-6xl font-headline font-extrabold mb-2">99%</div>
            <p class="text-primary-fixed-dim font-medium">Diagnósticos Correctos</p>
          </div>
          <div>
            <div class="text-4xl md:text-6xl font-headline font-extrabold mb-2">4.9/5</div>
            <p class="text-primary-fixed-dim font-medium">Calificación App Store</p>
          </div>
        </div>
      </div>
      <div
        class="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"
      ></div>
    </section>

    <!-- Final CTA -->
    <section class="py-32 bg-surface text-center overflow-hidden">
      <div class="max-w-3xl mx-auto px-6 relative">
        <div class="mb-12">
          <h2 class="font-headline text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            El futuro de la asistencia <span class="text-primary">ya está aquí.</span>
          </h2>
          <p class="text-xl text-on-surface-variant mb-10">
            Únete a la red de CeroEspera y transforma la manera en que enfrentas los imprevistos en el camino.
          </p>
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <button
              class="bg-gradient-to-r from-primary to-primary-container text-white px-10 py-5 rounded-full font-bold text-xl shadow-2xl hover:scale-105 transition-transform"
            >
              Unirme como Conductor
            </button>
            <button
              (click)="irARegistroTaller()"
              class="bg-white border-2 border-primary text-primary px-10 py-5 rounded-full font-bold text-xl hover:bg-primary-fixed transition-all"
            >
              Registrar mi Taller
            </button>
          </div>
        </div>
        <!-- Background branding -->
        <div
          class="text-[12rem] font-extrabold text-primary opacity-[0.03] absolute -bottom-20 left-1/2 -translate-x-1/2 select-none pointer-events-none"
        >
          CEROESPERA
        </div>
      </div>
    </section>

    <!-- Footer -->
    <app-footer></app-footer>
  `,
  styles: [
    `
      .status-pulse {
        position: relative;
      }

      .status-pulse::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 9999px;
        background: #ff8f06;
        opacity: 0.4;
        z-index: -1;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          transform: scale(1);
          opacity: 0.4;
        }
        50% {
          transform: scale(1.15);
          opacity: 0;
        }
      }

      .glass-nav {
        backdrop-filter: blur(20px);
      }
    `,
  ],
})
export class LandingPage implements OnInit {
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
