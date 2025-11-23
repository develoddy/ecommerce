import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { EcommerceAuthService } from './ecommerce-auth.service';

export interface PrintfulCountry {
  code: string;
  name: string;
  requiresState?: boolean;
  stateLabel?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  message: string;
  shippingRate?: number;
  shippingMethod?: string;
  minDeliveryDate?: string;
  maxDeliveryDate?: string;
  error?: string;
}

export interface NormalizedAddress {
  name: string;
  surname: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  country_code: string;
  country_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddressValidationService {

  /**
   * Países europeos soportados por Printful con sus códigos ISO
   * Fuente: https://developers.printful.com/docs/#section/Countries
   */
  public readonly EUROPEAN_COUNTRIES: PrintfulCountry[] = [
    { code: 'ES', name: 'España' },
    { code: 'FR', name: 'Francia' },
    { code: 'DE', name: 'Alemania' },
    { code: 'IT', name: 'Italia' },
    { code: 'PT', name: 'Portugal' },
    { code: 'NL', name: 'Países Bajos' },
    { code: 'BE', name: 'Bélgica' },
    { code: 'AT', name: 'Austria' },
    { code: 'SE', name: 'Suecia' },
    { code: 'DK', name: 'Dinamarca' },
    { code: 'FI', name: 'Finlandia' },
    { code: 'NO', name: 'Noruega' },
    { code: 'IE', name: 'Irlanda' },
    { code: 'PL', name: 'Polonia' },
    { code: 'GR', name: 'Grecia' },
    { code: 'CZ', name: 'República Checa' },
    { code: 'HU', name: 'Hungría' },
    { code: 'RO', name: 'Rumanía' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croacia' },
    { code: 'SI', name: 'Eslovenia' },
    { code: 'SK', name: 'Eslovaquia' },
    { code: 'LT', name: 'Lituania' },
    { code: 'LV', name: 'Letonia' },
    { code: 'EE', name: 'Estonia' },
    { code: 'LU', name: 'Luxemburgo' },
    { code: 'MT', name: 'Malta' },
    { code: 'CY', name: 'Chipre' }
  ];

  /**
   * Mapeo inverso: nombre completo → código ISO
   */
  private readonly countryNameToCode: Record<string, string> = {};

  constructor(private ecommerceAuthService: EcommerceAuthService) {
    // Construir mapeo inverso
    this.EUROPEAN_COUNTRIES.forEach(country => {
      this.countryNameToCode[country.name] = country.code;
      this.countryNameToCode[country.name.toLowerCase()] = country.code;
    });
  }

  /**
   * Obtiene el código ISO del país a partir del nombre
   */
  getCountryCode(countryNameOrCode: string): string {
    // Si ya es un código de 2 letras, devolverlo
    if (countryNameOrCode.length === 2) {
      return countryNameOrCode.toUpperCase();
    }
    
    // Buscar en el mapeo
    return this.countryNameToCode[countryNameOrCode] || 
           this.countryNameToCode[countryNameOrCode.toLowerCase()] || 
           'ES'; // Fallback a España
  }

  /**
   * Verifica si un país está soportado por Printful
   */
  isCountrySupported(countryCode: string): boolean {
    return this.EUROPEAN_COUNTRIES.some(c => c.code === countryCode.toUpperCase());
  }

  /**
   * Normaliza código postal según país (quita espacios, normaliza formato)
   */
  normalizeZip(zipCode: string, countryCode: string): string {
    let normalized = zipCode.trim().toUpperCase();
    
    switch (countryCode.toUpperCase()) {
      case 'NL': // Países Bajos: 1234AB o 1234 AB → 1234 AB
        normalized = normalized.replace(/^(\d{4})\s*([A-Z]{2})$/, '$1 $2');
        break;
      case 'SE': // Suecia: 11122 → 111 22
        normalized = normalized.replace(/^(\d{3})\s*(\d{2})$/, '$1 $2');
        break;
      case 'GR': // Grecia: 10432 → 104 32
      case 'CZ': // República Checa
      case 'SK': // Eslovaquia
        normalized = normalized.replace(/^(\d{3})\s*(\d{2})$/, '$1 $2');
        break;
      case 'PT': // Portugal: mantener guión
        normalized = normalized.replace(/^(\d{4})\s*-?\s*(\d{3})$/, '$1-$2');
        break;
      case 'PL': // Polonia: mantener guión
        normalized = normalized.replace(/^(\d{2})\s*-?\s*(\d{3})$/, '$1-$2');
        break;
      case 'LV': // Letonia: agregar prefijo si no existe
        if (!/^LV-/.test(normalized)) {
          normalized = `LV-${normalized}`;
        }
        break;
      case 'IE': // Irlanda: mantener espacio
        normalized = normalized.replace(/^([A-Z0-9]{3})\s*([A-Z0-9]{4})$/, '$1 $2');
        break;
      case 'MT': // Malta: mantener espacio
        normalized = normalized.replace(/^([A-Z]{3})\s*(\d{4})$/, '$1 $2');
        break;
    }
    
    return normalized;
  }

  /**
   * Valida el formato del código postal según el país con rangos estrictos
   * Retorna null si es válido, o mensaje de error si no lo es
   */
  validateZipCode(zipCode: string, countryCode: string): string | null {
    const cleanZip = this.normalizeZip(zipCode, countryCode);
    const country = countryCode.toUpperCase();
    
    // Patrones y rangos por país basados en documentación oficial
    const validationRules: Record<string, { 
      regex: RegExp, 
      example: string,
      minRange?: number,
      maxRange?: number,
      customValidation?: (zip: string) => boolean
    }> = {
      'ES': { 
        regex: /^[0-5][0-9]{4}$/, 
        example: '28013',
        minRange: 1,
        maxRange: 52999,
        customValidation: (zip) => {
          const num = parseInt(zip, 10);
          return num >= 1 && num <= 52999;
        }
      },
      'FR': { 
        regex: /^[0-9]{5}$/, 
        example: '75001',
        minRange: 1000,
        maxRange: 98999,
        customValidation: (zip) => {
          const num = parseInt(zip, 10);
          return num >= 1000 && num <= 98999;
        }
      },
      'DE': { 
        regex: /^[0-9]{5}$/, 
        example: '10115',
        minRange: 1001,
        maxRange: 99998,
        customValidation: (zip) => {
          const num = parseInt(zip, 10);
          return num >= 1001 && num <= 99998;
        }
      },
      'IT': { 
        regex: /^[0-9]{5}$/, 
        example: '00118',
        minRange: 118,
        maxRange: 98168
      },
      'PT': { regex: /^[0-9]{4}-[0-9]{3}$/, example: '1000-001' },
      'NL': { regex: /^[1-9][0-9]{3}\s[A-Z]{2}$/, example: '1012 JS' },
      'BE': { 
        regex: /^[1-9][0-9]{3}$/, 
        example: '1000',
        minRange: 1000,
        maxRange: 9999
      },
      'AT': { 
        regex: /^[1-9][0-9]{3}$/, 
        example: '1010',
        minRange: 1010,
        maxRange: 9992
      },
      'SE': { regex: /^[1-9][0-9]{2}\s[0-9]{2}$/, example: '111 22' },
      'DK': { 
        regex: /^[1-9][0-9]{3}$/, 
        example: '1050',
        minRange: 1000,
        maxRange: 9990
      },
      'FI': { 
        regex: /^[0-9]{5}$/, 
        example: '00100',
        minRange: 100,
        maxRange: 99999
      },
      'NO': { 
        regex: /^[0-9]{4}$/, 
        example: '0010',
        minRange: 10,
        maxRange: 9991
      },
      'IE': { regex: /^[A-Z0-9]{3}\s[A-Z0-9]{4}$/, example: 'D02 AF30' },
      'PL': { regex: /^[0-9]{2}-[0-9]{3}$/, example: '00-001' },
      'GR': { regex: /^[1-9][0-9]{2}\s[0-9]{2}$/, example: '104 32' },
      'CZ': { regex: /^[1-9][0-9]{2}\s[0-9]{2}$/, example: '110 00' },
      'HU': { 
        regex: /^[1-9][0-9]{3}$/, 
        example: '1011',
        minRange: 1000,
        maxRange: 9985
      },
      'RO': { regex: /^[0-9]{6}$/, example: '010101' },
      'BG': { 
        regex: /^[1-9][0-9]{3}$/, 
        example: '1000',
        minRange: 1000,
        maxRange: 9974
      },
      'HR': { 
        regex: /^[1-9][0-9]{4}$/, 
        example: '10000',
        minRange: 10000,
        maxRange: 53296
      },
      'SI': { 
        regex: /^[1-9][0-9]{3}$/, 
        example: '1000',
        minRange: 1000,
        maxRange: 9600
      },
      'SK': { regex: /^[0-9]{3}\s[0-9]{2}$/, example: '811 01' },
      'LT': { 
        regex: /^[0-9]{5}$/, 
        example: '01100',
        minRange: 1000,
        maxRange: 99200
      },
      'LV': { regex: /^LV-[1-9][0-9]{3}$/, example: 'LV-1010' },
      'EE': { 
        regex: /^[0-9]{5}$/, 
        example: '10111',
        minRange: 10000,
        maxRange: 99999
      },
      'LU': { 
        regex: /^[1-9][0-9]{3}$/, 
        example: '1009',
        minRange: 1009,
        maxRange: 9999
      },
      'MT': { regex: /^[A-Z]{3}\s[0-9]{4}$/, example: 'VLT 1117' },
      'CY': { 
        regex: /^[1-9][0-9]{3}$/, 
        example: '1010',
        minRange: 1000,
        maxRange: 9999
      }
    };

    const rule = validationRules[country];
    if (!rule) {
      console.warn(`⚠️ [AddressValidation] No validation rule for country: ${country}`);
      return null; // No hay patrón definido, dejar que Printful valide
    }

    // Validar formato
    if (!rule.regex.test(cleanZip)) {
      console.log(`❌ [AddressValidation] Invalid format for ${country}: ${cleanZip}`);
      return `Formato de código postal inválido para ${this.getCountryName(country)}. Ejemplo válido: ${rule.example}`;
    }

    // Validar rango si existe validación personalizada
    if (rule.customValidation && !rule.customValidation(cleanZip)) {
      console.log(`❌ [AddressValidation] Out of range for ${country}: ${cleanZip}`);
      return `El código postal ${cleanZip} no existe en ${this.getCountryName(country)}. Rango válido: ${rule.minRange} - ${rule.maxRange}`;
    }

    // Validar rango numérico simple
    if (rule.minRange && rule.maxRange && /^\d+$/.test(cleanZip)) {
      const num = parseInt(cleanZip, 10);
      if (num < rule.minRange || num > rule.maxRange) {
        console.log(`❌ [AddressValidation] Out of range for ${country}: ${num}`);
        return `El código postal debe estar entre ${rule.minRange} y ${rule.maxRange} para ${this.getCountryName(country)}.`;
      }
    }

    console.log(`✅ [AddressValidation] Valid ZIP for ${country}: ${cleanZip}`);
    return null; // Válido
  }

  /**
   * Normaliza una dirección para enviarla a Printful
   */
  normalizeAddress(address: any): NormalizedAddress {
    const countryCode = this.getCountryCode(address.pais || address.country_code || 'ES');
    const countryName = this.EUROPEAN_COUNTRIES.find(c => c.code === countryCode)?.name || 'España';

    return {
      name: address.name || '',
      surname: address.surname || '',
      email: address.email || '',
      phone: address.phone || '',
      address: address.address || address.address1 || '',
      city: address.poblacion || address.city || address.ciudad || '',
      state: address.ciudad || address.state || address.city || '',
      zipcode: address.zipcode || address.zip || '',
      country_code: countryCode,
      country_name: countryName
    };
  }

  /**
   * Validación local estricta ANTES de llamar a Printful
   * Retorna resultado inmediato sin hacer llamadas a API
   */
  validateLocalRules(address: any): AddressValidationResult {
    console.log('🔍 [AddressValidation] Starting local validation...', address);
    
    const normalized = this.normalizeAddress(address);

    // 1. Verificar país soportado
    if (!this.isCountrySupported(normalized.country_code)) {
      console.log(`❌ [AddressValidation] Unsupported country: ${normalized.country_code}`);
      return {
        isValid: false,
        message: `Lo sentimos, actualmente no realizamos envíos a ${normalized.country_name}. Solo enviamos a países de la Unión Europea.`,
        error: 'unsupported_country'
      };
    }

    // 2. Verificar campos obligatorios
    if (!normalized.address || !normalized.city || !normalized.zipcode) {
      console.log('❌ [AddressValidation] Incomplete address fields');
      return {
        isValid: false,
        message: 'Por favor, completa todos los campos obligatorios de la dirección.',
        error: 'incomplete_address'
      };
    }

    // 3. Validar formato y rango de código postal
    const zipValidation = this.validateZipCode(normalized.zipcode, normalized.country_code);
    if (zipValidation) {
      console.log(`❌ [AddressValidation] ZIP validation failed: ${zipValidation}`);
      return {
        isValid: false,
        message: zipValidation,
        error: 'invalid_zip_format'
      };
    }

    console.log('✅ [AddressValidation] Local validation passed');
    return {
      isValid: true,
      message: 'Validación local correcta'
    };
  }

  /**
   * Valida una dirección con Printful antes de guardarla
   * Este método hace una llamada real a la API de Printful
   * @param address - Dirección a validar
   * @param items - Items del carrito (opcional, puede ser un producto dummy)
   */
  validateWithPrintful(address: any, items?: {variant_id: number, quantity: number}[]): Observable<AddressValidationResult> {
    console.log('🚀 [AddressValidation] Starting Printful API validation...', address);
    
    const normalized = this.normalizeAddress(address);
    
    // IMPORTANTE: Ejecutar validación local primero
    const localValidation = this.validateLocalRules(normalized);
    if (!localValidation.isValid) {
      console.log('❌ [AddressValidation] Local validation failed, skipping Printful API call');
      return of(localValidation);
    }

    // Usar items dummy si no se proporcionan
    // 🔥 PRODUCTO DUMMY VÁLIDO: Bella Canvas 3001 Unisex Short Sleeve (White, Size S)
    const itemsToValidate = items && items.length > 0 ? items : [
      { variant_id: 4011, quantity: 1 } // Producto base de Printful siempre disponible
    ];

    const payload = {
      recipient: {
        address1: normalized.address,
        city: normalized.city,
        country_code: normalized.country_code,
        zip: normalized.zipcode,
        state_code: normalized.state || normalized.city
      },
      items: itemsToValidate,
      currency: 'EUR',
      locale: 'es_ES'
    };

    console.log('📦 [AddressValidation] Sending payload to Printful:', payload);
    
    return this.ecommerceAuthService.getShippingRates(payload).pipe(
      map((response: any) => {
        console.log('📬 [AddressValidation] Printful response received:', response);
        
        const rate = response.result?.[0];
        
        if (!rate) {
          console.log('⚠️ [AddressValidation] No shipping rates returned by Printful');
          return {
            isValid: false,
            message: 'No se pudo calcular el envío para esta dirección. Verifica que el código postal y la ciudad sean correctos.',
            error: 'no_shipping_rates'
          };
        }

        console.log(`✅ [AddressValidation] VALIDATION → OK → Shipping: ${rate.rate} EUR, Method: ${rate.name}`);
        
        return {
          isValid: true,
          message: 'Dirección válida según Printful',
          shippingRate: parseFloat(rate.rate),
          shippingMethod: rate.name,
          minDeliveryDate: rate.minDeliveryDate,
          maxDeliveryDate: rate.maxDeliveryDate
        };
      }),
      catchError((error) => {
        console.error('❌ [AddressValidation] Printful API error:', error);
        console.error('❌ [AddressValidation] Error details:', JSON.stringify(error.error, null, 2));
        
        // Analizar el error de Printful con mayor detalle
        let errorMessage = 'No se pudo validar la dirección.';
        let errorCode = 'validation_failed';
        let printfulErrorText = '';
        
        // Detectar diferentes formatos de error de Printful
        if (error.error?.result) {
          // Formato 1: { result: "Error message" }
          printfulErrorText = error.error.result.toLowerCase();
        } else if (error.error?.error?.message) {
          // Formato 2: { error: { message: "Error message" } }
          printfulErrorText = error.error.error.message.toLowerCase();
        } else if (error.error?.message) {
          // Formato 3: { message: "Error message" }
          printfulErrorText = error.error.message.toLowerCase();
        } else if (error.message) {
          // Formato 4: Error directo de axios
          printfulErrorText = error.message.toLowerCase();
        }

        console.log(`🔍 [AddressValidation] Analyzing error text: "${printfulErrorText}"`);

        // Mapeo detallado de errores de Printful según documentación
        if (printfulErrorText.includes('unprocessable') || printfulErrorText.includes('unprocessable_entity')) {
          errorMessage = 'La dirección no puede ser procesada. Verifica que todos los datos sean correctos.';
          errorCode = 'unprocessable_entity';
        } else if (printfulErrorText.includes('invalid variant')) {
          errorMessage = 'Error temporal del servicio de validación. Por favor intenta de nuevo en unos segundos.';
          errorCode = 'internal_error';
        } else if (printfulErrorText.includes('recipient.country') && printfulErrorText.includes('not supported')) {
          errorMessage = 'No realizamos envíos a este país.';
          errorCode = 'unsupported_country';
        } else if (printfulErrorText.includes('recipient.zip') || printfulErrorText.includes('postal')) {
          errorMessage = 'El código postal no es válido en este país.';
          errorCode = 'invalid_zip';
        } else if (printfulErrorText.includes('no shipping') || printfulErrorText.includes('no matches found')) {
          errorMessage = 'No se puede calcular el envío con esta dirección. Verifica que el código postal y la ciudad sean correctos.';
          errorCode = 'no_shipping_matches';
        } else if (printfulErrorText.includes('address') || printfulErrorText.includes('invalid')) {
          errorMessage = 'La dirección proporcionada no es válida. Verifica que todos los datos sean correctos.';
          errorCode = 'invalid_address';
        } else if (printfulErrorText.includes('country')) {
          errorMessage = 'El país especificado no está soportado para envíos.';
          errorCode = 'unsupported_country';
        } else if (printfulErrorText.includes('shipping') || printfulErrorText.includes('calculate')) {
          errorMessage = 'No se pudo calcular el envío para esta dirección.';
          errorCode = 'no_shipping_rates';
        } else if (printfulErrorText.includes('rate limit')) {
          errorMessage = 'Demasiadas solicitudes. Por favor espera un momento e intenta de nuevo.';
          errorCode = 'rate_limit';
        }

        console.log(`❌ [AddressValidation] VALIDATION → FAILED → Reason: ${errorCode} - ${errorMessage}`);

        return of({
          isValid: false,
          message: errorMessage,
          error: errorCode
        });
      })
    );
  }

  /**
   * Obtiene el nombre del país a partir del código
   */
  getCountryName(countryCode: string): string {
    return this.EUROPEAN_COUNTRIES.find(c => c.code === countryCode.toUpperCase())?.name || countryCode;
  }

  /**
   * Obtiene mensajes de error traducidos
   */
  getErrorMessage(errorCode: string): string {
    const messages: Record<string, string> = {
      'unsupported_country': 'Este país no está soportado para envíos',
      'incomplete_address': 'Por favor, completa todos los campos obligatorios',
      'invalid_address': 'La dirección proporcionada no es válida',
      'invalid_zip': 'El código postal no es válido',
      'no_shipping_rates': 'No se pudo calcular el envío',
      'validation_failed': 'Error al validar la dirección'
    };
    
    return messages[errorCode] || 'Error desconocido';
  }
}
