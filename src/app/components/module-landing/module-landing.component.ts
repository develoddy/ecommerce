import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Module, ModuleDetailResponse, ModulesService } from 'src/app/services/modules.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private meta: Meta,
    public modulesService: ModulesService
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
}
