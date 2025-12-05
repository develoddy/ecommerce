import { Injectable } from '@angular/core';

/**
 * Servicio centralizado para la información legal de la empresa.
 * Proporciona una única fuente de verdad para datos fiscales y de contacto
 * utilizados en documentos legales (Aviso Legal, Privacidad, Cookies, Condiciones de Venta).
 * 
 * @example
 * constructor(public company: CompanyInfoService) {}
 * 
 * // En el template:
 * <p>{{ company.companyName }}</p>
 * <p>{{ company.companyEmail }}</p>
 */
@Injectable({
  providedIn: 'root'
})
export class CompanyInfoService {

  /**
   * Datos de la empresa
   */
  readonly companyName: string = 'LUJANDEV';
  readonly companyEmail: string = 'lujandev@lujandev.com';
  readonly companyPhone: string = '+34 605 97 44 36';
  readonly companyWebsite: string = 'https://tienda.lujandev.com';

  /**
   * ⚠️ DATOS FISCALES - COMPLETAR ANTES DEL LANZAMIENTO
   * Estos datos son obligatorios para el cumplimiento legal (LSSI, RGPD) y facturación
   */
  readonly companyNIF: string = 'B12345678'; // CIF de prueba de sociedad futura // ⚠️ COMPLETAR: NIF/CIF de la empresa
  readonly companyAddress: string = 'Calle Falsa 123, 1º A'; // ⚠️ COMPLETAR: Dirección fiscal completa
  readonly companyCity: string = 'Madrid'; // ⚠️ COMPLETAR: Ciudad
  readonly companyPostalCode: string = '28080'; // ⚠️ COMPLETAR: Código postal
  readonly companyCountry: string = 'España';
  readonly companyLegalForm: string = 'Sociedad Limitada (SL)';  // ⚠️ COMPLETAR: Persona Física / SL / SA / etc.

  
  /**
   * Datos del Registro Mercantil (solo si aplica - sociedades)
   */
  readonly mercantileRegister: {
    tomo?: string;
    libro?: string;
    folio?: string;
    seccion?: string;
    hoja?: string;
    inscripcion?: string;
  } = {};

  /**
   * Datos de contacto para ejercicio de derechos ARCO
   */
  readonly supportEmail: string = 'lujandev@lujandev.com';

  /**
   * Dirección completa para devoluciones (opcional)
   */
  readonly returnAddress: string = ''; // ⚠️ COMPLETAR: Si difiere de la dirección fiscal
  readonly returnContact: string = ''; // ⚠️ COMPLETAR: Persona de contacto para devoluciones

  /**
   * Información del Delegado de Protección de Datos (DPO)
   * Dejar vacío si no aplica por tamaño de empresa
   */
  readonly dpoInfo: string = 'No es obligatorio por el tamaño de la empresa';

  /**
   * Información del proveedor de hosting y almacenamiento
   */
   readonly hostingProvider: string = 'Dinahosting';
   readonly hostingLocation: string = 'España (UE)';

  /**
   * Proveedor de email transaccional y comunicaciones
   */
   readonly emailProvider: string = 'Dinahosting';
   readonly emailProviderLocation: string = 'España (UE)';
   readonly emailProviderPurpose: string = 'Envío de emails transaccionales (confirmación de pedido, seguimiento) y comunicaciones básicas';
   readonly emailProviderSharedData: string = 'Email, nombre y datos del pedido necesarios para confirmar la compra';


  constructor() { }

  /**
   * Verifica si los datos fiscales obligatorios están completos
   * Útil para validaciones o mostrar advertencias en el admin panel
   */
  hasCompleteFiscalData(): boolean {
    return !!(
      this.companyNIF && 
      this.companyAddress && 
      this.companyCity && 
      this.companyPostalCode &&
      this.companyLegalForm
    );
  }

