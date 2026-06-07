import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResenasService, ResenaRespuesta, RankingTallerItem } from '../../services/resenas.service';

@Component({
  selector: 'app-super-admin-opiniones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="opiniones-container">
      <header class="opiniones-header">
        <div>
          <h1 class="page-title">Opiniones y Ranking</h1>
          <p class="page-subtitle">Calificaciones de los clientes sobre talleres y técnicos</p>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" [class.tab-active]="tab === 'ranking'" (click)="tab = 'ranking'">
          <span class="material-symbols-outlined">leaderboard</span>
          Ranking de Talleres
        </button>
        <button class="tab" [class.tab-active]="tab === 'resenas'" (click)="tab = 'resenas'">
          <span class="material-symbols-outlined">reviews</span>
          Todas las Reseñas
        </button>
      </div>

      <!-- RANKING -->
      <div *ngIf="tab === 'ranking'">
        <div *ngIf="cargandoRanking" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando ranking...</p>
        </div>

        <div *ngIf="!cargandoRanking && ranking.length === 0" class="empty-state">
          <span class="material-symbols-outlined empty-icon">sentiment_neutral</span>
          <p>Aún no hay reseñas registradas</p>
        </div>

        <div *ngIf="!cargandoRanking && ranking.length > 0" class="ranking-grid">
          <div *ngFor="let item of ranking; let i = index" class="ranking-card" [class.top-3]="i < 3">
            <div class="ranking-pos">
              <span *ngIf="i === 0" class="medal gold">🥇</span>
              <span *ngIf="i === 1" class="medal silver">🥈</span>
              <span *ngIf="i === 2" class="medal bronze">🥉</span>
              <span *ngIf="i >= 3" class="pos-num">#{{ i + 1 }}</span>
            </div>
            <div class="ranking-info">
              <p class="taller-nombre">{{ item.taller_nombre }}</p>
              <p class="total-resenas">{{ item.total_resenas }} {{ item.total_resenas === 1 ? 'reseña' : 'reseñas' }}</p>
            </div>
            <div class="ranking-scores">
              <div class="score-block">
                <span class="score-label">Taller</span>
                <div class="stars">
                  <span *ngFor="let s of getEstrellas(item.promedio_puntuacion)" class="star" [class.filled]="s">★</span>
                </div>
                <span class="score-num">{{ item.promedio_puntuacion | number:'1.1-1' }}</span>
              </div>
              <div *ngIf="item.promedio_tecnico" class="score-block">
                <span class="score-label">Técnico</span>
                <div class="stars">
                  <span *ngFor="let s of getEstrellas(item.promedio_tecnico)" class="star" [class.filled]="s">★</span>
                </div>
                <span class="score-num">{{ item.promedio_tecnico | number:'1.1-1' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RESEÑAS -->
      <div *ngIf="tab === 'resenas'">
        <div class="filtros">
          <input
            type="text"
            class="buscador"
            placeholder="Buscar por taller, técnico o cliente..."
            [(ngModel)]="busqueda"
          />
          <span class="total-badge">{{ resenasFiltradas.length }} reseñas</span>
        </div>

        <div *ngIf="cargandoResenas" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando reseñas...</p>
        </div>

        <div *ngIf="!cargandoResenas && resenasFiltradas.length === 0" class="empty-state">
          <span class="material-symbols-outlined empty-icon">sentiment_neutral</span>
          <p>Sin reseñas que mostrar</p>
        </div>

        <div *ngIf="!cargandoResenas" class="resenas-lista">
          <div *ngFor="let r of resenasFiltradas" class="resena-card">
            <div class="resena-header">
              <div class="resena-meta">
                <span class="resena-taller">
                  <span class="material-symbols-outlined" style="font-size:14px">business</span>
                  {{ r.taller_nombre || 'Taller #' + r.taller_id }}
                </span>
                <span class="resena-sep">·</span>
                <span class="resena-cliente">
                  <span class="material-symbols-outlined" style="font-size:14px">person</span>
                  {{ r.cliente_nombre || 'Cliente' }}
                </span>
                <span *ngIf="r.tecnico_nombre" class="resena-sep">·</span>
                <span *ngIf="r.tecnico_nombre" class="resena-tecnico">
                  <span class="material-symbols-outlined" style="font-size:14px">engineering</span>
                  {{ r.tecnico_nombre }}
                </span>
              </div>
              <span class="resena-fecha">{{ formatFecha(r.creado_en) }}</span>
            </div>

            <div class="resena-puntuaciones">
              <div class="punt-item">
                <span class="punt-label">Taller</span>
                <div class="stars-sm">
                  <span *ngFor="let s of getEstrellas(r.puntuacion_taller)" class="star-sm" [class.filled]="s">★</span>
                </div>
                <span class="punt-num">{{ r.puntuacion_taller }}/5</span>
              </div>
              <div *ngIf="r.puntuacion_tecnico" class="punt-item">
                <span class="punt-label">Técnico</span>
                <div class="stars-sm">
                  <span *ngFor="let s of getEstrellas(r.puntuacion_tecnico)" class="star-sm" [class.filled]="s">★</span>
                </div>
                <span class="punt-num">{{ r.puntuacion_tecnico }}/5</span>
              </div>
            </div>

            <p *ngIf="r.comentario" class="resena-comentario">"{{ r.comentario }}"</p>
            <p *ngIf="!r.comentario" class="resena-sin-comentario">Sin comentario</p>

            <div class="resena-footer">
              <span class="incidente-badge">Incidente #{{ r.incidente_id }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .opiniones-container { padding: 0; }

    .opiniones-header {
      margin-bottom: 1.5rem;
    }
    .page-title { margin: 0; font-size: 1.6rem; font-weight: 800; color: #132237; }
    .page-subtitle { margin: 0.25rem 0 0; color: #607893; font-size: 0.9rem; }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #e0e7ef;
      padding-bottom: 0;
    }
    .tab {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      border: 0;
      background: none;
      padding: 0.7rem 1.2rem;
      font-weight: 600;
      color: #607893;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }
    .tab:hover { color: #005ea4; }
    .tab-active { color: #005ea4; border-bottom-color: #005ea4; }

    /* Ranking */
    .ranking-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }
    .ranking-card {
      background: #fff;
      border: 1px solid #e0e7ef;
      border-radius: 1rem;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: box-shadow 0.2s;
    }
    .ranking-card:hover { box-shadow: 0 4px 16px rgba(0,94,164,0.1); }
    .ranking-card.top-3 { border-color: #0077ce; background: #f0f7ff; }
    .ranking-pos { min-width: 40px; text-align: center; }
    .medal { font-size: 1.8rem; }
    .pos-num { font-size: 1.2rem; font-weight: 800; color: #607893; }
    .ranking-info { flex: 1; }
    .taller-nombre { margin: 0; font-weight: 700; color: #132237; font-size: 1rem; }
    .total-resenas { margin: 0.2rem 0 0; font-size: 0.8rem; color: #607893; }
    .ranking-scores { display: flex; flex-direction: column; gap: 0.4rem; }
    .score-block { display: flex; align-items: center; gap: 0.4rem; }
    .score-label { font-size: 0.75rem; color: #607893; min-width: 44px; }
    .stars { display: flex; gap: 2px; }
    .star { color: #ddd; font-size: 14px; }
    .star.filled { color: #f59e0b; }
    .score-num { font-size: 0.85rem; font-weight: 700; color: #132237; }

    /* Reseñas */
    .filtros {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .buscador {
      flex: 1;
      padding: 0.6rem 1rem;
      border: 1px solid #d7dde7;
      border-radius: 0.75rem;
      font-size: 0.9rem;
      outline: none;
    }
    .buscador:focus { border-color: #0077ce; }
    .total-badge {
      background: #e8f1fb;
      color: #005ea4;
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .resenas-lista { display: flex; flex-direction: column; gap: 0.75rem; }
    .resena-card {
      background: #fff;
      border: 1px solid #e0e7ef;
      border-radius: 0.9rem;
      padding: 1.25rem;
    }
    .resena-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .resena-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
    .resena-taller { color: #005ea4; font-weight: 600; display: flex; align-items: center; gap: 3px; }
    .resena-cliente { color: #44546d; display: flex; align-items: center; gap: 3px; }
    .resena-tecnico { color: #8f4e00; display: flex; align-items: center; gap: 3px; }
    .resena-sep { color: #ccc; }
    .resena-fecha { font-size: 0.75rem; color: #aab; white-space: nowrap; }
    .resena-puntuaciones { display: flex; gap: 1.5rem; margin-bottom: 0.75rem; }
    .punt-item { display: flex; align-items: center; gap: 0.4rem; }
    .punt-label { font-size: 0.75rem; color: #607893; }
    .stars-sm { display: flex; gap: 1px; }
    .star-sm { color: #ddd; font-size: 13px; }
    .star-sm.filled { color: #f59e0b; }
    .punt-num { font-size: 0.8rem; font-weight: 700; color: #132237; }
    .resena-comentario {
      margin: 0 0 0.75rem;
      color: #44546d;
      font-style: italic;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .resena-sin-comentario { margin: 0 0 0.75rem; color: #aab; font-size: 0.85rem; }
    .resena-footer { display: flex; align-items: center; gap: 0.5rem; }
    .incidente-badge {
      font-size: 0.75rem;
      background: #f0f4fa;
      color: #44546d;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 3rem;
      color: #607893;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e0e7ef;
      border-top-color: #0077ce;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 3rem;
      color: #607893;
    }
    .empty-icon { font-size: 3rem; color: #c0c7d4; }
  `]
})
export class SuperAdminOpinionesComponent implements OnInit {
  tab: 'ranking' | 'resenas' = 'ranking';
  ranking: RankingTallerItem[] = [];
  resenas: ResenaRespuesta[] = [];
  cargandoRanking = false;
  cargandoResenas = false;
  busqueda = '';

  constructor(private resenasService: ResenasService) {}

  ngOnInit(): void {
    this.cargarRanking();
    this.cargarResenas();
  }

  cargarRanking(): void {
    this.cargandoRanking = true;
    this.resenasService.getRanking().subscribe({
      next: (data) => { this.ranking = data; this.cargandoRanking = false; },
      error: () => { this.cargandoRanking = false; },
    });
  }

  cargarResenas(): void {
    this.cargandoResenas = true;
    this.resenasService.getTodas().subscribe({
      next: (data) => { this.resenas = data; this.cargandoResenas = false; },
      error: () => { this.cargandoResenas = false; },
    });
  }

  get resenasFiltradas(): ResenaRespuesta[] {
    if (!this.busqueda.trim()) return this.resenas;
    const q = this.busqueda.toLowerCase();
    return this.resenas.filter(r =>
      (r.taller_nombre ?? '').toLowerCase().includes(q) ||
      (r.tecnico_nombre ?? '').toLowerCase().includes(q) ||
      (r.cliente_nombre ?? '').toLowerCase().includes(q) ||
      (r.comentario ?? '').toLowerCase().includes(q)
    );
  }

  getEstrellas(promedio: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(promedio));
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Ahora';
    if (diff < 60) return `Hace ${diff} min`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`;
    if (diff < 10080) return `Hace ${Math.floor(diff / 1440)} días`;
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
