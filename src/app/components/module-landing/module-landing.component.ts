import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Module, ModuleDetailResponse, ModulesService } from 'src/app/services/modules.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { DynamicRouterService } from 'src/app/services/dynamic-router.service';
import { SaasService } from 'src/app/services/saas.service';

@Component({
  selector: 'app-module-landing',
  templateUrl: './module-landing.component.html',
  styleUrls: ['./module-landing.component.css']
})
export class ModuleLandingComponent implements OnInit {
  module!: Module;
  stats: any;
  recentSales: any[] = [];
  isLoading = true;
  isPurchasing = false;
  // 🖼️ Modal de imagen
  showImageModal = false;
  currentImageUrl = '';
  currentImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private meta: Meta,
    public modulesService: ModulesService,
    private authService: AuthService,
    private dynamicRouter: DynamicRouterService,
    private saasService: SaasService
  ) {}

  ngOnInit(): void {
    // El resolver ya cargó los datos
    this.route.data.subscribe((data: any) => {
      if (data.module) {
        this.module = data.module.module;
        this.stats = data.module.stats;
        this.recentSales = data.module.recentSales || [];
        
        // Configurar SEO
        this.setupSEO();
        
        this.isLoading = false;
      }
    });
  }

  /**
   * Configura meta tags para SEO
   */
  private setupSEO(): void {
    this.title.setTitle(`${this.module.name} | LujanDev`);
    this.meta.updateTag({ name: 'description', content: this.module.description });
    this.meta.updateTag({ property: 'og:title', content: this.module.name });
    this.meta.updateTag({ property: 'og:description', content: this.module.description });
  }

  /**
   * Determina qué template renderizar según el tipo de módulo
   */
  isPhysicalProduct(): boolean {
    return this.module.type === 'physical';
  }

  isDigitalProduct(): boolean {
    return this.module.type === 'digital';
  }

  isService(): boolean {
    return this.module.type === 'service';
  }

  /**
   * 🚀 Verifica si el módulo es tipo SaaS
   */
  isSaaSModule(): boolean {
    return this.module.type === 'saas';
  }

  /**
   * 🚀 Obtiene los planes de pricing del módulo SaaS
   */
  getSaaSPricingPlans(): any[] {
    if (!this.module.saas_config || !this.module.saas_config.pricing) {
      return [];
    }
    return this.module.saas_config.pricing;
  }

  /**
   * 🚀 Obtiene los días de trial del módulo SaaS
   */
  getTrialDays(): number {
    return this.module.saas_config?.trial_days || 14;
  }

  /**
   * Navega a la home
   */
  goToHome(): void {
    this.router.navigate(['/es/es/home']);
  }

  /**
   * Navega al catálogo de labs
   */
  goToLabs(): void {
    this.router.navigate(['/labs']);
  }

  /**
   * Inicia el proceso de compra del módulo
   */
  purchaseModule(): void {
    if (this.isPurchasing) return;

    this.isPurchasing = true;

    // Guardar información del módulo en sessionStorage para el checkout
    sessionStorage.setItem('modulePurchase', JSON.stringify({
      moduleId: this.module.id,
      moduleKey: this.module.key,
      moduleName: this.module.name,
      modulePrice: this.module.base_price,
      moduleType: this.module.type
    }));

    // Navegar al checkout (mismo flujo que Printful)
    // El checkout detectará que es compra de módulo por sessionStorage
    this.dynamicRouter.navigateWithLocale(['account', 'checkout', 'resumen'], { 
      queryParams: { 
        initialized: true, 
        from: 'module',
        moduleKey: this.module.key 
      } 
    });
  }

  /**
   * 🚀 Inicia el trial gratuito de un módulo SaaS
   */
  startSaaSTrial(plan?: any): void {
    if (this.isPurchasing) return;
    
    // Redirigir a página de registro de trial
    const queryParams: any = { module: this.module.key };
    if (plan) {
      queryParams.plan = plan.name;
    }

    this.router.navigate(['/trial/register'], { queryParams });
  }

  /**
   * Abre un screenshot en modal con zoom
   */
  openScreenshot(url: string): void {
    this.currentImageUrl = url;
    this.currentImageIndex = this.module.screenshots?.indexOf(url) || 0;
    this.showImageModal = true;
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
  }

  /**
   * Cierra el modal de imagen
   */
  closeImageModal(): void {
    this.showImageModal = false;
    this.currentImageUrl = '';
    document.body.style.overflow = 'auto';
  }

  /**
   * Navega a la imagen anterior
   */
  previousImage(): void {
    if (!this.module.screenshots || this.module.screenshots.length === 0) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.module.screenshots.length) % this.module.screenshots.length;
    this.currentImageUrl = this.module.screenshots[this.currentImageIndex];
  }

  /**
   * Navega a la siguiente imagen
   */
  nextImage(): void {
    if (!this.module.screenshots || this.module.screenshots.length === 0) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.module.screenshots.length;
    this.currentImageUrl = this.module.screenshots[this.currentImageIndex];
  }

  /**
   * Maneja errores de carga de imágenes
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/placeholder.png';
  }

  /**
   * Convertir colores Bootstrap a hexadecimales
   */
  getColorHex(color: string): string {
    const colorMap: { [key: string]: string } = {
      'primary': '#007bff',
      'success': '#28a745',
      'warning': '#ffc107',
      'danger': '#dc3545',
      'info': '#17a2b8',
      'secondary': '#6c757d',
      'dark': '#343a40'
    };
    return colorMap[color] || '#007bff';
  }
}
