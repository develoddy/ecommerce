import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SaasService } from 'src/app/services/saas.service';
import { ModulesService } from 'src/app/services/modules.service';

@Component({
  selector: 'app-saas-dashboard',
  templateUrl: './saas-dashboard.component.html',
  styleUrls: ['./saas-dashboard.component.css']
})
export class SaasDashboardComponent implements OnInit {
  moduleKey: string = '';
  module: any = null;
  tenant: any = null;
  isLoading = true;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private saasService: SaasService,
    private modulesService: ModulesService
  ) {}

  ngOnInit(): void {
    // Obtener el módulo desde la ruta
    this.route.params.subscribe(params => {
      this.moduleKey = params['moduleKey'];
      this.loadDashboardData();
    });
  }

  /**
   * Cargar datos del dashboard
   */
  loadDashboardData(): void {
    // Cargar perfil del tenant
    this.saasService.getProfile().subscribe({
      next: (response) => {
        if (response.success) {
          this.tenant = response.tenant;
          
          // Verificar que el tenant tenga acceso
          if (!this.tenant.has_access) {
            this.error = 'Tu suscripción ha expirado';
            this.isLoading = false;
            return;
          }

          // Verificar que el módulo coincida
          if (this.tenant.module_key !== this.moduleKey) {
            this.error = 'No tienes acceso a este módulo';
            this.isLoading = false;
            return;
          }

          // Cargar información del módulo
          this.loadModule();
        }
      },
      error: (error) => {
        console.error('Error loading tenant profile:', error);
        this.error = 'Error al cargar tu perfil';
        this.isLoading = false;
      }
    });
  }

  /**
   * Cargar información del módulo
   */
  loadModule(): void {
    this.modulesService.getModuleByKey(this.moduleKey).subscribe({
      next: (response) => {
        if (response.module) {
          this.module = response.module;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading module:', error);
        this.error = 'Error al cargar el módulo';
        this.isLoading = false;
      }
    });
  }

  /**
   * Obtener mensaje de estado de la suscripción
   */
  getStatusMessage(): string {
    if (!this.tenant) return '';

    if (this.tenant.is_on_trial) {
      return `Trial - ${this.tenant.days_remaining} días restantes`;
    }

    if (this.tenant.status === 'active') {
      return `Plan ${this.tenant.plan} - Activo`;
    }

    if (this.tenant.status === 'cancelled') {
      return `Cancelado - Acceso hasta ${new Date(this.tenant.subscription_end_date).toLocaleDateString()}`;
    }

    return 'Inactivo';
  }

  /**
   * Obtener clase CSS según estado
   */
  getStatusClass(): string {
    if (!this.tenant) return 'bg-secondary';

    if (this.tenant.is_on_trial) return 'bg-info';
    if (this.tenant.status === 'active') return 'bg-success';
    if (this.tenant.status === 'cancelled') return 'bg-warning';
    
    return 'bg-danger';
  }

  /**
   * Navegar a upgrade/suscripción
   */
  upgradePlan(): void {
    // TODO: Implementar flujo de upgrade con Stripe
    alert('Funcionalidad de upgrade próximamente disponible');
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    this.saasService.logout();
    this.router.navigate(['/labs', this.moduleKey]);
  }
}
