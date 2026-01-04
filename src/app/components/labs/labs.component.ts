import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Module, ModulesService } from 'src/app/services/modules.service';

@Component({
  selector: 'app-labs',
  templateUrl: './labs.component.html',
  styleUrls: ['./labs.component.css']
})
export class LabsComponent implements OnInit {
  modules: Module[] = [];
  filteredModules: Module[] = [];
  isLoading = true;
  selectedType: string = 'all';

  constructor(
    private modulesService: ModulesService,
    private router: Router,
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.setupSEO();
    this.loadModules();
  }

  /**
   * Configura SEO para la página de Labs
   */
  private setupSEO(): void {
    this.title.setTitle('Labs - Experimentos y proyectos | LujanDev');
    this.meta.updateTag({ 
      name: 'description', 
      content: 'Descubre nuestros experimentos en desarrollo: productos digitales, servicios y proyectos innovadores.' 
    });
  }

  /**
   * Carga todos los módulos activos
   */
  loadModules(): void {
    this.isLoading = true;
    
    this.modulesService.getActiveModules().subscribe({
      next: (modules) => {
        // Filtrar el módulo de Merch si existe (key puede ser 'printful' o 'printful-merch')
        this.modules = modules.filter(m => m.key !== 'printful' && m.key !== 'printful-merch');
        this.filteredModules = [...this.modules];
        
        // 🐛 Debug: Ver qué iconos están llegando
        console.log('📦 Módulos cargados:', this.modules.map(m => ({ 
          name: m.name, 
          icon: m.icon, 
          iconClass: 'fas ' + m.icon 
        })));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading modules:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Filtra módulos por tipo
   */
  filterByType(type: string): void {
    this.selectedType = type;
    
    if (type === 'all') {
      this.filteredModules = [...this.modules];
    } else {
      this.filteredModules = this.modules.filter(m => m.type === type);
    }
  }

  /**
   * Navega al detalle del módulo
   */
  goToModule(moduleKey: string): void {
    this.router.navigate([`/${moduleKey}`]);
  }

  /**
   * Navega a la home
   */
  goToHome(): void {
    this.router.navigate(['/es/es/home']);
  }

  /**
   * Retorna la clase CSS del badge según el tipo
   */
  getTypeBadgeClass(type: string): string {
    return this.modulesService.getTypeBadgeClass(type);
  }

  /**
   * Retorna el label del tipo en español
   */
  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      physical: 'Físico',
      digital: 'Digital',
      service: 'Servicio'
    };
    return labels[type] || type;
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
