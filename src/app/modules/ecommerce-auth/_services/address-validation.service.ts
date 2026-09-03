import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { EcommerceAuthService } from './ecommerce-auth.service';
import { environment } from 'src/environments/environment';
// @ts-ignore
import * as postalCodes from 'postal-codes-js';

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

export interface PostalCodeInfo {
  exists: boolean;
  postalCode: string;
  province: string;
  cities: { city: string; isPrimary: boolean }[];
  // true solo cuando el fallo es técnico (HTTP != 404); ausente/false = CP simplemente no encontrado
  technicalError?: boolean;
}

export type PostalCodeCheckState = 'INVALID_FORMAT' | 'FOUND' | 'NOT_FOUND' | 'TECHNICAL_ERROR';

export interface PostalCodeCheckResult {
  state: PostalCodeCheckState;
  message: string;
  info?: PostalCodeInfo;
}

export interface PostalCodeValidation {
  valid: boolean;
  message: string;
  details?: {
    postalCode: string;
    city: string;
    province: string;
    country: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AddressValidationService {

  /**
   * Países para PRE-LAUNCH (Enero 2026) - Los 4 mercados principales
   * Expandir gradualmente post-validación
   */
  public readonly PRE_LAUNCH_COUNTRIES: PrintfulCountry[] = [
    { code: 'ES', name: 'España' },
    { code: 'FR', name: 'Francia' },
    { code: 'IT', name: 'Italia' },
    { code: 'DE', name: 'Alemania' }
  ];

  /**
   * Lista completa de países europeos soportados por Printful
   * Para uso futuro post-validación del mercado
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

  /**
   * URL base de la API del backend
   */
  private readonly API_URL = environment.URL_SERVICE;

  constructor(
    private ecommerceAuthService: EcommerceAuthService,
    private http: HttpClient
  ) {
    // Construir mapeo inverso para ambas listas
    this.PRE_LAUNCH_COUNTRIES.forEach(country => {
      this.countryNameToCode[country.name] = country.code;
      this.countryNameToCode[country.name.toLowerCase()] = country.code;
    });
    this.EUROPEAN_COUNTRIES.forEach(country => {
      this.countryNameToCode[country.name] = country.code;
      this.countryNameToCode[country.name.toLowerCase()] = country.code;
    });
  }

  /**
   * Obtiene la lista de países activa según la fase de lanzamiento
   * @param prelaunch - Si true, devuelve solo países del pre-launch
   */
  getAvailableCountries(prelaunch: boolean = true): PrintfulCountry[] {
    return prelaunch ? this.PRE_LAUNCH_COUNTRIES : this.EUROPEAN_COUNTRIES;
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
   * 🎯 BACKEND API: Obtiene información de un código postal desde el backend
   * @param country Código ISO del país (ES, FR, DE, etc.)
   * @param postalCode Código postal
   * @returns Observable con la información del CP (provincia, ciudades disponibles)
   */
  getPostalCodeInfo(country: string, postalCode: string): Observable<PostalCodeInfo | null> {
    const cleanZip = this.normalizeZip(postalCode, country);
    const url = `${this.API_URL}/postal-codes/${country.toUpperCase()}/${cleanZip}`;
    
    console.log(`🌐 [AddressValidation] Fetching postal code info from backend: ${url}`);
    
    return this.http.get<PostalCodeInfo>(url).pipe(
      map(response => {
        console.log('✅ [AddressValidation] Backend response:', response);
        return response;
      }),
      catchError(error => {
        console.warn('⚠️ [AddressValidation] Backend API error:', error);
        // Si el backend no tiene el CP, devolver null (NOT_FOUND real)
        if (error.status === 404) {
          console.log('ℹ️ [AddressValidation] ZIP not found in backend database - fallback to Printful');
          return of(null);
        }
        // Fallo técnico (500/timeout/red): se distingue de un NOT_FOUND real para no bloquear una compra legítima
        console.warn('⚠️ [AddressValidation] Technical error contacting postal service:', error.status);
        return of({ exists: false, postalCode, province: '', cities: [], technicalError: true } as PostalCodeInfo);
      })
    );
  }

  /**
   * 🎯 Clasifica un código postal en uno de 4 estados: INVALID_FORMAT, FOUND, NOT_FOUND, TECHNICAL_ERROR.
   * Reutiliza validateZipCode() (formato) y getPostalCodeInfo() (existencia/errores) sin tocarlos.
   */
  checkPostalCode(zipCode: string, countryCode: string): Observable<PostalCodeCheckResult> {
    const formatError = this.validateZipCode(zipCode, countryCode);
    if (formatError) {
      return of({ state: 'INVALID_FORMAT', message: formatError });
    }

    return this.getPostalCodeInfo(countryCode, zipCode).pipe(
      map((info): PostalCodeCheckResult => {
        if (info?.technicalError) {
          return {
            state: 'TECHNICAL_ERROR',
            message: 'No hemos podido verificar automáticamente el código postal. Introduce población y provincia.'
          };
        }
        if (!info || !info.exists) {
          return {
            state: 'NOT_FOUND',
            message: 'No hemos podido autocompletar este código postal. Introduce la población y provincia manualmente.'
          };
        }
        return { state: 'FOUND', message: 'Código postal válido', info };
      })
    );
  }

  /**
   * 🎯 BACKEND API: Valida la combinación completa CP + Ciudad + Provincia
   * @param country Código ISO del país
   * @param postalCode Código postal
   * @param city Ciudad
   * @param province Provincia
   * @returns Observable con el resultado de la validación
   */
  validateCrossCheck(country: string, postalCode: string, city: string, province: string): Observable<PostalCodeValidation> {
    const cleanZip = this.normalizeZip(postalCode, country);
    const url = `${this.API_URL}/postal-codes/validate`;
    const payload = {
      country: country.toUpperCase(),
      postalCode: cleanZip,
      city: city,
      province: province
    };
    
    console.log(`🌐 [AddressValidation] Validating combination with backend:`, payload);
    
    return this.http.post<PostalCodeValidation>(url, payload).pipe(
      map(response => {
        console.log('✅ [AddressValidation] Validation response:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ [AddressValidation] Validation error:', error);
        // Si hay error, retornar como inválido con mensaje genérico
        return of({
          valid: false,
          message: 'No se pudo validar la dirección. Por favor verifica los datos.'
        });
      })
    );
  }

  /**
   * 🎯 BACKEND API: Obtiene todas las provincias disponibles para un país
   * @param country Código ISO del país
   * @returns Observable con el listado de provincias
   */
  getProvincesByCountry(country: string): Observable<string[]> {
    const url = `${this.API_URL}/postal-codes/provinces/${country.toUpperCase()}`;
    
    console.log(`🌐 [AddressValidation] Fetching provinces from backend: ${url}`);
    
    return this.http.get<{ provinces: string[] }>(url).pipe(
      map(response => {
        console.log('✅ [AddressValidation] Provinces received:', response.provinces);
        return response.provinces;
      }),
      catchError(error => {
        console.warn('⚠️ [AddressValidation] Error fetching provinces:', error);
        return of([]);
      })
    );
  }

  /**
   * 🎯 BACKEND API: Busca códigos postales por ciudad
   * @param country Código ISO del país
   * @param city Nombre de la ciudad
   * @returns Observable con los CPs que coinciden
   */
  searchPostalCodesByCity(country: string, city: string): Observable<PostalCodeInfo[]> {
    const url = `${this.API_URL}/postal-codes/search?country=${country.toUpperCase()}&city=${encodeURIComponent(city)}`;
    
    console.log(`🌐 [AddressValidation] Searching postal codes by city: ${url}`);
    
    return this.http.get<PostalCodeInfo[]>(url).pipe(
      map(response => {
        console.log('✅ [AddressValidation] Search results:', response);
        return response;
      }),
      catchError(error => {
        console.warn('⚠️ [AddressValidation] Search error:', error);
        return of([]);
      })
    );
  }

  /**
   * ⚠️ DEPRECATED: Este método ha sido eliminado.
   * Usar validateLocalRulesAsync() para validación completa con backend API
   * o getPostalCodeInfo() + validateCrossCheck() para validaciones específicas.
   * 
   * @deprecated Eliminado en v2.0 - La validación ciudad-CP ahora se hace exclusivamente vía backend API
   */
  validateCityMatchesZip(city: string, zipCode: string, countryCode: string): string | null {
    console.warn('⚠️ [AddressValidation] validateCityMatchesZip() is DEPRECATED. Use validateLocalRulesAsync() instead.');
    console.log(`ℹ️ [AddressValidation] Skipping local dataset check - backend API will validate city "${city}" with ZIP ${zipCode}`);
    return null; // Siempre retornar null, dejar que backend o Printful validen
  }

  /**
   * Valida la EXISTENCIA REAL del código postal usando postal-codes-js
   * Esta es la validación más precisa antes de Printful
   * @returns null si es válido, mensaje de error si no existe
   */
  validateZipCodeExistence(zipCode: string, countryCode: string, city?: string): string | null {
    try {
      const cleanZip = this.normalizeZip(zipCode, countryCode);
      const country = countryCode.toUpperCase();
      
      console.log(`🔍 [AddressValidation] Checking ZIP existence: ${cleanZip} in ${country}`);
      
      // Intentar validar con postal-codes-js
      const isValid = postalCodes.validate(country, cleanZip);
      
      if (!isValid) {
        console.log(`❌ [AddressValidation] ZIP ${cleanZip} does NOT exist in ${country}`);
        return `El código postal ${cleanZip} no existe en ${this.getCountryName(country)}. Por favor verifica que el código sea correcto.`;
      }
      
      // Nota: La validación de ciudad vs CP se hará en Printful
      // postal-codes-js solo valida existencia, no proporciona lookup detallado
      if (city) {
        console.log(`ℹ️ [AddressValidation] City ${city} provided - Printful will validate correspondence with ZIP ${cleanZip}`);
      }
      
      console.log(`✅ [AddressValidation] ZIP ${cleanZip} EXISTS in ${country}`);
      return null; // Válido
      
    } catch (error) {
      console.warn('⚠️ [AddressValidation] Error validating ZIP with postal-codes-js:', error);
      console.warn('⚠️ [AddressValidation] Falling back to format validation only');
      // Fallback: si la librería falla, no bloqueamos - dejar que Printful valide
      return null;
    }
  }

  /**
   * Normaliza strings para comparación (elimina acentos, minúsculas, espacios)
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9]/g, ''); // Solo letras y números
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
   * ⚠️ SIMPLIFIED: Validación local BÁSICA (solo formato)
   * Solo valida formato de CP y campos obligatorios.
   * NO valida existencia ni correspondencia ciudad-CP.
   * 
   * 🎯 RECOMENDACIÓN: Usar validateLocalRulesAsync() para validación completa con backend API
   * 
   * @param address Dirección a validar
   * @returns Resultado de validación básica (solo formato)
   */
  validateLocalRules(address: any): AddressValidationResult {
    console.log('🔍 [AddressValidation] Starting BASIC local validation (format only)...');
    console.log('💡 [AddressValidation] TIP: Use validateLocalRulesAsync() for complete validation with backend API');
    
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

    // 3. Validar formato de código postal
    const zipValidation = this.validateZipCode(normalized.zipcode, normalized.country_code);
    if (zipValidation) {
      console.log(`❌ [AddressValidation] ZIP format validation failed: ${zipValidation}`);
      return {
        isValid: false,
        message: zipValidation,
        error: 'invalid_zip_format'
      };
    }

    console.log('✅ [AddressValidation] Basic validation passed (format only)');
    console.log('⚠️ [AddressValidation] City-ZIP correspondence NOT validated - use validateLocalRulesAsync() or backend will validate');
    return {
      isValid: true,
      message: 'Validación básica correcta - Se recomienda validación con backend'
    };
  }

  /**
   * 🎯 MÉTODO PRINCIPAL: Validación completa con backend API
   * 
   * Este es el método recomendado para validar direcciones.
   * Realiza validación completa incluyendo:
   * - Formato de código postal
   * - Existencia del CP en base de datos
   * - Correspondencia Ciudad ↔ Código Postal ↔ Provincia
   * - Fallback a postal-codes-js si backend no disponible
   * 
   * @param address Dirección a validar
   * @returns Observable con el resultado de la validación
   */
  validateLocalRulesAsync(address: any): Observable<AddressValidationResult> {
    console.log('🔍 [AddressValidation] Starting ASYNC local validation with backend API...', address);
    
    const normalized = this.normalizeAddress(address);

    // 1. Verificar país soportado
    if (!this.isCountrySupported(normalized.country_code)) {
      console.log(`❌ [AddressValidation] Unsupported country: ${normalized.country_code}`);
      return of({
        isValid: false,
        message: `Lo sentimos, actualmente no realizamos envíos a ${normalized.country_name}. Solo enviamos a países de la Unión Europea.`,
        error: 'unsupported_country'
      });
    }

    // 2. Verificar campos obligatorios
    if (!normalized.address || !normalized.city || !normalized.zipcode) {
      console.log('❌ [AddressValidation] Incomplete address fields');
      return of({
        isValid: false,
        message: 'Por favor, completa todos los campos obligatorios de la dirección.',
        error: 'incomplete_address'
      });
    }

    // 3. Validar formato y rango de código postal
    const zipValidation = this.validateZipCode(normalized.zipcode, normalized.country_code);
    if (zipValidation) {
      console.log(`❌ [AddressValidation] ZIP format validation failed: ${zipValidation}`);
      return of({
        isValid: false,
        message: zipValidation,
        error: 'invalid_zip_format'
      });
    }

    // 4. ⭐ VALIDACIÓN CON BACKEND API: Existencia del CP y validación ciudad-provincia
    console.log('🌐 [AddressValidation] Calling backend API for cross-validation...');
    
    return this.validateCrossCheck(
      normalized.country_code,
      normalized.zipcode,
      normalized.city,
      normalized.state
    ).pipe(
      map(validation => {
        if (!validation.valid) {
          console.log(`❌ [AddressValidation] Backend validation FAILED: ${validation.message}`);
          return {
            isValid: false,
            message: validation.message,
            error: 'backend_validation_failed'
          };
        }
        
        console.log('✅ [AddressValidation] Backend validation PASSED');
        return {
          isValid: true,
          message: 'Validación correcta - Dirección verificada con base de datos'
        };
      }),
      catchError(error => {
        console.warn('⚠️ [AddressValidation] Backend API unavailable, falling back to postal-codes-js');
        
        // Fallback: validar con postal-codes-js si el backend falla
        const zipExistsValidation = this.validateZipCodeExistence(
          normalized.zipcode,
          normalized.country_code,
          normalized.city
        );
        
        if (zipExistsValidation) {
          return of({
            isValid: false,
            message: zipExistsValidation,
            error: 'zip_not_found'
          });
        }
        
        // Si postal-codes-js también pasa, permitir pero avisar
        return of({
          isValid: true,
          message: 'Validación local correcta - Backend no disponible, usando validación offline'
        });
      })
    );
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

        console.log(`🔍 [AddressValidation] Analyzing Printful error text: "${printfulErrorText}"`);
        console.log(`🔍 [AddressValidation] Address being validated:`, {
          zip: normalized.zipcode,
          city: normalized.city,
          country: normalized.country_code
        });

        // 🎯 PRIORIDAD 1: Detectar inconsistencia Ciudad ↔ Código Postal
        // Ejemplos de errores reales de Printful cuando ciudad no coincide con CP:
        // - "Recipient address is invalid" (más común)
        // - "No shipping methods found for recipient address"
        // - "Invalid recipient city for postal code"
        // - "City does not match postal code"
        if (
          (printfulErrorText.includes('recipient') && printfulErrorText.includes('city')) ||
          (printfulErrorText.includes('city') && printfulErrorText.includes('postal')) ||
          (printfulErrorText.includes('city') && printfulErrorText.includes('zip')) ||
          (printfulErrorText.includes('invalid') && printfulErrorText.includes('city')) ||
          (printfulErrorText.includes('no shipping') && printfulErrorText.includes('recipient'))
        ) {
          console.log(`⚠️ [AddressValidation] DETECTED: City-ZIP mismatch → City: ${normalized.city}, ZIP: ${normalized.zipcode}`);
          errorMessage = `La ciudad "${normalized.city}" no corresponde al código postal ${normalized.zipcode}. Por favor verifica que la ciudad y el código postal sean correctos.`;
          errorCode = 'city_zip_mismatch';
        }
        // 🎯 PRIORIDAD 2: Detectar código postal inválido o fuera de rango
        else if (printfulErrorText.includes('recipient.zip') || printfulErrorText.includes('postal code')) {
          console.log(`⚠️ [AddressValidation] DETECTED: Invalid ZIP → ${normalized.zipcode}`);
          errorMessage = `El código postal ${normalized.zipcode} no es válido para ${this.getCountryName(normalized.country_code)}. Verifica que el código postal sea correcto.`;
          errorCode = 'invalid_zip';
        }
        // 🎯 PRIORIDAD 3: Sin métodos de envío (puede ser problema de dirección o país no soportado)
        else if (printfulErrorText.includes('no shipping') || printfulErrorText.includes('no matches found')) {
          console.log(`⚠️ [AddressValidation] DETECTED: No shipping methods available`);
          errorMessage = `No se encontraron métodos de envío para esta dirección. Verifica que el código postal (${normalized.zipcode}) y la ciudad (${normalized.city}) sean correctos y coincidan.`;
          errorCode = 'no_shipping_matches';
        }
        // Detectar país no soportado
        else if (printfulErrorText.includes('recipient.country') && printfulErrorText.includes('not supported')) {
          errorMessage = 'No realizamos envíos a este país.';
          errorCode = 'unsupported_country';
        }
        // Detectar entidad no procesable (error genérico de Printful)
        else if (printfulErrorText.includes('unprocessable') || printfulErrorText.includes('unprocessable_entity')) {
          console.log(`⚠️ [AddressValidation] DETECTED: Unprocessable entity (likely city-zip issue)`);
          errorMessage = `La dirección no puede ser procesada. Asegúrate de que la ciudad "${normalized.city}" corresponda al código postal ${normalized.zipcode}.`;
          errorCode = 'unprocessable_entity';
        }
        // Detectar error de variante (problema técnico, no del usuario)
        else if (printfulErrorText.includes('invalid variant')) {
          errorMessage = 'Error temporal del servicio de validación. Por favor intenta de nuevo en unos segundos.';
          errorCode = 'internal_error';
        }
        // Detectar dirección inválida genérica
        else if (printfulErrorText.includes('address') || printfulErrorText.includes('invalid')) {
          console.log(`⚠️ [AddressValidation] DETECTED: Invalid address (generic)`);
          errorMessage = `La dirección proporcionada no es válida. Verifica que la ciudad "${normalized.city}" y el código postal ${normalized.zipcode} coincidan.`;
          errorCode = 'invalid_address';
        }
        // Detectar problema de país
        else if (printfulErrorText.includes('country')) {
          errorMessage = 'El país especificado no está soportado para envíos.';
          errorCode = 'unsupported_country';
        }
        // Detectar problema de cálculo de envío
        else if (printfulErrorText.includes('shipping') || printfulErrorText.includes('calculate')) {
          errorMessage = 'No se pudo calcular el envío para esta dirección.';
          errorCode = 'no_shipping_rates';
        }
        // Detectar límite de rate
        else if (printfulErrorText.includes('rate limit')) {
          errorMessage = 'Demasiadas solicitudes. Por favor espera un momento e intenta de nuevo.';
          errorCode = 'rate_limit';
        }

        console.log(`❌ [AddressValidation] VALIDATION → FAILED → Code: ${errorCode}`);
        console.log(`❌ [AddressValidation] Error Message: ${errorMessage}`);

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
