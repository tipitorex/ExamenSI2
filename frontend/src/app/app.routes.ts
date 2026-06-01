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
import { DashboardDetalleEmergenciaComponent } from './pages/dashboard/dashboard-detalle-emergencia.component';
import { DashboardFacturacionComponent } from './pages/dashboard/dashboard-facturacion.component'; // NUEVA IMPORTACIÓN
import { DashboardDetalleFacturaComponent } from './pages/dashboard/dashboard-detalle-factura.component';
import { DashboardReportesComponent } from './pages/dashboard/dashboard-reportes.component';
import { SuperAdminLoginComponent } from './pages/super-admin-login.component';
import { SuperAdminComponent } from './pages/super-admin.component';
import { SuperAdminTenantsComponent } from './pages/super-admin-tenants.component';

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
        path: 'reportes',
        component: DashboardReportesComponent,
      },
      {
        path: 'emergencias-activas',
        component: DashboardEmergenciasComponent,
      },
      {
        path: 'emergencia/:id',
        component: DashboardDetalleEmergenciaComponent,
      },
      {
        path: 'mapa-operaciones',
        component: DashboardMapaComponent,
      },
      {
        path: 'facturacion',  // NUEVA RUTA para facturación
        component: DashboardFacturacionComponent,
      },
      {
        path: 'factura/:id',
        component: DashboardDetalleFacturaComponent,
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
    path: 'super-admin/iniciar-sesion',
    component: SuperAdminLoginComponent,
  },
  {
    path: 'super-admin',
    component: SuperAdminComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'tenants',
      },
      {
        path: 'tenants',
        component: SuperAdminTenantsComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];