import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Module, ModuleDetailResponse, ModulesService } from 'src/app/services/modules.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { DynamicRouterService } from 'src/app/services/dynamic-router.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private meta: Meta,
    public modulesService: ModulesService,
    private authService: AuthService,
    private dynamicRouter: DynamicRouterService
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
      modulePrice: this.module.price_base,
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
}
