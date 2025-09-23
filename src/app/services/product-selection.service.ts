import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProductUIService } from './product/product-ui.service';

export interface ProductSelection {
  product: any;
  selectedVariedad: any;
  selectedColor: string;
  activeIndex: number;
  variedades: any[];
  filteredGallery: any[];
  firstImage: string;
  coloresDisponibles: any[];
}

export interface VariedadSelection {
  variedad: any;
  index: number;
}

export interface ColorSelection {
  color: string;
  imagen: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductSelectionService {

  private _currentSelection = new BehaviorSubject<ProductSelection | null>(null);
  public currentSelection$: Observable<ProductSelection | null> = this._currentSelection.asObservable();

  constructor(private productUIService: ProductUIService) {}

  /**
   * Inicializa la selección de un producto con sus configuraciones por defecto
   * @param product - Producto a seleccionar
   * @param coloresDisponibles - Colores disponibles del producto
   * @returns Estado inicial de selección del producto
   */
  initializeProductSelection(product: any, coloresDisponibles: any[] = []): ProductSelection {
    // Procesar variedades únicas
    const variedades = this.getUniqueVariedades(product);
    
    // Filtrar galerías únicas
    const filteredGallery = this.productUIService.filterUniqueGalerias(product);
    
    // Obtener primera imagen
    const firstImage = this.productUIService.getFirstImage(filteredGallery);
    
    // Selecciones por defecto
    const selectedVariedad = variedades[0] || null;
    const selectedColor = coloresDisponibles[0]?.color || '';
    
    const selection: ProductSelection = {
      product,
      selectedVariedad,
      selectedColor,
      activeIndex: 0,
      variedades,
      filteredGallery,
      firstImage,
      coloresDisponibles
    };

    this._currentSelection.next(selection);
    return selection;
  }

  /**
   * Obtiene variedades únicas disponibles con stock
   * @param product - Producto con variedades
   * @returns Lista de variedades filtradas y ordenadas
   */
  getUniqueVariedades(product: any): any[] {
    if (!product.variedades) {
      return [];
    }

    return product.variedades
      .filter(
        (item: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) => t.valor === item.valor && t.stock > 0)
      )
      .sort((a: any, b: any) => (a.valor > b.valor ? 1 : -1));
  }

  /**
   * Filtra variedades únicas (método alternativo para compatibilidad)
   * @param product - Producto a procesar
   */
  filterUniqueVariedades(product: any): void {
    const variedadesUnicos = new Set();
    product.variedades = product.variedades.filter(
      (variedad: any) => {
        if (variedadesUnicos.has(variedad.valor)) {
          return false;
        } else {
          variedadesUnicos.add(variedad.valor);
          return true;
        }
      }
    );
  }

  /**
   * Selecciona una variedad específica del producto
   * @param variedad - Variedad a seleccionar
   * @param index - Índice de la variedad
   * @returns Nueva selección actualizada
   */
  selectVariedad(variedad: any, index: number): ProductSelection | null {
    const currentSelection = this._currentSelection.value;
    if (!currentSelection) return null;

    const updatedSelection: ProductSelection = {
      ...currentSelection,
      selectedVariedad: variedad,
      activeIndex: index
    };

    this._currentSelection.next(updatedSelection);
    return updatedSelection;
  }

  /**
   * Selecciona un color específico del producto
   * @param color - Color a seleccionar
   * @param imagen - Imagen asociada al color (opcional)
   * @returns Nueva selección actualizada
   */
  selectColor(color: string, imagen?: string): ProductSelection | null {
    const currentSelection = this._currentSelection.value;
    if (!currentSelection) return null;

    const updatedSelection: ProductSelection = {
      ...currentSelection,
      selectedColor: color,
      firstImage: imagen || currentSelection.firstImage
    };

    this._currentSelection.next(updatedSelection);
    return updatedSelection;
  }

