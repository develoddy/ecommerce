import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductDisplayService {

  // Estados reactivos para el manejo de productos
  private productSubject = new BehaviorSubject<any>(null);
  public product$ = this.productSubject.asObservable();

  private coloresDisponiblesSubject = new BehaviorSubject<any[]>([]);
  public coloresDisponibles$ = this.coloresDisponiblesSubject.asObservable();

  private selectedColorSubject = new BehaviorSubject<any>(null);
  public selectedColor$ = this.selectedColorSubject.asObservable();

  private selectedSizeSubject = new BehaviorSubject<any>(null);
  public selectedSize$ = this.selectedSizeSubject.asObservable();

  private uniqueGaleriasSubject = new BehaviorSubject<any[]>([]);
  public uniqueGalerias$ = this.uniqueGaleriasSubject.asObservable();

  constructor() { }

  /**
   * Establece el producto actual y actualiza estados relacionados
   */
  setProduct(product: any): void {
    this.productSubject.next(product);
    if (product) {
      this.setColoresDisponibles(product);
      this.filterUniqueGalerias(product);
    }
  }

  /**
   * Obtiene el producto actual
   */
  getCurrentProduct(): any {
    return this.productSubject.value;
  }

  /**
   * Calcula y establece los colores disponibles del producto
   */
  setColoresDisponibles(product: any): void {
    if (!product || !product.variedades) {
      return;
    }

    const coloresMap = new Map();
    
    product.variedades.forEach((variedad: any) => {
      // La estructura correcta es variedad.color directamente
      if (variedad.color) {
        const colorKey = variedad.color.toLowerCase();
        if (!coloresMap.has(colorKey)) {
          // Buscar imagen específica en las galerías para este color
          const galeriaConImagen = product.galerias?.find(
            (g: any) => g.color === variedad.color && g.imagen
          );
          
          coloresMap.set(colorKey, {
            color: variedad.color,
            imagen: galeriaConImagen?.imagen || product.imagen
          });
        }
      }
    });

    const colores = Array.from(coloresMap.values());
    
    this.coloresDisponiblesSubject.next(colores);
    
    // Seleccionar primer color si no hay ninguno seleccionado
    if (colores.length > 0 && !this.selectedColorSubject.value) {
      this.selectColor(colores[0]);
    }
  }

  /**
   * Selecciona un color específico
   */
  selectColor(color: { color: string; imagen: string }): void {
    this.selectedColorSubject.next(color);
  }

  /**
   * Obtiene el color actualmente seleccionado
   */
  getSelectedColor(): any {
    return this.selectedColorSubject.value;
  }

  /**
   * Selecciona una talla específica
   */
  selectSize(size: any): void {
    this.selectedSizeSubject.next(size);
  }

  /**
   * Obtiene la talla actualmente seleccionada
   */
  getSelectedSize(): any {
    return this.selectedSizeSubject.value;
  }

  /**
   * Filtra galerías únicas del producto
   */
  filterUniqueGalerias(product: any): void {
    if (!product || !product.variedades) return;

    const uniqueImages = new Map();
    
    product.variedades.forEach((variedad: any) => {
      if (variedad.imagen) {
        const imageKey = variedad.imagen;
        if (!uniqueImages.has(imageKey)) {
          uniqueImages.set(imageKey, {
            imagen: variedad.imagen,
            color: variedad.valor?.valor || 'default'
          });
        }
      }
    });

    // Agregar imagen principal si no existe
    if (product.imagen && !uniqueImages.has(product.imagen)) {
      uniqueImages.set(product.imagen, {
        imagen: product.imagen,
        color: 'principal'
      });
    }

    const galerias = Array.from(uniqueImages.values());
    this.uniqueGaleriasSubject.next(galerias);
  }

  /**
   * Obtiene las galerías únicas
   */
  getUniqueGalerias(): any[] {
    return this.uniqueGaleriasSubject.value || [];
  }

  /**
   * Calcula el precio con descuento aplicado
   */
  calculateDiscountedPrice(product: any, flashSale: any = null): number {
    if (!product) return 0;

    let basePrice = product.price_usd || product.price_soles || 0;
    
    if (flashSale) {
      if (flashSale.type_discount === 1) {
        // Descuento porcentual
        const discount = (basePrice * flashSale.discount) / 100;
        return basePrice - discount;
      } else if (flashSale.type_discount === 2) {
        // Descuento fijo
        return Math.max(0, basePrice - flashSale.discount);
      }
    }

    return basePrice;
  }

  /**
   * Obtiene el porcentaje de descuento
   */
  getDiscountPercentage(product: any, flashSale: any = null): number {
    if (!product || !flashSale) return 0;

    const originalPrice = product.price_usd || product.price_soles || 0;
    const discountedPrice = this.calculateDiscountedPrice(product, flashSale);
    
    if (originalPrice <= 0) return 0;
    
    return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
  }

  /**
   * Valida si hay stock disponible para la configuración seleccionada
   */
  validateStock(product: any, selectedColor: any, selectedSize: any): boolean {
    if (!product || !product.variedades || !selectedColor || !selectedSize) {
      return false;
    }

    return product.variedades.some((variedad: any) => 
      variedad.valor?.valor === selectedColor.color &&
      variedad.stock > 0
    );
  }

  /**
   * Obtiene las tallas disponibles para un color específico
   */
  getAvailableSizes(product: any, color: any): any[] {
    if (!product || !product.variedades || !color) return [];

    const sizes = product.variedades
      .filter((variedad: any) => 
        variedad.valor?.valor === color.color && 
        variedad.stock > 0
      )
      .map((variedad: any) => ({
        size: variedad.atributo,
        stock: variedad.stock,
        id: variedad.id
      }));

    return sizes;
  }

  /**
   * Resetea todos los estados del servicio
   */
  resetStates(): void {
    this.productSubject.next(null);
    this.coloresDisponiblesSubject.next([]);
    this.selectedColorSubject.next(null);
    this.selectedSizeSubject.next(null);
    this.uniqueGaleriasSubject.next([]);
  }
}