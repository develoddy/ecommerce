import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class AddressManagerService {

  // Estados reactivos para las direcciones
  private addressClientsSubject = new BehaviorSubject<any[]>([]);
  public addressClients$ = this.addressClientsSubject.asObservable();

  private addressGuestSubject = new BehaviorSubject<any[]>([]);
  public addressGuest$ = this.addressGuestSubject.asObservable();

  private selectedAddressSubject = new BehaviorSubject<any>(null);
  public selectedAddress$ = this.selectedAddressSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Carga las direcciones del cliente autenticado
   */
  loadClientAddresses(userId: number): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}address_client/list/${userId}`;
    
    return this.http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Carga las direcciones del guest por email
   */
  loadGuestAddresses(email: string): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}address_guest/list?email=${email}`;
    
    return this.http.get(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Actualiza el estado local de direcciones de cliente
   */
  updateClientAddresses(addresses: any[]): void {
    this.addressClientsSubject.next(addresses || []);
  }

  /**
   * Actualiza el estado local de direcciones de guest
   */
  updateGuestAddresses(addresses: any[]): void {
    this.addressGuestSubject.next(addresses || []);
  }

  /**
   * Obtiene las direcciones actuales del cliente
   */
  getCurrentClientAddresses(): any[] {
    return this.addressClientsSubject.value || [];
  }

  /**
   * Obtiene las direcciones actuales del guest
   */
  getCurrentGuestAddresses(): any[] {
    return this.addressGuestSubject.value || [];
  }

  /**
   * Verifica si existen direcciones para un cliente
   */
  checkIfClientAddressExists(addresses: any[]): boolean {
    return addresses && addresses.length > 0;
  }

  /**
   * Verifica si existen direcciones para un guest
   */
  checkIfGuestAddressExists(addresses: any[]): boolean {
    return addresses && addresses.length > 0;
  }

  /**
   * Selecciona una dirección específica
   */
  selectAddress(address: any): void {
    this.selectedAddressSubject.next(address);
  }

  /**
   * Obtiene la dirección actualmente seleccionada
   */
  getSelectedAddress(): any {
    return this.selectedAddressSubject.value;
  }

  /**
   * Guarda una nueva dirección de cliente
   */
  saveClientAddress(addressData: any): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}address_client/store`;
    
    return this.http.post(URL, addressData).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Guarda una nueva dirección de guest
   */
  saveGuestAddress(addressData: any): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}address_guest/store`;
    
    return this.http.post(URL, addressData).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Actualiza una dirección de cliente existente
   */
  updateClientAddress(addressId: number, addressData: any): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}address_client/update/${addressId}`;
    
    return this.http.put(URL, addressData).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Actualiza una dirección de guest existente
   */
  updateGuestAddress(addressId: number, addressData: any): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}address_guest/update/${addressId}`;
    
    return this.http.put(URL, addressData).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Elimina una dirección de cliente
   */
  deleteClientAddress(addressId: number): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}address_client/delete/${addressId}`;
    
    return this.http.delete(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Elimina una dirección de guest
   */
  deleteGuestAddress(addressId: number): Observable<any> {
    this.loadingSubject.next(true);
    let URL = `${URL_SERVICE}address_guest/delete/${addressId}`;
    
    return this.http.delete(URL).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Valida los datos de una dirección
   */
  validateAddressData(addressData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!addressData.name || addressData.name.trim() === '') {
      errors.push('El nombre es requerido');
    }

    if (!addressData.surname || addressData.surname.trim() === '') {
      errors.push('El apellido es requerido');
    }

    if (!addressData.address || addressData.address.trim() === '') {
      errors.push('La dirección es requerida');
    }

    if (!addressData.region || addressData.region.trim() === '') {
      errors.push('La región es requerida');
    }

    if (!addressData.provincia || addressData.provincia.trim() === '') {
      errors.push('La provincia es requerida');
    }

    if (!addressData.distrito || addressData.distrito.trim() === '') {
      errors.push('El distrito es requerido');
    }

    if (!addressData.zip || addressData.zip.trim() === '') {
      errors.push('El código postal es requerido');
    }

    if (!addressData.phone || addressData.phone.trim() === '') {
      errors.push('El teléfono es requerido');
    }

    // Validar formato de teléfono
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (addressData.phone && !phoneRegex.test(addressData.phone)) {
      errors.push('El formato del teléfono no es válido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtiene la dirección por defecto del usuario
   */
  getDefaultAddress(addresses: any[]): any {
    if (!addresses || addresses.length === 0) return null;
    
    const defaultAddress = addresses.find(addr => addr.is_default === true || addr.is_default === 1);
    return defaultAddress || addresses[0];
  }

  /**
   * Establece una dirección como predeterminada
   */
  setDefaultAddress(addressId: number, isClient: boolean = true): Observable<any> {
    this.loadingSubject.next(true);
    
    const endpoint = isClient ? 'address_client' : 'address_guest';
    let URL = `${URL_SERVICE}${endpoint}/set_default/${addressId}`;
    
    return this.http.put(URL, {}).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Resetea todos los estados del servicio
   */
  resetStates(): void {
    this.addressClientsSubject.next([]);
    this.addressGuestSubject.next([]);
    this.selectedAddressSubject.next(null);
  }
}