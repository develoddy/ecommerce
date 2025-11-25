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
   * Dataset selectivo de códigos postales ↔ ciudades principales
   * Solo incluye las ciudades más comunes para validación local rápida
   * Para direcciones no incluidas, Printful hará la validación final
   */
  private readonly ZIP_CITY_DATABASE: Record<string, Record<string, string[]>> = {
    'ES': {
      // Madrid (28xxx)
      '28001': ['Madrid'], '28002': ['Madrid'], '28003': ['Madrid'], '28004': ['Madrid'],
      '28005': ['Madrid'], '28006': ['Madrid'], '28007': ['Madrid'], '28008': ['Madrid'],
      '28009': ['Madrid'], '28010': ['Madrid'], '28011': ['Madrid'], '28012': ['Madrid'],
      '28013': ['Madrid'], '28014': ['Madrid'], '28015': ['Madrid'], '28016': ['Madrid'],
      '28017': ['Madrid'], '28018': ['Madrid'], '28019': ['Madrid'], '28020': ['Madrid'],
      '28021': ['Madrid'], '28022': ['Madrid'], '28023': ['Madrid'], '28024': ['Madrid'],
      '28025': ['Madrid'], '28026': ['Madrid'], '28027': ['Madrid'], '28028': ['Madrid'],
      '28029': ['Madrid'], '28030': ['Madrid'], '28031': ['Madrid'], '28032': ['Madrid'],
      '28033': ['Madrid'], '28034': ['Madrid'], '28035': ['Madrid'], '28036': ['Madrid'],
      '28037': ['Madrid'], '28038': ['Madrid'], '28039': ['Madrid'], '28040': ['Madrid'],
      '28041': ['Madrid'], '28042': ['Madrid'], '28043': ['Madrid'], '28044': ['Madrid'],
      '28045': ['Madrid'], '28046': ['Madrid'], '28047': ['Madrid'], '28048': ['Madrid'],
      '28049': ['Madrid'], '28050': ['Madrid'],
      '28100': ['Alcobendas'], '28108': ['Alcobendas'],
      '28110': ['El Escorial', 'San Lorenzo de El Escorial'],
      '28120': ['Algete'],
      '28130': ['Valdemorillo'],
      '28140': ['Fuente el Saz de Jarama'],
      '28150': ['Valdetorres de Jarama'],
      '28160': ['Valdeolmos-Alalpardo', 'Valdeolmos'],
      '28170': ['El Molar'],
      '28180': ['Torrelaguna'],
      '28190': ['Venturada'],
      '28200': ['San Lorenzo de El Escorial'],
      '28220': ['Majadahonda'],
      '28230': ['Las Rozas de Madrid', 'Las Rozas'],
      '28240': ['Hoyo de Manzanares'],
      '28250': ['Torrelodones'],
      '28260': ['Galapagar'],
      '28270': ['Colmenarejo'],
      '28280': ['El Escorial'],
      '28290': ['Las Matas'],
      '28300': ['Aranjuez'],
      '28320': ['Pinto'],
      '28330': ['San Martín de la Vega'],
      '28340': ['Valdemoro'],
      '28350': ['Ciempozuelos'],
      '28400': ['Collado Villalba'],
      '28410': ['Manzanares el Real'],
      '28420': ['Galapagar'],
      '28430': ['Alpedrete'],
      '28440': ['Guadarrama'],
      '28450': ['Collado Mediano'],
      '28460': ['Los Molinos'],
      '28470': ['Cercedilla'],
      '28480': ['Bustarviejo'],
      '28490': ['Becerril de la Sierra'],
      '28500': ['Arganda del Rey'],
      '28510': ['Campo Real'],
      '28520': ['Rivas-Vaciamadrid'],
      '28529': ['Rivas-Vaciamadrid'],
      '28530': ['Morata de Tajuña'],
      '28540': ['Loeches'],
      '28550': ['Tielmes'],
      '28560': ['Carabaña'],
      '28600': ['Navalcarnero'],
      '28609': ['Navalcarnero'],
      '28610': ['Villanueva de la Cañada'],
      '28620': ['Guadarrama'],
      '28630': ['Villa del Prado'],
      '28640': ['Cadalso de los Vidrios'],
      '28650': ['Cenicientos'],
      '28660': ['Boadilla del Monte'],
      '28670': ['Villaviciosa de Odón'],
      '28680': ['San Martín de Valdeiglesias'],
      '28690': ['Brunete'],
      '28691': ['Villanueva de Perales'],
      '28692': ['Villamanta'],
      '28700': ['San Sebastián de los Reyes'],
      '28707': ['San Sebastián de los Reyes'],
      '28710': ['El Molar'],
      '28720': ['Bustarviejo'],
      '28730': ['Buitrago del Lozoya'],
      '28740': ['Colmenar Viejo'],
      '28750': ['San Agustín del Guadalix'],
      '28760': ['Tres Cantos'],
      '28770': ['Colmenar Viejo'],
      '28780': ['Colmenar de Oreja'],
      '28790': ['Pedrezuela'],
      '28800': ['Alcalá de Henares'],
      '28801': ['Alcalá de Henares'],
      '28802': ['Alcalá de Henares'],
      '28803': ['Alcalá de Henares'],
      '28804': ['Alcalá de Henares'],
      '28805': ['Alcalá de Henares'],
      '28806': ['Alcalá de Henares'],
      '28807': ['Alcalá de Henares'],
      '28810': ['Villalbilla'],
      '28820': ['Coslada'],
      '28821': ['Coslada'],
      '28822': ['Coslada'],
      '28823': ['Coslada'],
      '28830': ['San Fernando de Henares'],
      '28840': ['Mejorada del Campo'],
      '28850': ['Torrejón de Ardoz'],
      '28860': ['Paracuellos de Jarama'],
      '28870': ['Ajalvir'],
      '28880': ['Meco'],
      '28890': ['Loeches'],
      '28891': ['Velilla de San Antonio'],
      '28892': ['Velilla de San Antonio'],
      '28900': ['Getafe'],
      '28901': ['Getafe'],
      '28902': ['Getafe'],
      '28903': ['Getafe'],
      '28904': ['Getafe'],
      '28905': ['Getafe'],
      '28906': ['Getafe'],
      '28907': ['Getafe'],
      '28908': ['Getafe'],
      '28909': ['Getafe'],
      '28910': ['Leganés'],
      '28911': ['Leganés'],
      '28912': ['Leganés'],
      '28913': ['Leganés'],
      '28914': ['Leganés'],
      '28915': ['Leganés'],
      '28916': ['Leganés'],
      '28917': ['Leganés'],
      '28918': ['Leganés'],
      '28919': ['Leganés'],
      '28920': ['Alcorcón'],
      '28921': ['Alcorcón'],
      '28922': ['Alcorcón'],
      '28923': ['Alcorcón'],
      '28924': ['Alcorcón'],
      '28925': ['Alcorcón'],
      '28930': ['Móstoles'],
      '28931': ['Móstoles'],
      '28932': ['Móstoles'],
      '28933': ['Móstoles'],
      '28934': ['Móstoles'],
      '28935': ['Móstoles'],
      '28936': ['Móstoles'],
      '28937': ['Móstoles'],
      '28938': ['Móstoles'],
      '28939': ['Móstoles'],
      '28940': ['Fuenlabrada'],
      '28941': ['Fuenlabrada'],
      '28942': ['Fuenlabrada'],
      '28943': ['Fuenlabrada'],
      '28944': ['Fuenlabrada'],
      '28945': ['Fuenlabrada'],
      '28946': ['Fuenlabrada'],
      '28947': ['Fuenlabrada'],
      '28948': ['Fuenlabrada'],
      '28949': ['Fuenlabrada'],
      '28950': ['Moraleja de Enmedio'],
      '28970': ['Humanes de Madrid'],
      '28971': ['Griñón'],
      '28980': ['Parla'],
      '28981': ['Parla'],
      '28982': ['Parla'],
      '28990': ['Torrejón de la Calzada'],
      '28991': ['Torrejón de Velasco'],
      '28992': ['Torrejón de Velasco'],
      // Barcelona (08xxx)
      '08001': ['Barcelona'], '08002': ['Barcelona'], '08003': ['Barcelona'], '08004': ['Barcelona'],
      '08005': ['Barcelona'], '08006': ['Barcelona'], '08007': ['Barcelona'], '08008': ['Barcelona'],
      '08009': ['Barcelona'], '08010': ['Barcelona'], '08011': ['Barcelona'], '08012': ['Barcelona'],
      '08013': ['Barcelona'], '08014': ['Barcelona'], '08015': ['Barcelona'], '08016': ['Barcelona'],
      '08017': ['Barcelona'], '08018': ['Barcelona'], '08019': ['Barcelona'], '08020': ['Barcelona'],
      '08021': ['Barcelona'], '08022': ['Barcelona'], '08023': ['Barcelona'], '08024': ['Barcelona'],
      '08025': ['Barcelona'], '08026': ['Barcelona'], '08027': ['Barcelona'], '08028': ['Barcelona'],
      '08029': ['Barcelona'], '08030': ['Barcelona'], '08031': ['Barcelona'], '08032': ['Barcelona'],
      '08033': ['Barcelona'], '08034': ['Barcelona'], '08035': ['Barcelona'], '08036': ['Barcelona'],
      '08037': ['Barcelona'], '08038': ['Barcelona'], '08039': ['Barcelona'], '08040': ['Barcelona'],
      '08041': ['Barcelona'],
      '08100': ['Mollet del Vallès', 'Mollet del Valles'],
      '08190': ['Sant Cugat del Vallès', 'Sant Cugat del Valles'],
      '08201': ['Sabadell'], '08202': ['Sabadell'], '08203': ['Sabadell'],
      '08221': ['Terrassa'], '08222': ['Terrassa'], '08223': ['Terrassa'],
      '08290': ['Cerdanyola del Vallès', 'Cerdanyola del Valles'],
      '08800': ['Vilanova i la Geltrú', 'Vilanova i la Geltru'],
      '08901': ['L\'Hospitalet de Llobregat', 'Hospitalet de Llobregat'],
      '08902': ['L\'Hospitalet de Llobregat', 'Hospitalet de Llobregat'],
      '08903': ['L\'Hospitalet de Llobregat', 'Hospitalet de Llobregat'],
      // Valencia (46xxx)
      '46001': ['Valencia', 'València'], '46002': ['Valencia', 'València'],
      '46003': ['Valencia', 'València'], '46004': ['Valencia', 'València'],
      '46005': ['Valencia', 'València'], '46006': ['Valencia', 'València'],
      '46007': ['Valencia', 'València'], '46008': ['Valencia', 'València'],
      '46009': ['Valencia', 'València'], '46010': ['Valencia', 'València'],
      '46011': ['Valencia', 'València'], '46012': ['Valencia', 'València'],
      '46013': ['Valencia', 'València'], '46014': ['Valencia', 'València'],
      '46015': ['Valencia', 'València'], '46016': ['Valencia', 'València'],
      '46017': ['Valencia', 'València'], '46018': ['Valencia', 'València'],
      '46019': ['Valencia', 'València'], '46020': ['Valencia', 'València'],
      '46021': ['Valencia', 'València'], '46022': ['Valencia', 'València'],
      '46023': ['Valencia', 'València'], '46024': ['Valencia', 'València'],
      '46025': ['Valencia', 'València'],
      // Sevilla (41xxx)
      '41001': ['Sevilla'], '41002': ['Sevilla'], '41003': ['Sevilla'],
      '41004': ['Sevilla'], '41005': ['Sevilla'], '41006': ['Sevilla'],
      '41007': ['Sevilla'], '41008': ['Sevilla'], '41009': ['Sevilla'],
      '41010': ['Sevilla'], '41011': ['Sevilla'], '41012': ['Sevilla'],
      '41013': ['Sevilla'], '41014': ['Sevilla'], '41015': ['Sevilla'],
      '41016': ['Sevilla'], '41017': ['Sevilla'], '41018': ['Sevilla'],
      '41019': ['Sevilla'], '41020': ['Sevilla'],
      // Zaragoza (50xxx)
      '50001': ['Zaragoza'], '50002': ['Zaragoza'], '50003': ['Zaragoza'],
      '50004': ['Zaragoza'], '50005': ['Zaragoza'], '50006': ['Zaragoza'],
      '50007': ['Zaragoza'], '50008': ['Zaragoza'], '50009': ['Zaragoza'],
      '50010': ['Zaragoza'], '50011': ['Zaragoza'], '50012': ['Zaragoza'],
      '50013': ['Zaragoza'], '50014': ['Zaragoza'], '50015': ['Zaragoza'],
      '50016': ['Zaragoza'], '50017': ['Zaragoza'], '50018': ['Zaragoza'],
      // Málaga (29xxx)
      '29001': ['Málaga', 'Malaga'], '29002': ['Málaga', 'Malaga'],
      '29003': ['Málaga', 'Malaga'], '29004': ['Málaga', 'Malaga'],
      '29005': ['Málaga', 'Malaga'], '29006': ['Málaga', 'Malaga'],
      '29007': ['Málaga', 'Malaga'], '29008': ['Málaga', 'Malaga'],
      '29009': ['Málaga', 'Malaga'], '29010': ['Málaga', 'Malaga'],
      '29011': ['Málaga', 'Malaga'], '29012': ['Málaga', 'Malaga'],
      '29013': ['Málaga', 'Malaga'], '29014': ['Málaga', 'Malaga'],
      '29015': ['Málaga', 'Malaga'], '29016': ['Málaga', 'Malaga'],
      '29017': ['Málaga', 'Malaga'], '29018': ['Málaga', 'Malaga'],
      // Bilbao (48xxx)
      '48001': ['Bilbao'], '48002': ['Bilbao'], '48003': ['Bilbao'],
      '48004': ['Bilbao'], '48005': ['Bilbao'], '48006': ['Bilbao'],
      '48007': ['Bilbao'], '48008': ['Bilbao'], '48009': ['Bilbao'],
      '48010': ['Bilbao'], '48011': ['Bilbao'], '48012': ['Bilbao'],
      '48013': ['Bilbao'], '48014': ['Bilbao'], '48015': ['Bilbao'],
    },
    'FR': {
      // París (75xxx)
      '75001': ['Paris'], '75002': ['Paris'], '75003': ['Paris'], '75004': ['Paris'],
      '75005': ['Paris'], '75006': ['Paris'], '75007': ['Paris'], '75008': ['Paris'],
      '75009': ['Paris'], '75010': ['Paris'], '75011': ['Paris'], '75012': ['Paris'],
      '75013': ['Paris'], '75014': ['Paris'], '75015': ['Paris'], '75016': ['Paris'],
      '75017': ['Paris'], '75018': ['Paris'], '75019': ['Paris'], '75020': ['Paris'],
      // Lyon (69xxx)
      '69001': ['Lyon'], '69002': ['Lyon'], '69003': ['Lyon'], '69004': ['Lyon'],
      '69005': ['Lyon'], '69006': ['Lyon'], '69007': ['Lyon'], '69008': ['Lyon'],
      '69009': ['Lyon'],
      // Marseille (13xxx)
      '13001': ['Marseille'], '13002': ['Marseille'], '13003': ['Marseille'],
      '13004': ['Marseille'], '13005': ['Marseille'], '13006': ['Marseille'],
      '13007': ['Marseille'], '13008': ['Marseille'], '13009': ['Marseille'],
      '13010': ['Marseille'], '13011': ['Marseille'], '13012': ['Marseille'],
      '13013': ['Marseille'], '13014': ['Marseille'], '13015': ['Marseille'],
      '13016': ['Marseille'],
    },
    'DE': {
      // Berlín (10xxx - 14xxx)
      '10115': ['Berlin'], '10117': ['Berlin'], '10119': ['Berlin'],
      '10178': ['Berlin'], '10179': ['Berlin'], '10243': ['Berlin'],
      '10245': ['Berlin'], '10247': ['Berlin'], '10249': ['Berlin'],
      // Munich (80xxx - 81xxx)
      '80331': ['München', 'Munich'], '80333': ['München', 'Munich'],
      '80335': ['München', 'Munich'], '80336': ['München', 'Munich'],
      '80337': ['München', 'Munich'], '80339': ['München', 'Munich'],
      // Frankfurt (60xxx)
      '60311': ['Frankfurt'], '60313': ['Frankfurt'], '60314': ['Frankfurt'],
      '60316': ['Frankfurt'], '60318': ['Frankfurt'], '60320': ['Frankfurt'],
    },
    'IT': {
      // Roma (00xxx)
      '00118': ['Roma', 'Rome'], '00119': ['Roma', 'Rome'],
      '00120': ['Roma', 'Rome'], '00121': ['Roma', 'Rome'],
      '00122': ['Roma', 'Rome'], '00123': ['Roma', 'Rome'],
      '00124': ['Roma', 'Rome'], '00125': ['Roma', 'Rome'],
      // Milano (20xxx)
      '20121': ['Milano', 'Milan'], '20122': ['Milano', 'Milan'],
      '20123': ['Milano', 'Milan'], '20124': ['Milano', 'Milan'],
      '20125': ['Milano', 'Milan'], '20126': ['Milano', 'Milan'],
    },
    'PT': {
      // Lisboa (1xxx-xxx)
      '1000-001': ['Lisboa', 'Lisbon'], '1050-001': ['Lisboa', 'Lisbon'],
      '1100-001': ['Lisboa', 'Lisbon'], '1150-001': ['Lisboa', 'Lisbon'],
      '1200-001': ['Lisboa', 'Lisbon'], '1250-001': ['Lisboa', 'Lisbon'],
      // Porto (4xxx-xxx)
      '4000-001': ['Porto'], '4050-001': ['Porto'],
      '4100-001': ['Porto'], '4150-001': ['Porto'],
    }
  };

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

  /**
   * URL base de la API del backend
   */
  private readonly API_URL = environment.URL_SERVICE;

  constructor(
    private ecommerceAuthService: EcommerceAuthService,
    private http: HttpClient
  ) {
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
        // Si el backend no tiene el CP, devolver null para fallback a Printful
        if (error.status === 404) {
          console.log('ℹ️ [AddressValidation] ZIP not found in backend database - fallback to Printful');
          return of(null);
        }
        return of(null);
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
   * ⚠️ DEPRECATED: Usar getPostalCodeInfo() y validateCrossCheck() del backend
   * Valida que la ciudad coincida con el código postal usando dataset local
   * @returns null si es válido o si no está en el dataset (fallback a Printful), mensaje de error si no coincide
   */
  validateCityMatchesZip(city: string, zipCode: string, countryCode: string): string | null {
    try {
      const cleanZip = this.normalizeZip(zipCode, countryCode);
      const country = countryCode.toUpperCase();
      const normalizedInputCity = this.normalizeString(city);
      
      console.log(`🔍 [AddressValidation] Checking if city "${city}" matches ZIP ${cleanZip} in ${country}`);
      
      // Verificar si tenemos este país en el dataset
      const countryData = this.ZIP_CITY_DATABASE[country];
      if (!countryData) {
        console.log(`ℹ️ [AddressValidation] No dataset for country ${country} - fallback to Printful validation`);
        return null; // No tenemos data para este país, Printful validará
      }
      
      // Verificar si tenemos este CP en el dataset
      const validCities = countryData[cleanZip];
      if (!validCities || validCities.length === 0) {
        console.log(`ℹ️ [AddressValidation] ZIP ${cleanZip} not in dataset - fallback to Printful validation`);
        return null; // No tenemos data para este CP específico, Printful validará
      }
      
      // Normalizar todas las ciudades válidas y comparar
      const normalizedValidCities = validCities.map(c => this.normalizeString(c));
      const isValidCity = normalizedValidCities.includes(normalizedInputCity);
      
      if (!isValidCity) {
        console.log(`❌ [AddressValidation] City mismatch detected!`);
        console.log(`   Input city: "${city}" (normalized: "${normalizedInputCity}")`);
        console.log(`   Valid cities for ${cleanZip}: ${validCities.join(', ')}`);
        
        return `La ciudad "${city}" no corresponde al código postal ${cleanZip}. Las ciudades válidas para este código postal son: ${validCities.join(', ')}. Por favor verifica los datos.`;
      }
      
      console.log(`✅ [AddressValidation] City "${city}" matches ZIP ${cleanZip}`);
      return null; // Válido
      
    } catch (error) {
      console.warn('⚠️ [AddressValidation] Error validating city-ZIP match:', error);
      return null; // Fallback: no bloquear si hay error
    }
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
      console.log(`❌ [AddressValidation] ZIP format validation failed: ${zipValidation}`);
      return {
        isValid: false,
        message: zipValidation,
        error: 'invalid_zip_format'
      };
    }

    // 4. ⭐ VALIDACIÓN PRIORITARIA: Existencia REAL del código postal
    // Esta validación usa postal-codes-js para verificar que el CP existe
    console.log('🔍 [AddressValidation] Checking ZIP existence with postal-codes-js...');
    const zipExistsValidation = this.validateZipCodeExistence(
      normalized.zipcode, 
      normalized.country_code,
      normalized.city
    );
    
    if (zipExistsValidation) {
      console.log(`❌ [AddressValidation] ZIP existence validation FAILED: ${zipExistsValidation}`);
      return {
        isValid: false,
        message: zipExistsValidation,
        error: 'zip_not_found'
      };
    }

    // 5. 🎯 VALIDACIÓN CRÍTICA: Ciudad ↔ Código Postal coinciden (backend API o dataset local como fallback)
    // NOTA: Esta validación ahora es ASÍNCRONA - debe usarse validateLocalRulesAsync()
    // Para mantener compatibilidad, usamos el dataset local aquí (método legacy)
    console.log('🔍 [AddressValidation] Checking if city matches ZIP (local dataset - legacy)...');
    const cityZipValidation = this.validateCityMatchesZip(
      normalized.city,
      normalized.zipcode,
      normalized.country_code
    );
    
    if (cityZipValidation) {
      console.log(`❌ [AddressValidation] City-ZIP validation FAILED: ${cityZipValidation}`);
      return {
        isValid: false,
        message: cityZipValidation,
        error: 'city_zip_mismatch'
      };
    }

    console.log('✅ [AddressValidation] Local validation passed (format + existence + city-zip match)');
    console.log('💡 [AddressValidation] TIP: Use validateLocalRulesAsync() for backend API validation');
    return {
      isValid: true,
      message: 'Validación local correcta - Dirección verificada'
    };
  }

  /**
   * 🎯 NUEVA VERSIÓN: Validación local asíncrona usando backend API
   * Este método reemplaza a validateLocalRules() con validación del backend
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
