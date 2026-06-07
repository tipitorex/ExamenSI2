import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuscripcionService, PlanInfo } from '../../services/suscripcion.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-configuracion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-configuracion.component.html',
  styleUrl: './dashboard-configuracion.component.scss',
})
export class DashboardConfiguracionComponent implements OnInit {
  planInfo: PlanInfo | null = null;
  cargandoPlan = true;
  upgrading = false;

  constructor(
    private suscripcionService: SuscripcionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('🔍 [INIT] Iniciando componente de configuración');
    
    const sessionIdPendiente = sessionStorage.getItem('stripe_session_id');
    console.log('🔍 [INIT] Session ID pendiente:', sessionIdPendiente);
    
    this.cargarPlanInfo();
    this.verificarPagoDespuesRedireccion();
  }

  cargarPlanInfo(): void {
    this.cargandoPlan = true;
    console.log('📡 [PLAN] Obteniendo información del plan...');
    
    this.suscripcionService.obtenerMiPlan().subscribe({
      next: (data) => {
        console.log('📡 [PLAN] Respuesta recibida:', data);
        this.planInfo = data;
        this.cargandoPlan = false;
      },
      error: (err) => {
        console.error('❌ [PLAN] Error cargando plan:', err);
        this.cargandoPlan = false;
      },
    });
  }

  upgradeToPremium(): void {
    if (this.upgrading) return;

    this.upgrading = true;
    
    const baseUrl = window.location.origin + '/#/dashboard/configuracion';
    const successUrl = baseUrl + '?pago_exitoso=true';
    const cancelUrl = baseUrl + '?pago_cancelado=true';

    console.log('✅ [UPGRADE] Success URL:', successUrl);
    console.log('✅ [UPGRADE] Cancel URL:', cancelUrl);

    this.suscripcionService.crearCheckout(2, successUrl, cancelUrl).subscribe({
      next: (response) => {
        console.log('📡 [UPGRADE] Session ID recibido:', response.session_id);
        
        sessionStorage.setItem('stripe_session_id', response.session_id);
        
        const verificado = sessionStorage.getItem('stripe_session_id');
        console.log('✅ [UPGRADE] Session ID guardado en sessionStorage. Verificado:', verificado);
        
        window.location.href = response.checkout_url;
      },
      error: (err) => {
        console.error('❌ [UPGRADE] Error creando checkout:', err);
        this.upgrading = false;
        alert('Error al procesar el pago. Intenta nuevamente.');
      },
    });
  }

  verificarPagoDespuesRedireccion(): void {
    const url = window.location.href;
    console.log('📍 [VERIFY] URL actual:', url);
    
    const tienePagoExitoso = url.includes('pago_exitoso=true');
    const tienePagoCancelado = url.includes('pago_cancelado=true');
    
    const sessionId = sessionStorage.getItem('stripe_session_id');
    // ✅ CORREGIDO: usar 'token' en lugar de 'token_taller'
    const token = localStorage.getItem('token');

    console.log('🔍 [VERIFY] token existe?', !!token);
    console.log('🔍 [VERIFY] pago_exitoso:', tienePagoExitoso);
    console.log('🔍 [VERIFY] pago_cancelado:', tienePagoCancelado);
    console.log('🔍 [VERIFY] sessionId guardado:', sessionId);

    if (tienePagoExitoso && sessionId) {
      console.log('✅ [VERIFY] Condición cumplida, procediendo a verificar pago');
      
      if (!token) {
        console.error('❌ [VERIFY] No hay token de autenticación');
        this.authService.obtenerPerfil().subscribe({
          next: () => {
            console.log('✅ [VERIFY] Sesión recuperada, reintentando verificación');
            this.reintentarVerificacionPago(sessionId);
          },
          error: () => {
            alert('Tu sesión expiró. Por favor inicia sesión nuevamente.');
            window.location.href = window.location.origin + '/#/iniciar-sesion';
          }
        });
        return;
      }

      console.log('✅ [VERIFY] Verificando pago con sessionId:', sessionId);
      
      this.suscripcionService.verificarPago(sessionId).subscribe({
        next: (response) => {
          console.log('📡 [VERIFY] Respuesta del backend:', response);
          if (response.pagado) {
            alert(response.mensaje);
            this.cargarPlanInfo();
          } else {
            alert(response.mensaje);
          }
          sessionStorage.removeItem('stripe_session_id');
          window.location.href = window.location.origin + '/#/dashboard/configuracion';
        },
        error: (err) => {
          console.error('❌ [VERIFY] Error verificando pago:', err);
          alert('Error al verificar el pago. Contacta a soporte.');
          sessionStorage.removeItem('stripe_session_id');
          window.location.href = window.location.origin + '/#/dashboard/configuracion';
        }
      });
    } else if (tienePagoCancelado) {
      console.log('⚠️ [VERIFY] Pago cancelado por el usuario');
      alert('El pago fue cancelado. Puedes intentarlo nuevamente cuando quieras.');
      window.location.href = window.location.origin + '/#/dashboard/configuracion';
    } else {
      console.log('ℹ️ [VERIFY] No hay pago pendiente para verificar');
    }
  }

  reintentarVerificacionPago(sessionId: string): void {
    console.log('🔄 [RETRY] Reintentando verificación en 1 segundo...');
    
    setTimeout(() => {
      // ✅ CORREGIDO: usar 'token' en lugar de 'token_taller'
      const nuevoToken = localStorage.getItem('token');
      console.log('🔍 [RETRY] Token después de reintento:', !!nuevoToken);
      
      if (nuevoToken) {
        this.suscripcionService.verificarPago(sessionId).subscribe({
          next: (response) => {
            console.log('📡 [RETRY] Respuesta:', response);
            if (response.pagado) {
              alert(response.mensaje);
              this.cargarPlanInfo();
            }
            sessionStorage.removeItem('stripe_session_id');
            window.location.href = window.location.origin + '/#/dashboard/configuracion';
          },
          error: (err) => {
            console.error('❌ [RETRY] Error:', err);
            sessionStorage.removeItem('stripe_session_id');
            window.location.href = window.location.origin + '/#/dashboard/configuracion';
          }
        });
      } else {
        console.error('❌ [RETRY] No se pudo recuperar el token');
        window.location.href = window.location.origin + '/#/iniciar-sesion';
      }
    }, 1000);
  }
}