  /**
   * Cambia la imagen principal del producto
   * @param imagen - Nueva imagen a mostrar
   * @returns Nueva selección actualizada
   */
  changeImage(imagen: string): ProductSelection | null {
    const currentSelection = this._currentSelection.value;
    if (!currentSelection) return null;

    const updatedSelection: ProductSelection = {
      ...currentSelection,
      firstImage: imagen
    };

    this._currentSelection.next(updatedSelection);
    return updatedSelection;
  }

  /**
   * Establece el índice activo de selección
   * @param index - Nuevo índice activo
   * @returns Nueva selección actualizada
   */
  setActiveIndex(index: number): ProductSelection | null {
    const currentSelection = this._currentSelection.value;
    if (!currentSelection) return null;

    const updatedSelection: ProductSelection = {
      ...currentSelection,
      activeIndex: index
    };

    this._currentSelection.next(updatedSelection);
    return updatedSelection;
  }

  /**
   * Actualiza los colores disponibles del producto
   * @param coloresDisponibles - Lista de colores disponibles
   * @returns Nueva selección actualizada
   */
  updateColoresDisponibles(coloresDisponibles: any[]): ProductSelection | null {
    const currentSelection = this._currentSelection.value;
    if (!currentSelection) return null;

    const updatedSelection: ProductSelection = {
      ...currentSelection,
      coloresDisponibles,
      selectedColor: coloresDisponibles[0]?.color || currentSelection.selectedColor
    };

    this._currentSelection.next(updatedSelection);
    return updatedSelection;
  }

  /**
   * Procesa las galerías únicas del producto y actualiza la selección
   * @param product - Producto a procesar
   * @returns Galerías filtradas
   */
  processGalleries(product: any): any[] {
    const filteredGallery = this.productUIService.filterUniqueGalerias(product);
    const firstImage = this.productUIService.getFirstImage(filteredGallery);

    const currentSelection = this._currentSelection.value;
    if (currentSelection) {
      const updatedSelection: ProductSelection = {
        ...currentSelection,
        filteredGallery,
        firstImage
      };
      this._currentSelection.next(updatedSelection);
    }

    return filteredGallery;
  }

  /**
   * Obtiene la selección actual del producto
   * @returns Selección actual o null si no hay ninguna
   */
  getCurrentSelection(): ProductSelection | null {
    return this._currentSelection.value;
  }

  /**
   * Obtiene la variedad seleccionada actualmente
   * @returns Variedad seleccionada o null
   */
  getSelectedVariedad(): any {
    return this._currentSelection.value?.selectedVariedad || null;
  }

  /**
   * Obtiene el color seleccionado actualmente
   * @returns Color seleccionado o string vacío
   */
  getSelectedColor(): string {
    return this._currentSelection.value?.selectedColor || '';
  }

  /**
   * Obtiene el índice activo actual
   * @returns Índice activo o 0
   */
  getActiveIndex(): number {
    return this._currentSelection.value?.activeIndex || 0;
  }

  /**
   * Obtiene la imagen principal actual
   * @returns URL de la imagen principal
   */
  getFirstImage(): string {
    return this._currentSelection.value?.firstImage || '';
  }

  /**
   * Obtiene las variedades disponibles del producto
   * @returns Lista de variedades
   */
  getVariedades(): any[] {
    return this._currentSelection.value?.variedades || [];
  }

  /**
   * Obtiene las galerías filtradas del producto
   * @returns Lista de galerías filtradas
   */
  getFilteredGallery(): any[] {
    return this._currentSelection.value?.filteredGallery || [];
  }

  /**
   * Obtiene los colores disponibles del producto
   * @returns Lista de colores disponibles
   */
  getColoresDisponibles(): any[] {
    return this._currentSelection.value?.coloresDisponibles || [];
  }

  /**
   * Limpia la selección actual
   */
  clearSelection(): void {
    this._currentSelection.next(null);
  }

  /**
   * Verifica si hay una selección activa
   * @returns true si hay una selección activa
   */
  hasActiveSelection(): boolean {
    return this._currentSelection.value !== null;
  }
}