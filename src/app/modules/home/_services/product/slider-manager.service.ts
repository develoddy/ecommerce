import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare var $: any;
declare function productSlider5items(jquery: any): any;

export interface SliderConfiguration {
  selector: string;
  infinite?: boolean;
  slidesToShow?: number;
  slidesToScroll?: number;
  arrows?: boolean;
  dots?: boolean;
  fade?: boolean;
  autoplay?: boolean;
  autoplaySpeed?: number;
  responsive?: any[];
}

export interface SliderInstance {
  id: string;
  selector: string;
  configuration: SliderConfiguration;
  isInitialized: boolean;
  element?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SliderManagerService {

  private _activeSliders = new BehaviorSubject<SliderInstance[]>([]);
  public activeSliders$: Observable<SliderInstance[]> = this._activeSliders.asObservable();

  private sliders: Map<string, SliderInstance> = new Map();

  constructor() {}

  /**
   * Configuraciones predefinidas para sliders comunes
   */
  private getDefaultConfigurations(): { [key: string]: SliderConfiguration } {
    return {
      largeProduct: {
        selector: '.single-product-thumbnail',
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        dots: false,
        fade: true
      },
      smallProduct: {
        selector: '.product-small-thumb-4',
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 1,
        arrows: true,
        dots: false
      },
      productCarousel: {
        selector: '.product-carousel',
        infinite: true,
        slidesToShow: 4,
        slidesToScroll: 1,
        arrows: true,
        dots: false,
        responsive: [
          {
            breakpoint: 768,
            settings: {
              slidesToShow: 2
            }
          },
          {
            breakpoint: 480,
            settings: {
              slidesToShow: 1
            }
          }
        ]
      }
    };
  }

  /**
   * Inicializa un slider con configuración específica
   * @param sliderId - ID único del slider
   * @param config - Configuración del slider
   * @returns Promise que resuelve cuando el slider está inicializado
   */
  initializeSlider(sliderId: string, config: SliderConfiguration): Promise<SliderInstance> {
    return new Promise((resolve, reject) => {
      try {
        const element = $(config.selector);
        
        if (element.length === 0) {
          //console.warn(`Slider element not found: ${config.selector}`);
          reject(new Error(`Element not found: ${config.selector}`));
          return;
        }

        // Verificar si ya está inicializado
        if (element.hasClass('slick-initialized')) {
          element.slick('setPosition');
        } else {
          element.slick(this.cleanConfiguration(config));
        }

        const sliderInstance: SliderInstance = {
          id: sliderId,
          selector: config.selector,
          configuration: config,
          isInitialized: true,
          element: element
        };

        this.sliders.set(sliderId, sliderInstance);
        this.updateActiveSliders();
        resolve(sliderInstance);

      } catch (error) {
        console.error(`Error initializing slider ${sliderId}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Inicializa el slider grande del producto (imagen principal)
   * @returns Promise con la instancia del slider
   */
  initializeLargeProductSlider(): Promise<SliderInstance> {
    const config = this.getDefaultConfigurations().largeProduct;
    return this.initializeSlider('largeProduct', config);
  }

  /**
   * Inicializa el slider pequeño del producto (thumbnails)
   * @returns Promise con la instancia del slider
   */
  initializeSmallProductSlider(): Promise<SliderInstance> {
    const config = this.getDefaultConfigurations().smallProduct;
    return this.initializeSlider('smallProduct', config);
  }

  /**
   * Inicializa todos los sliders del producto
   * @returns Promise que resuelve cuando ambos sliders están listos
   */
  initializeProductSliders(): Promise<[SliderInstance, SliderInstance]> {
    return Promise.all([
      this.initializeLargeProductSlider(),
      this.initializeSmallProductSlider()
    ]);
  }

  /**
   * Destruye un slider específico
   * @param sliderId - ID del slider a destruir
   * @returns true si se destruyó correctamente
   */
  destroySlider(sliderId: string): boolean {
    const slider = this.sliders.get(sliderId);
    if (!slider) {
      console.warn(`Slider not found: ${sliderId}`);
      return false;
    }

    try {
      const element = $(slider.selector);
      if (element.hasClass('slick-initialized')) {
        element.slick('unslick');
      }

      slider.isInitialized = false;
      this.sliders.delete(sliderId);
      this.updateActiveSliders();
      return true;

    } catch (error) {
      console.error(`Error destroying slider ${sliderId}:`, error);
      return false;
    }
  }

  /**
   * Destruye el slider grande del producto
   * @returns true si se destruyó correctamente
   */
  destroyLargeProductSlider(): boolean {
    return this.destroySlider('largeProduct');
  }

  /**
   * Destruye el slider pequeño del producto
   * @returns true si se destruyó correctamente
   */
  destroySmallProductSlider(): boolean {
    return this.destroySlider('smallProduct');
  }

  /**
   * Destruye todos los sliders activos
   * @returns Número de sliders destruidos
   */
  destroyAllSliders(): number {
    let destroyedCount = 0;
    const sliderIds = Array.from(this.sliders.keys());
    
    sliderIds.forEach(sliderId => {
      if (this.destroySlider(sliderId)) {
        destroyedCount++;
      }
    });

    return destroyedCount;
  }

  /**
   * Reinicializa todos los sliders del producto
   * @param delay - Delay antes de reinicializar (ms)
   * @returns Promise que resuelve cuando la reinicialización está completa
   */
  reinitializeProductSliders(delay: number = 50): Promise<[SliderInstance, SliderInstance]> {
    return new Promise((resolve, reject) => {
      // Destruir sliders existentes
      this.destroyLargeProductSlider();
      this.destroySmallProductSlider();

      // Reinicializar después del delay
      setTimeout(() => {
        this.initializeProductSliders()
          .then(resolve)
          .catch(reject);
      }, delay);
    });
  }

  /**
   * Inicializa sliders globales de productos (carousel de 5 items)
   */
  initializeGlobalProductSliders(): void {
    try {
      if (typeof productSlider5items !== 'undefined' && $) {
        productSlider5items($);
      }

      if ((window as any).sliderRefresh && $) {
        (window as any).sliderRefresh($);
      }
    } catch (error) {
      console.error('Error initializing global product sliders:', error);
    }
  }

  /**
   * Actualiza la posición de un slider específico
   * @param sliderId - ID del slider
   * @returns true si se actualizó correctamente
   */
  refreshSlider(sliderId: string): boolean {
    const slider = this.sliders.get(sliderId);
    if (!slider || !slider.isInitialized) {
      return false;
    }

    try {
      const element = $(slider.selector);
      if (element.hasClass('slick-initialized')) {
        element.slick('setPosition');
        return true;
      }
    } catch (error) {
      console.error(`Error refreshing slider ${sliderId}:`, error);
    }

    return false;
  }

  /**
   * Actualiza la posición de todos los sliders activos
   * @returns Número de sliders actualizados
   */
  refreshAllSliders(): number {
    let refreshedCount = 0;
    this.sliders.forEach((slider, sliderId) => {
      if (this.refreshSlider(sliderId)) {
        refreshedCount++;
      }
    });
    return refreshedCount;
  }

  /**
   * Obtiene la instancia de un slider específico
   * @param sliderId - ID del slider
   * @returns Instancia del slider o undefined
   */
  getSlider(sliderId: string): SliderInstance | undefined {
    return this.sliders.get(sliderId);
  }

  /**
   * Obtiene todas las instancias de sliders activos
   * @returns Array de instancias de sliders
   */
  getAllSliders(): SliderInstance[] {
    return Array.from(this.sliders.values());
  }

  /**
   * Verifica si un slider está inicializado
   * @param sliderId - ID del slider
   * @returns true si está inicializado
   */
  isSliderInitialized(sliderId: string): boolean {
    const slider = this.sliders.get(sliderId);
    return slider ? slider.isInitialized : false;
  }

  /**
   * Obtiene el número de sliders activos
   * @returns Número de sliders activos
   */
  getActiveSliderCount(): number {
    return this.sliders.size;
  }

  /**
   * Limpia la configuración removiendo propiedades undefined
   * @param config - Configuración original
   * @returns Configuración limpia
   */
  private cleanConfiguration(config: SliderConfiguration): any {
    const cleaned: any = {};
    Object.keys(config).forEach(key => {
      if (key !== 'selector' && config[key as keyof SliderConfiguration] !== undefined) {
        cleaned[key] = config[key as keyof SliderConfiguration];
      }
    });
    return cleaned;
  }

  /**
   * Actualiza el observable de sliders activos
   */
  private updateActiveSliders(): void {
    this._activeSliders.next(Array.from(this.sliders.values()));
  }

  /**
   * Método de limpieza para el destroy del componente
   */
  cleanup(): void {
    this.destroyAllSliders();
    this.sliders.clear();
    this._activeSliders.next([]);
  }
}