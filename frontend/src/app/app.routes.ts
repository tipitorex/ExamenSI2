import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing.component';
import { DashboardComponent } from './pages/dashboard.component';
import { RegistroTallerComponent } from './pages/registro-taller.component';
import { IniciarSesionComponent } from './pages/iniciar-sesion.component';
import { DashboardInicioComponent } from './pages/dashboard/dashboard-inicio.component';
import { DashboardEmergenciasComponent } from './pages/dashboard/dashboard-emergencias.component';
import { DashboardMapaComponent } from './pages/dashboard/dashboard-mapa.component';
import { DashboardHistorialComponent } from './pages/dashboard/dashboard-historial.component';
import { DashboardConfiguracionComponent } from './pages/dashboard/dashboard-configuracion.component';
import { DashboardTecnicosComponent } from './pages/dashboard/dashboard-tecnicos.component';
import { DashboardDetalleEmergenciaComponent } from './pages/dashboard/dashboard-detalle-emergencia.component'; // NUEVA IMPORTACIÓN

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio',
      },
      {
        path: 'inicio',
        component: DashboardInicioComponent,
      },
      {
        path: 'tecnicos',
        component: DashboardTecnicosComponent,
      },
      {
        path: 'emergencias-activas',
        component: DashboardEmergenciasComponent,
      },
      {
        path: 'emergencia/:id',  // NUEVA RUTA para ver detalle
        component: DashboardDetalleEmergenciaComponent,
      },
      {
        path: 'mapa-operaciones',
        component: DashboardMapaComponent,
      },
      {
        path: 'historial',
        component: DashboardHistorialComponent,
      },
      {
        path: 'configuracion',
        component: DashboardConfiguracionComponent,
      },
    ],
  },
  {
    path: 'iniciar-sesion',
    component: IniciarSesionComponent,
  },
  {
    path: 'registro-taller',
    component: RegistroTallerComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];