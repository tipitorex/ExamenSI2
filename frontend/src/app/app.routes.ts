import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing.component';
import { PricingPage } from './pages/pricing.component';
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
import { DashboardFacturacionComponent } from './pages/dashboard/dashboard-facturacion.component';
import { DashboardDetalleFacturaComponent } from './pages/dashboard/dashboard-detalle-factura.component';
import { DashboardReportesComponent } from './pages/dashboard/dashboard-reportes.component';
import { DashboardServiciosComponent } from './pages/dashboard/dashboard-servicios.component';
import { TrackingTecnicoComponent } from './pages/dashboard/tracking-tecnico.component';

// ============================================================
// IMPORTACIONES DEL SUPER ADMIN
// ============================================================
import { SuperAdminDashboardComponent } from './pages/super-admin/super-admin-dashboard.component';
import { SuperAdminInicioComponent } from './pages/super-admin/super-admin-inicio.component';
import { SuperAdminTalleresComponent } from './pages/super-admin/super-admin-talleres.component';
import { SuperAdminPlanesComponent } from './pages/super-admin/super-admin-planes.component';
import { SuperAdminPagosComponent } from './pages/super-admin/super-admin-pagos.component';
import { SuperAdminGuard } from './guards/super-admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
  },
  {
    path: 'planes',
    component: PricingPage,
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
        path: 'facturacion',
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
      {
        path: 'servicios',
        component: DashboardServiciosComponent,
      },
      {
        path: 'tracking/:id',
        component: TrackingTecnicoComponent,
      },
    ],
  },
  // ============================================================
  // RUTAS DEL SUPER ADMIN
  // ============================================================
  {
    path: 'super-admin',
    component: SuperAdminDashboardComponent,
    canActivate: [SuperAdminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        component: SuperAdminInicioComponent,
      },
      {
        path: 'talleres',
        component: SuperAdminTalleresComponent,
      },
      {
        path: 'planes',
        component: SuperAdminPlanesComponent,
      },
      {
        path: 'pagos',
        component: SuperAdminPagosComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];