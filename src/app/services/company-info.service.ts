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
  readonly companyPhone: string = '+34 605 97 44 36'; // opcional
  readonly companyAddress: string = 'Madrid, España'; // dejar vacío hasta regularizar
  readonly companyNIF: string = ''; // dejar vacío hasta regularizar
  readonly companyWebsite: string = 'https://tienda.lujandev.com';

  /**
   * Datos de contacto para ejercicio de derechos ARCO
   */
  readonly supportEmail: string = 'lujandev@lujandev.com';

  /**
   * Dirección completa para devoluciones (opcional, usar cuando esté disponible)
   */
  readonly returnAddress: string = ''; // [COMPLETAR_CON_DIRECCIÓN_DEVOLUCIONES]

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
    return !!(this.companyNIF && this.companyAddress && this.companyAddress !== 'Madrid, España');
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
    if (!this.companyAddress || this.companyAddress === 'Madrid, España') {
      return this.getPlaceholder('address');
    }
    return this.companyAddress;
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
