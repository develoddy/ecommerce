import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProductUIService {

  constructor() { }

  /**
   * Genera un slug URL-friendly a partir de un título
   * @param title - El título a convertir en slug
   * @returns El slug generado
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase() // Convertir a minúsculas
      .replace(/[^a-z0-9 -]/g, '') // Eliminar caracteres no alfanuméricos
      .replace(/\s+/g, '-') // Reemplazar los espacios por guiones
      .replace(/-+/g, '-'); // Reemplazar múltiples guiones por uno solo
  }

  /**
   * Obtiene el valor hexadecimal de un color basado en su nombre
   * @param color - El nombre del color
   * @returns El valor hexadecimal del color o string vacío si no existe
   */
  getColorHex(color: string): string {
    // Mapea los nombres de los colores a sus valores hexadecimales correspondientes
    const colorMap: { [key: string]: string } = {
      'Faded Black': '#424242',
      'Faded Khaki': '#dbc4a2',
      'Black': '#080808',
      'Navy': '#152438',
      'Maroon': '#6c152b',
      'Red': '#e41525',
      'Royal': '#1652ac',
      'Sport Grey': '#9b969c',
      'Light blue': '#9dbfe2',
      'Faded Eucalyptus': '#d1cbad',
      'Faded Bone': '#f3ede4',
      'White': '#ffffff',
      'Leaf': '#5c9346',
      'Autumn': '#c85313',
      // Sudaderas premiun con capucha unisex | Cotton Heritage M2580
      'Carbon Grey': '#c7c3be',
      'Bone': '#f5e8ce',
    };
    return colorMap[color] || ''; // Devuelve el valor hexadecimal correspondiente al color
  }

  /**
   * Extrae tags únicos de una lista de productos y devuelve configuración inicial
   * @param products - Lista de productos
   * @returns Objeto con allTags y selectedColor inicial
   */
  extractTags(products: any[]): { allTags: string[][], selectedColor: string } {
    const allTags: string[][] = [];
    let selectedColor = '';

    products.forEach((product: any) => {
      if (product.tags && product.tags.length > 0) {
        // Filtrar colores únicos del producto actual
        const uniqueTags = product.tags.filter(
          (tag: string, index: number, self: string[]) => {
            return self.indexOf(tag) === index;
          }
        );

        allTags.push(uniqueTags);
      }
    });

    // Seleccionar el primer color de la primera iteración para el color seleccionado inicialmente
    if (allTags.length > 0) {
      selectedColor = allTags[0][0];
    }

    return { allTags, selectedColor };
  }

  /**
   * Procesa los colores disponibles para un producto basado en su galería
   * @param product - El producto a procesar
   * @returns El producto con la propiedad colores agregada
   */
  private processProductColors(product: any): any {
    const uniqueColors = new Map();
    
    if (product.galerias) {
      product.galerias.forEach((tag: any) => {
        if (!uniqueColors.has(tag.color)) {
          uniqueColors.set(tag.color, {
            imagen: tag.imagen,
            hex: this.getColorHex(tag.color),
          });
        }
      });
    }

    // Agrega los colores únicos de cada producto al propio producto
    product.colores = Array.from(
      uniqueColors,
      ([color, { imagen, hex }]) => ({ color, imagen, hex })
    );

    // Agregar propiedad `selectedImage` con la imagen principal del producto
    product.imagen = product.imagen;
    
    return product;
  }

  /**
   * Establece los colores disponibles para todas las listas de productos
   * @param ourProducts - Lista de productos principales
   * @param besProducts - Lista de mejores productos
   * @param flashProductList - Lista de productos en Flash Sale
   * @returns Objeto con las listas actualizadas
   */
  setColoresDisponibles(
    ourProducts: any[], 
    besProducts: any[],
    hoodiesProducts: any[],
    mugsProducts: any[],
    capsProducts: any[],
    flashProductList: any[]
  ): { ourProducts: any[], besProducts: any[], hoodiesProducts: any[], mugsProducts: any[], capsProducts: any[], flashProductList: any[]} {

    const processedOurProducts = ourProducts.map(product => this.processProductColors(product));
    const processedBesProducts = besProducts.map(product => this.processProductColors(product));
    const processedHoodiesProducts = hoodiesProducts.map(product => this.processProductColors(product));
    const processedMugsProducts = mugsProducts.map(product => this.processProductColors(product));
    const processedCapsProducts = capsProducts.map(product => this.processProductColors(product));
    const processedFlashProducts = flashProductList.map(product => this.processProductColors(product));

    return {
      ourProducts: processedOurProducts,
      besProducts: processedBesProducts,
      hoodiesProducts: processedHoodiesProducts,
      mugsProducts: processedMugsProducts,
      capsProducts: processedCapsProducts,
      flashProductList: processedFlashProducts
    };
  }

  /**
   * Cambia la imagen principal de un producto
   * @param product - El producto a modificar
   * @param imageUrl - La nueva URL de imagen
   */
  changeProductImage(product: any, imageUrl: string): void {
    product.imagen = imageUrl;
  }

  /**
   * Obtiene la clase CSS para el swatch de color
   * @param imagen - URL de la imagen
   * @param color - Nombre del color
   * @param firstImage - URL de la primera imagen (para comparación)
   * @returns Objeto con las clases CSS
   */
  getSwatchClass(imagen: string, color: string, firstImage: string): any {
    return {
      active: imagen === firstImage,
      [color.toLowerCase()]: true,
      'color-swatch': true,
    };
  }

  /**
   * Filtra galerías únicas de un producto
   * @param product - El producto seleccionado
   * @returns Array de galerías únicas
   */
  filterUniqueGalerias(product: any): any[] {
    if (!product.galerias) return [];
    
    const uniqueImages = new Set();
    return product.galerias.filter((galeria: any) => {
      const isDuplicate = uniqueImages.has(galeria.imagen);
      uniqueImages.add(galeria.imagen);
      return !isDuplicate;
    });
  }

  /**
   * Obtiene la primera imagen de una lista de galerías filtradas
   * @param filteredGallery - Array de galerías filtradas
   * @returns URL de la primera imagen o string vacío
   */
  getFirstImage(filteredGallery: any[]): string {
    return filteredGallery.length > 0 ? filteredGallery[0].imagen : '';
  }
}