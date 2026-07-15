import { Component, OnInit, Input, OnDestroy, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { MinicartService } from '../../../services/minicartService.service';

@Component({
  selector: 'app-size-guide-modal',
  templateUrl: './size-guide-modal.component.html',
  styleUrls: ['./size-guide-modal.component.css']
})
export class SizeGuideModalComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {

  @Input() product_selected: any;
  @Input() sizeGuides: any;
  @Input() sizeGuideUIState: any = {
    availableUnits: ['cm', 'inches'],
    activeUnit: 'cm',
    activeTab: 'product_measure'
  };
  @Input() sizeGuideTabs: any;
  // processedSizeTables se genera internamente
  processedSizeTables: any[] = [];
  @Input() variedad_selected: any;

  constructor(
    private minicartService: MinicartService,
    private router: Router
  ) {
    // Cerrar modal en navegación
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.closeSizeGuideModal();
      }
    });
  }

  ngOnInit(): void {
    // Asegurar que sizeGuideUIState tenga valores por defecto
    if (!this.sizeGuideUIState) {
      this.sizeGuideUIState = {
        availableUnits: ['cm', 'inches'],
        activeUnit: 'cm',
        activeTab: 'product_measure'
      };
    }
    // Usar setTimeout para asegurar que los datos estén disponibles
    setTimeout(() => {
      this.updateProcessedSizeTables();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reaccionar a cambios en los inputs
    if (changes['sizeGuides'] || changes['sizeGuideUIState']) {
      this.updateProcessedSizeTables();
    }
  }

  ngAfterViewInit(): void {
    // Ejecutar después de que la vista esté inicializada
    // Esto se ejecuta después de ngOnInit y asegura que los datos estén disponibles
    setTimeout(() => {
      this.updateProcessedSizeTables();
    }, 100);
  }

  ngOnDestroy(): void {
    this.closeSizeGuideModal();
  }

  /**
   * Verifica si hay guías de tallas disponibles
   */
  hasSizeGuides(): boolean {
    return !!(this.sizeGuides && this.sizeGuides.size_tables && this.sizeGuides.size_tables.length > 0);
  }

  /**
   * Obtiene la lista de tallas disponibles
   */
  getAvailableSizes(): string[] {
    return this.sizeGuides?.available_sizes || [];
  }

  /**
   * Cambio de unidad en la guía de tallas
   */
  onSizeGuideUnitChange(unit: string): void {
    if (this.sizeGuideUIState) {
      this.sizeGuideUIState.activeUnit = unit;
      this.updateProcessedSizeTables();
    }
  }

  /**
   * Cambio de tab en la guía de tallas
   */
  onSizeGuideTabChange(tab: string): void {
    if (this.sizeGuideUIState) {
      this.sizeGuideUIState.activeTab = tab;
      this.updateProcessedSizeTables();
    }
  }

  /**
   * Actualiza las tablas procesadas según el tab y unidad activos
   */
  private updateProcessedSizeTables(): void {
    if (!this.sizeGuides || !this.sizeGuides.size_tables) {
      this.processedSizeTables = [];
      return;
    }

    // Filtrar tablas por tipo y unidad
    const filteredTables = this.sizeGuides.size_tables.filter((table: any) => 
      table.type === this.sizeGuideUIState.activeTab && 
      (table.unit === this.sizeGuideUIState.activeUnit || table.unit === 'none')
    );

    // Procesar tablas para mostrar
    this.processedSizeTables = filteredTables.map((table: any) => ({
      ...table,
      measurements: table.measurements.map((measurement: any) => ({
        ...measurement,
        values: measurement.values.map((value: any) => ({
          ...value,
          displayValue: this.formatSizeValue(value),
          isRange: !!(value.min_value && value.max_value)
        }))
      })),
      hasRangeValues: table.measurements.some((m: any) => 
        m.values.some((v: any) => v.min_value && v.max_value)
      ),
      hasSingleValues: table.measurements.some((m: any) => 
        m.values.some((v: any) => v.value && !v.min_value && !v.max_value)
      )
    }));
  }

  /**
   * Formatea un valor de talla para mostrar
   */
  private formatSizeValue(value: { value?: string; min_value?: string; max_value?: string; }): string {
    if (value.min_value && value.max_value) {
      return `${value.min_value} - ${value.max_value}`;
    }
    if (value.value) {
      return value.value;
    }
    return '';
  }

  /**
   * Cierra el modal de guía de tallas
   */
  closeSizeGuideModal(): void {
    this.minicartService.closeSizeGuideModal();
  }

  /**
   * TrackBy function for ngFor optimization
   */
  trackByFn(index: number, item: any): any {
    return item?.key || item?.value?.key || index;
  }

  /**
   * Helper methods for template type safety
   */
  getTabKey(tabValue: unknown): string {
    return (tabValue as any)?.key || '';
  }

  getTabTitle(tabValue: unknown): string {
    return (tabValue as any)?.title || '';
  }

  isTabActive(tabValue: unknown): boolean {
    return (tabValue as any)?.key === this.sizeGuideUIState?.activeTab;
  }

  isTabAvailable(tabValue: unknown): boolean {
    return (tabValue as any)?.available === true;
  }
}