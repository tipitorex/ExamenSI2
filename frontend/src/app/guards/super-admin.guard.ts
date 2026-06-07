import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Verificar si está autenticado
    if (!this.authService.estaAutenticado()) {
      console.log('🔒 Guard: Usuario no autenticado');
      this.router.navigate(['/iniciar-sesion']);
      return false;
    }

    // Verificar si es Super Admin
    if (!this.authService.esSuperAdmin()) {
      console.log('🔒 Guard: Usuario no es Super Admin');
      this.router.navigate(['/dashboard']);
      return false;
    }

    console.log('✅ Guard: Acceso permitido a Super Admin');
    return true;
  }
}