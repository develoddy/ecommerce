import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImageManagerService {

  // Estados reactivos para el manejo de imágenes
  private currentImageSubject = new BehaviorSubject<string>('');
  public currentImage$ = this.currentImageSubject.asObservable();

  private zoomImageSubject = new BehaviorSubject<string>('');
  public zoomImage$ = this.zoomImageSubject.asObservable();

  private activeImageIndexSubject = new BehaviorSubject<number>(0);
  public activeImageIndex$ = this.activeImageIndexSubject.asObservable();

  private galleriaImagesSubject = new BehaviorSubject<any[]>([]);
  public galleriaImages$ = this.galleriaImagesSubject.asObservable();

  private isZoomEnabledSubject = new BehaviorSubject<boolean>(false);
  public isZoomEnabled$ = this.isZoomEnabledSubject.asObservable();

  constructor() { }

  /**
   * Establece la imagen principal
   */
  setCurrentImage(imageUrl: string): void {
    this.currentImageSubject.next(imageUrl);
    this.zoomImageSubject.next(imageUrl);
  }

  /**
   * Obtiene la imagen actual
   */
  getCurrentImage(): string {
    return this.currentImageSubject.value;
  }

  /**
   * Actualiza la imagen de zoom
   */
  updateZoomImage(imageUrl: string): void {
    this.zoomImageSubject.next(imageUrl);
  }

  /**
   * Obtiene la imagen de zoom actual
   */
  getZoomImage(): string {
    return this.zoomImageSubject.value;
  }

  /**
   * Establece el índice activo de la galería
   */
  setActiveIndex(index: number): void {
    this.activeImageIndexSubject.next(index);
    
    const images = this.galleriaImagesSubject.value;
    if (images && images[index]) {
      this.setCurrentImage(images[index].imagen);
    }
  }

  /**
   * Obtiene el índice activo actual
   */
  getActiveIndex(): number {
    return this.activeImageIndexSubject.value;
  }

  /**
   * Establece las imágenes de la galería
   */
  setGalleriaImages(images: any[]): void {
    this.galleriaImagesSubject.next(images || []);
    
    // Establecer primera imagen como activa si no hay ninguna
    if (images && images.length > 0 && this.activeImageIndexSubject.value === 0) {
      this.setCurrentImage(images[0].imagen);
    }
  }

  /**
   * Obtiene las imágenes de la galería
   */
  getGalleriaImages(): any[] {
    return this.galleriaImagesSubject.value || [];
  }

  /**
   * Navega a la siguiente imagen
   */
  nextImage(): void {
    const images = this.galleriaImagesSubject.value;
    const currentIndex = this.activeImageIndexSubject.value;
    
    if (images && images.length > 0) {
      const nextIndex = (currentIndex + 1) % images.length;
      this.setActiveIndex(nextIndex);
    }
  }

  /**
   * Navega a la imagen anterior
   */
  previousImage(): void {
    const images = this.galleriaImagesSubject.value;
    const currentIndex = this.activeImageIndexSubject.value;
    
    if (images && images.length > 0) {
      const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
      this.setActiveIndex(prevIndex);
    }
  }

  /**
   * Establece la primera imagen como activa
   */
  setFirstImage(): void {
    const images = this.galleriaImagesSubject.value;
    if (images && images.length > 0) {
      this.setActiveIndex(0);
    }
  }

  /**
   * Habilita o deshabilita el zoom
   */
  toggleZoom(enabled: boolean): void {
    this.isZoomEnabledSubject.next(enabled);
  }

  /**
   * Verifica si el zoom está habilitado
   */
  isZoomEnabled(): boolean {
    return this.isZoomEnabledSubject.value;
  }

  /**
   * Filtra imágenes únicas de las variedades del producto
   */
  filterUniqueImagesFromVarieties(variedades: any[], mainImage?: string): any[] {
    if (!variedades) return [];

    const uniqueImages = new Map();
    
    // Agregar imagen principal si existe
    if (mainImage) {
      uniqueImages.set(mainImage, {
        imagen: mainImage,
        color: 'principal',
        alt: 'Imagen principal del producto'
      });
    }

    // Filtrar imágenes únicas de las variedades
    variedades.forEach((variedad: any) => {
      if (variedad.imagen && !uniqueImages.has(variedad.imagen)) {
        uniqueImages.set(variedad.imagen, {
          imagen: variedad.imagen,
          color: variedad.valor?.valor || 'variedad',
          alt: `Imagen del producto - ${variedad.valor?.valor || 'variedad'}`
        });
      }
    });

    return Array.from(uniqueImages.values());
  }

  /**
   * Obtiene la imagen por color específico
   */
  getImageByColor(color: string): string | null {
    const images = this.galleriaImagesSubject.value;
    const imageForColor = images.find(img => 
      img.color && img.color.toLowerCase() === color.toLowerCase()
    );
    
    return imageForColor ? imageForColor.imagen : null;
  }

  /**
   * Precargar imágenes para mejorar la experiencia del usuario
   */
  preloadImages(imageUrls: string[]): Promise<boolean[]> {
    const promises = imageUrls.map(url => this.preloadSingleImage(url));
    return Promise.all(promises);
  }

  /**
   * Precargar una sola imagen
   */
  private preloadSingleImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  /**
   * Valida si una URL de imagen es válida
   */
  validateImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Verificar si es una URL válida
    try {
      new URL(url);
      return true;
    } catch {
      // Si no es una URL absoluta, verificar si es una ruta relativa válida
      return url.startsWith('/') || url.includes('.');
    }
  }

  /**
   * Obtiene una imagen por defecto si la actual no es válida
   */
  getDefaultImage(): string {
    return '/assets/media/productos/default-product.jpg';
  }

  /**
   * Optimiza la URL de imagen para diferentes tamaños
   */
  getOptimizedImageUrl(originalUrl: string, size: 'thumbnail' | 'medium' | 'large' = 'medium'): string {
    if (!originalUrl) return this.getDefaultImage();

    // Si la imagen ya está optimizada o es externa, devolverla tal como está
    if (originalUrl.includes('_thumb') || originalUrl.includes('http')) {
      return originalUrl;
    }

    const sizeMap = {
      thumbnail: '_thumb',
      medium: '_med',
      large: '_large'
    };

    const extension = originalUrl.split('.').pop();
    const baseName = originalUrl.replace(`.${extension}`, '');
    
    return `${baseName}${sizeMap[size]}.${extension}`;
  }

  /**
   * Resetea todos los estados del servicio
   */
  resetStates(): void {
    this.currentImageSubject.next('');
    this.zoomImageSubject.next('');
    this.activeImageIndexSubject.next(0);
    this.galleriaImagesSubject.next([]);
    this.isZoomEnabledSubject.next(false);
  }
}