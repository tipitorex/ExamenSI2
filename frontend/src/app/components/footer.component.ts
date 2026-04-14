import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="w-full py-12 px-6 bg-slate-50 dark:bg-slate-950">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
        <!-- Marca -->
        <div class="md:col-span-1">
          <div class="font-['Manrope'] font-bold text-slate-900 dark:text-white text-xl mb-4">
            CeroEspera
          </div>
          <p class="text-slate-500 dark:text-slate-400 font-['Inter'] text-sm leading-relaxed mb-6">
            Asistencia vehicular sin espera. Diagnóstico IA instantáneo, rescate inteligente.
          </p>
        </div>

        <!-- Plataforma -->
        <div>
          <h5 class="font-bold text-slate-900 dark:text-white mb-4">Plataforma</h5>
          <ul class="space-y-3 font-['Inter'] text-sm">
            <li>
              <a
                href="#"
                class="text-slate-500 dark:text-slate-400 hover:text-blue-700 transition-colors"
              >
                Cómo funciona
              </a>
            </li>
            <li>
              <a
                href="#"
                class="text-slate-500 dark:text-slate-400 hover:text-blue-700 transition-colors"
              >
                Para Conductores
              </a>
            </li>
            <li>
              <a
                href="#"
                class="text-slate-500 dark:text-slate-400 hover:text-blue-700 transition-colors"
              >
                Para Talleres
              </a>
            </li>
          </ul>
        </div>

        <!-- Empresa -->
        <div>
          <h5 class="font-bold text-slate-900 dark:text-white mb-4">Empresa</h5>
          <ul class="space-y-3 font-['Inter'] text-sm">
            <li>
              <a
                href="#"
                class="text-slate-500 dark:text-slate-400 hover:text-blue-700 transition-colors"
              >
                Soporte 24/7
              </a>
            </li>
            <li>
              <a
                href="#"
                class="text-slate-500 dark:text-slate-400 hover:text-blue-700 transition-colors"
              >
                Privacidad
              </a>
            </li>
            <li>
              <a
                href="#"
                class="text-slate-500 dark:text-slate-400 hover:text-blue-700 transition-colors"
              >
                Términos de Uso
              </a>
            </li>
          </ul>
        </div>

        <!-- Legal -->
        <div>
          <h5 class="font-bold text-slate-900 dark:text-white mb-4">Legal</h5>
          <p class="text-slate-500 dark:text-slate-400 font-['Inter'] text-sm leading-relaxed">
            © 2024 CeroEspera. Todos los derechos reservados.
          </p>
          <div class="flex gap-4 mt-6">
            <span class="material-symbols-outlined text-slate-400 hover:text-primary cursor-pointer transition-colors"
              >language</span
            >
            <span class="material-symbols-outlined text-slate-400 hover:text-primary cursor-pointer transition-colors"
              >verified_user</span
            >
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class AppFooterComponent {}
