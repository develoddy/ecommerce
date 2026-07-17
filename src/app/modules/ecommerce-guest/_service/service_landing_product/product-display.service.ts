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
   * 🆕 Prioriza imágenes de Files (mockups) sobre galerias
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
          let imagenColor = product.imagen; // Fallback a portada

          // 🆕 Prioridad 1: Imagen de Files (preview)
          if (variedad.files && Array.isArray(variedad.files) && variedad.files.length > 0) {
            const previewFile = variedad.files.find((f: any) => f.type === 'preview' && f.visible !== false);
            if (previewFile) {
              imagenColor = previewFile.preview_url || previewFile.thumbnail_url || previewFile.url;
            }
          }

          // Prioridad 2: Imagen de variedad (ProductVariants)
          if (!imagenColor && variedad.imagen) {
            imagenColor = variedad.imagen;
          }

          // Prioridad 3: Buscar en galerias por color
          if (!imagenColor) {
            const galeriaConImagen = product.galerias?.find(
              (g: any) => g.color === variedad.color && g.imagen
            );
            if (galeriaConImagen) {
              imagenColor = galeriaConImagen.imagen;
            }
          }

          coloresMap.set(colorKey, {
            color: variedad.color,
            imagen: imagenColor
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
   * 🆕 Prioriza Files de Printful (mockups) sobre otras fuentes
   */
  filterUniqueGalerias(product: any): void {
    if (!product || !product.variedades) return;

    const uniqueImages = new Map();
    
    // 🆕 Prioridad 1: Files de Printful (mockups)
    product.variedades.forEach((variedad: any) => {
      if (variedad.files && Array.isArray(variedad.files)) {
        variedad.files.forEach((file: any) => {
          if (file.visible !== false) {
            const imageUrl = file.preview_url || file.thumbnail_url || file.url;
            
            if (imageUrl) {
              // Usar idFile como clave única para evitar duplicados reales
              const uniqueKey = `file-${file.idFile}`;
              
              if (!uniqueImages.has(uniqueKey)) {
                uniqueImages.set(uniqueKey, {
                  imagen: imageUrl,
                  color: variedad.color || 'default',
                  size: variedad.valor || '',
                  source: 'file',
                  fileType: file.type,
                  priority: file.type === 'preview' ? 1 : 2 // Preview tiene mayor prioridad
                });
              }
            }
          }
        });
      }

      // Prioridad 2: Imagen de variedad (ProductVariants)
      if (variedad.imagen) {
        const imageKey = `variant-${variedad.id}`;
        if (!uniqueImages.has(imageKey)) {
          uniqueImages.set(imageKey, {
            imagen: variedad.imagen,
            color: variedad.color || 'default',
            size: variedad.valor || '',
            source: 'variant',
            priority: 3
          });
        }
      }
    });

    // Prioridad 3: Agregar imagen principal si no existe y no hay mockups
    if (product.imagen && uniqueImages.size === 0) {
      uniqueImages.set('portada', {
        imagen: product.imagen,
        color: 'principal',
        size: '',
        source: 'portada',
        priority: 4
      });
    }

    // Ordenar por prioridad y convertir a array
    const galerias = Array.from(uniqueImages.values())
      .sort((a, b) => a.priority - b.priority);
      
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