  /**
   * Obtiene la dirección fiscal completa formateada
   */
  getFullFiscalAddress(): string {
    if (!this.hasCompleteFiscalData()) {
      return this.getPlaceholder('address');
    }
    
    return `${this.companyAddress}, ${this.companyPostalCode} ${this.companyCity}, ${this.companyCountry}`;
  }

  /**
   * Verifica si necesita datos del Registro Mercantil (sociedades)
   */
  needsMercantileRegister(): boolean {
    return this.companyLegalForm.includes('SL') || 
           this.companyLegalForm.includes('SA') ||
           this.companyLegalForm.includes('Sociedad');
  }

  /**
   * Obtiene la información del Registro Mercantil formateada
   */
  getMercantileRegisterInfo(): string {
    if (!this.needsMercantileRegister()) {
      return 'No aplica (persona física)';
    }

    const reg = this.mercantileRegister;
    if (!reg.tomo || !reg.libro || !reg.folio) {
      return '[COMPLETAR DATOS DEL REGISTRO MERCANTIL]';
    }

    return `Tomo ${reg.tomo}, Libro ${reg.libro}, Folio ${reg.folio}, Sección ${reg.seccion}, Hoja ${reg.hoja}, Inscripción ${reg.inscripcion}`;
  }

  /**
   * Obtiene el estado de completitud de los datos fiscales
   */
  getFiscalDataCompleteness(): {
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
  } {
    const requiredFields = [
      { field: 'companyNIF', label: 'NIF/CIF', value: this.companyNIF },
      { field: 'companyAddress', label: 'Dirección fiscal', value: this.companyAddress },
      { field: 'companyCity', label: 'Ciudad', value: this.companyCity },
      { field: 'companyPostalCode', label: 'Código postal', value: this.companyPostalCode },
      { field: 'companyLegalForm', label: 'Forma jurídica', value: this.companyLegalForm }
    ];

    if (this.needsMercantileRegister()) {
      requiredFields.push(
        { field: 'mercantileRegister.tomo', label: 'Registro Mercantil - Tomo', value: this.mercantileRegister.tomo || '' },
        { field: 'mercantileRegister.libro', label: 'Registro Mercantil - Libro', value: this.mercantileRegister.libro || '' },
        { field: 'mercantileRegister.folio', label: 'Registro Mercantil - Folio', value: this.mercantileRegister.folio || '' }
      );
    }

    const missingFields = requiredFields
      .filter(item => !item.value)
      .map(item => item.label);

    const completionPercentage = Math.round(
      ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
    );

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      completionPercentage
    };
  }

  /**
   * Obtiene el placeholder para datos pendientes
   */
  getPlaceholder(field: 'nif' | 'address' | 'phone' | 'return_address'): string {
    const placeholders = {
      nif: '[COMPLETAR_CON_TU_NIF]',
      address: '[COMPLETAR_CON_TU_DIRECCIÓN_COMPLETA]',
      phone: '[OPCIONAL_COMPLETAR_TELÉFONO]',
      return_address: '[COMPLETAR_CON_DIRECCIÓN_DEVOLUCIONES]'
    };
    return placeholders[field];
  }

  /**
   * Obtiene el NIF formateado o el placeholder si está vacío
   */
  getFormattedNIF(): string {
    return this.companyNIF || this.getPlaceholder('nif');
  }

  /**
   * Obtiene la dirección formateada o el placeholder si está vacío/temporal
   */
  getFormattedAddress(): string {
    if (!this.companyAddress) {
      return this.getPlaceholder('address');
    }
    return this.getFullFiscalAddress();
  }

  /**
   * Obtiene el teléfono formateado o el placeholder si está vacío
   */
  getFormattedPhone(): string {
    return this.companyPhone || this.getPlaceholder('phone');
  }

  /**
   * Obtiene la dirección de devoluciones o el placeholder si está vacía
   */
  getFormattedReturnAddress(): string {
    return this.returnAddress || this.getPlaceholder('return_address');
  }
}
