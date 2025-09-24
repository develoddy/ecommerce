import { Injectable } from '@angular/core';
import { ProductUIService } from './product-ui.service';

declare var $: any;
declare function pswp(jquery: any): any;
declare function productZoom(jquery: any): any;

export interface ModalConfiguration {
  modalId: string;
  showDelay?: number;
  initDelay?: number;
  enableZoom?: boolean;
  enablePswp?: boolean;
  beforeShow?: () => void;
  afterShow?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  constructor(private productUIService: ProductUIService) {}

  /**
   * Abre el modal de agregar al carrito con configuración específica
   * @param product - Producto a mostrar en el modal
   * @param onProductReady - Callback cuando el producto está listo
   * @param onVariedadesReady - Callback cuando las variedades están listas
   * @returns Objeto con el producto procesado y variedades
   */
  openModalToCart(
    product: any,
    onProductReady?: (product: any) => void,
    onVariedadesReady?: (variedades: any[], variedad_selected: any) => void
  ): Promise<{ product: any; variedades: any[]; variedad_selected: any }> {
    return new Promise((resolve) => {
      // Procesar el producto y sus galerías
      const processedProduct = this.processProductForModal(product);
      
      if (onProductReady) {
        onProductReady(processedProduct);
      }

      setTimeout(() => {
        // Filtrar y procesar variedades
        const variedades = this.filterUniqueVariedades(processedProduct);
        const variedad_selected = variedades[0] || null;

        // Procesar colores del producto
        const productWithColors = this.processProductColors(processedProduct);

        if (onVariedadesReady) {
          onVariedadesReady(variedades, variedad_selected);
        }

        // Mostrar el modal
        this.showModal('#addtocart_modal', {
          modalId: '#addtocart_modal',
          showDelay: 400,
          enableZoom: true,
          enablePswp: true
        });

        resolve({
          product: productWithColors,
          variedades,
          variedad_selected
        });
      }, 350);
    });
  }

  /**
   * Abre el modal de detalles del producto
   * @param product - Producto a mostrar
   * @param onProductReady - Callback cuando el producto está listo
   * @returns Producto procesado con variedades y colores
   */
  openProductDetailModal(
    product: any,
    onProductReady?: (product: any) => void
  ): Promise<{ product: any; variedades: any[]; variedad_selected: any }> {
    return new Promise((resolve) => {
      const processedProduct = this.processProductForModal(product);
      
      if (onProductReady) {
        onProductReady(processedProduct);
      }

      setTimeout(() => {
        // Filtrar variedades
        const variedades = this.filterUniqueVariedades(processedProduct);
        const variedad_selected = variedades[0] || null;

        // Procesar colores
        const productWithColors = this.processProductColors(processedProduct);

        // Inicializar plugins de imagen
        setTimeout(() => {
          if (typeof pswp !== 'undefined' && $) {
            pswp($);
          }
          if (typeof productZoom !== 'undefined' && $) {
            productZoom($);
          }
        }, 50);

        resolve({
          product: productWithColors,
          variedades,
          variedad_selected
        });
      }, 150);
    });
  }

  /**
   * Muestra un modal con la configuración especificada
   * @param modalSelector - Selector CSS del modal
   * @param config - Configuración del modal
   */
  private showModal(modalSelector: string, config: ModalConfiguration): void {
    setTimeout(() => {
      const modalElement = document.querySelector(config.modalId);

      // Intentar con Bootstrap nativo primero
      if (modalElement && (window as any).bootstrap) {
        const modalInstance = new (window as any).bootstrap.Modal(modalElement);
        
        modalElement.addEventListener(
          'shown.bs.modal',
          () => {
            this.initializeModalPlugins(config);
          },
          { once: true }
        );
        
        modalInstance.show();
      }
      // Fallback con jQuery
      else if ((window as any).$) {
        (window as any).$(config.modalId).on('shown.bs.modal', () => {
          this.initializeModalPlugins(config);
          (window as any).$(config.modalId).off('shown.bs.modal');
        });
        (window as any).$(config.modalId).modal('show');
      }
    }, config.showDelay || 400);
  }

  /**
   * Inicializa los plugins necesarios en el modal
   * @param config - Configuración del modal
   */
  private initializeModalPlugins(config: ModalConfiguration): void {
    if (config.enableZoom && (window as any).productZoom && $) {
      (window as any).productZoom($);
    }
    
    if (config.enablePswp && (window as any).pswp && $) {
      (window as any).pswp($);
    }

    if (config.afterShow) {
      config.afterShow();
    }
  }

  /**
   * Procesa el producto para el modal filtrando galerías únicas
   * @param product - Producto a procesar
   * @returns Producto procesado
   */
  private processProductForModal(product: any): any {
    // Filtrar galerías únicas y asignar al producto
    const uniqueGalleries = this.productUIService.filterUniqueGalerias(product);
    return {
      ...product,
      galerias: uniqueGalleries
    };
  }

  /**
   * Filtra variedades únicas disponibles
   * @param product - Producto con variedades
   * @returns Lista de variedades filtradas
   */
  private filterUniqueVariedades(product: any): any[] {
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
   * Procesa los colores disponibles del producto
   * @param product - Producto a procesar
   * @returns Producto con colores procesados
   */
  private processProductColors(product: any): any {
    if (product) {
      const processedProducts = this.productUIService.setColoresDisponibles(
        [product], [], []
      );
      return processedProducts.ourProducts[0];
    }
    return product;
  }

  /**
   * Cierra un modal específico
   * @param modalSelector - Selector CSS del modal
   */
  closeModal(modalSelector: string): void {
    const modalElement = document.querySelector(modalSelector);
    
    if (modalElement && (window as any).bootstrap) {
      const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    } else if ((window as any).$) {
      (window as any).$(modalSelector).modal('hide');
    }
  }

  /**
   * Verifica si un modal está abierto
   * @param modalSelector - Selector CSS del modal
   * @returns true si el modal está abierto
   */
  isModalOpen(modalSelector: string): boolean {
    const modalElement = document.querySelector(modalSelector);
    
    if (modalElement) {
      return modalElement.classList.contains('show');
    }
    
    return false;
  }
}