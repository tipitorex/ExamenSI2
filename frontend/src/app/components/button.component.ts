import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [class]="getButtonClasses()"
      [disabled]="disabled"
      [type]="type"
    >
      @if (icono) {
        <span class="material-symbols-outlined" [attr.data-icon]="icono">
          {{ icono }}
        </span>
      }
      <slot></slot>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    button {
      font-family: 'Manrope', sans-serif;
      font-weight: 600;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 150ms ease-in-out;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:active:not(:disabled) {
        transform: scale(0.95);
      }
    }

    .material-symbols-outlined {
      font-size: 1.25rem;
      vertical-align: middle;
    }
  `],
})
export class AppButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() icono: string | null = null;

  getButtonClasses(): string {
    const baseClasses = 'px-4 py-2 rounded-lg font-bold transition-all active:scale-95';

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg hover:shadow-xl',
      secondary: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
      outline: 'bg-surface-container-high text-on-surface border border-outline hover:bg-surface-container-highest',
      danger: 'bg-error text-on-error hover:bg-error/80 shadow-lg',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return `${baseClasses} ${variantClasses[this.variant]} ${sizeClasses[this.size]}`;
  }
}
