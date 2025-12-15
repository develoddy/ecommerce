/**
 * 📏 SIZE GUIDES INTERFACES
 * Interfaces para las guías de tallas dinámicas de Printful
 */

export interface SizeMeasurementValue {
  size: string;           // Talla: "S", "M", "L", etc.
  value?: string;         // Valor único (ej: "24")
  min_value?: string;     // Valor mínimo (ej: "14")
  max_value?: string;     // Valor máximo (ej: "16")
}

export interface SizeMeasurement {
  type_label: string;                    // Tipo de medida: "Length", "Chest", "Width", "US size", etc.
  values: SizeMeasurementValue[];        // Array de valores por talla
}

export interface SizeTable {
  type: 'measure_yourself' | 'product_measure' | 'international';  // Tipo de tabla
  unit: 'inches' | 'cm' | 'none';                                // Unidad de medida
  description?: string;                                           // Descripción HTML de la tabla
  image_url?: string;                                            // URL de imagen explicativa
  image_description?: string;                                     // Descripción HTML de la imagen
  measurements: SizeMeasurement[];                               // Array de medidas
}

export interface SizeGuide {
  product_id: number;                    // ID del producto en Printful
  available_sizes: string[];             // Tallas disponibles: ["S", "M", "L"]
  size_tables: SizeTable[];             // Tablas de guías de tallas
}

/**
 * 🎨 UI STATE INTERFACES
 * Para manejar el estado del componente
 */

export interface SizeGuideUIState {
  activeTab: 'measure_yourself' | 'product_measure' | 'international';
  activeUnit: 'inches' | 'cm';
  selectedSize?: string;
  availableUnits: ('inches' | 'cm')[];
  tabsAvailable: {
    measure_yourself: boolean;
    product_measure: boolean;
    international: boolean;
  };
}

/**
 * 📊 PROCESSED DATA INTERFACES
 * Para datos procesados y optimizados para mostrar en las tablas
 */

export interface ProcessedSizeTable extends Omit<SizeTable, 'measurements'> {
  measurements: ProcessedSizeMeasurement[];
  hasRangeValues: boolean;              // Si tiene valores min/max
  hasSingleValues: boolean;             // Si tiene valores únicos
}

export interface ProcessedSizeMeasurement extends Omit<SizeMeasurement, 'values'> {
  values: ProcessedSizeMeasurementValue[];
}

export interface ProcessedSizeMeasurementValue extends SizeMeasurementValue {
  displayValue: string;                 // Valor formateado para mostrar
  isRange: boolean;                     // Si es un rango de valores
}

/**
 * 📋 TAB CONFIG INTERFACES
 * Configuración de tabs y sus traducciones
 */

export interface SizeGuideTab {
  key: 'measure_yourself' | 'product_measure' | 'international';
  title: string;
  icon: string;
  description: string;
  available: boolean;
}

export const SIZE_GUIDE_TABS: Record<string, SizeGuideTab> = {
  measure_yourself: {
    key: 'measure_yourself',
    title: '📏 Mídete a ti mismo',
    icon: 'fas fa-ruler',
    description: 'Medidas de tu cuerpo para encontrar la talla perfecta',
    available: false
  },
  product_measure: {
    key: 'product_measure', 
    title: '👕 Medidas del producto',
    icon: 'fas fa-tshirt',
    description: 'Dimensiones reales del producto terminado',
    available: false
  },
  international: {
    key: 'international',
    title: '🌍 Conversión internacional',
    icon: 'fas fa-globe',
    description: 'Equivalencias entre tallas US, EU, UK y otras regiones',
    available: false
  }
};