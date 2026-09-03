import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AddressValidationService, PostalCodeCheckResult, PostalCodeCheckState } from '../../_services/address-validation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DynamicRouterService } from 'src/app/services/dynamic-router.service';
import { LocalizationService } from 'src/app/services/localization.service';

declare var $:any;

declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-edit-address',
  templateUrl: './edit-address.component.html',
  styleUrls: ['./edit-address.component.css']
})
export class EditAddressComponent implements OnInit {

  address_client_selected:any = null;

  listAddressClients:any = [];

  // Address
  name: string = '';
  surname: string = '';
  pais: string = 'ES'; // Por defecto España
  calle: string = ''; // Nombre de la calle
  numero: string = ''; // Número de la calle (obligatorio)
  apartamento: string = ''; // Apartamento/Piso (opcional)
  address: string = ''; // Dirección completa (se genera combinando calle + numero + apartamento)
  zipcode: string = '';
  poblacion: string = ''; // Ciudad/población
  ciudad: string = ''; // Provincia/estado
  email: string = '';
  phone: string = '';
  usual_shipping_address:boolean=false;
  
  // Validación
  isValidating: boolean = false;
  validationMessage: string = '';
  
  // 🎯 Flujo Mango.es: Autocompletado de provincia y ciudades
  availableCities: Array<{city: string, isPrimary: boolean}> = [];
  isLoadingPostalCode: boolean = false;
  isProvinceReadonly: boolean = true;
  postalCodeError: string = '';
  cityError: string = '';
  // 🎯 Estado de clasificación del CP (INVALID_FORMAT / FOUND / NOT_FOUND / TECHNICAL_ERROR)
  postalCodeState: PostalCodeCheckState | null = null;
  postalCodeWarning: string = '';
  isManualFallback: boolean = false;
  private lastCheckedZip: string = '';

  idAdressClient:any=null;
  queryParamsSubscription: Subscription | undefined;

  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  loading: boolean = false;
  private isSubmitting: boolean = false; // Prevenir múltiples submissions
  private subscriptions: Subscription = new Subscription();
  CURRENT_USER_AUTHENTICATED:any=null;
  locale: string = "";
  country: string = "";

  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
    private addressValidationService: AddressValidationService,
    private router: Router,
    public _routerActived: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private dynamicRouter: DynamicRouterService,
    private localizationService: LocalizationService
  ) {
    this.country = this.localizationService.country;
    this.locale = this.localizationService.locale;
  }
  
  /**
   * Obtiene la lista de países del pre-launch (los 4 principales)
   * Post-validación se expandirá gradualmente
   */
  get supportedCountries() {
    // 🇪🇸 TEMPORAL: formulario restringido a España durante la fase de validación comercial.
    // PRE_LAUNCH_COUNTRIES (FR/IT/DE) se mantiene intacto en el servicio para reactivarlo más adelante.
    return this.addressValidationService.getAvailableCountries(true).filter(country => country.code === 'ES');
  }

  /**
   * Se ejecuta cuando el usuario cambia el país manualmente
   */
  onCountryChange() {
    console.log(`🌍 [EditAddress] País cambiado a: '${this.pais}'`);
    // Limpiar CP, provincia y ciudad cuando se cambia de país
    if (this.zipcode) {
      this.availableCities = [];
      this.ciudad = '';
      this.poblacion = '';
    }
  }
  
  /**
   * 🎯 Método tipo Mango.es: Autocompletar provincia y ciudades al ingresar código postal
   * Se ejecuta cuando el usuario termina de escribir el CP (blur o change)
   */
  onZipCodeChange(zipCode: string) {
    // 🔍 Verificar que haya país seleccionado
    if (!this.pais) {
      this.postalCodeError = 'Por favor, selecciona primero un país';
      return;
    }

    const trimmed = (zipCode || '').trim();

    if (!trimmed) {
      this.lastCheckedZip = '';
      this.resetPostalCodeState();
      return;
    }

    // Mismo CP ya evaluado: no repetir la llamada ni pisar datos manuales ya introducidos
    if (trimmed === this.lastCheckedZip) {
      return;
    }
    this.lastCheckedZip = trimmed;

    this.postalCodeError = '';
    this.cityError = '';
    this.isLoadingPostalCode = true;
    const countryCode = this.addressValidationService.getCountryCode(this.pais);

    console.log(`🔍 [EditAddress] Verificando CP ${trimmed} en ${countryCode}`);

    this.addressValidationService.checkPostalCode(trimmed, countryCode).subscribe({
      next: (result) => {
        this.isLoadingPostalCode = false;
        console.log(`🔍 [EditAddress] Estado CP ${trimmed}:`, result.state);
        this.applyPostalCodeState(result);
      }
    });
  }

  /**
   * 🎯 Aplica el estado de clasificación del CP a los campos del formulario.
   * Evita mezclar datos derivados/manuales de un CP anterior (sin estados "stale").
   */
  private applyPostalCodeState(result: PostalCodeCheckResult) {
    this.postalCodeState = result.state;
    this.postalCodeError = '';
    this.postalCodeWarning = '';
    this.isManualFallback = result.state === 'NOT_FOUND' || result.state === 'TECHNICAL_ERROR';
    this.isProvinceReadonly = !this.isManualFallback;

    if (result.state !== 'FOUND') {
      this.availableCities = [];
      this.ciudad = '';
      this.poblacion = '';
    }

    switch (result.state) {
      case 'INVALID_FORMAT':
        this.postalCodeError = result.message;
        break;
      case 'FOUND': {
        this.ciudad = result.info?.province || '';
        const cities = result.info?.cities || [];
        this.availableCities = cities;

        // 🔥 Dar tiempo al *ngIf para renderizar el select antes de asignar poblacion
        setTimeout(() => {
          if (cities.length === 1) {
            this.poblacion = cities[0].city.trim();
          } else if (cities.length > 1) {
            // Mantener la ciudad actual si sigue estando entre las disponibles (case-insensitive)
            const poblacionNormalizada = this.poblacion?.trim().toLowerCase();
            const matchedCity = cities.find(c => c.city.trim().toLowerCase() === poblacionNormalizada);
            this.poblacion = matchedCity ? matchedCity.city : '';
          } else {
            this.poblacion = '';
          }
        }, 0);
        break;
      }
      case 'NOT_FOUND':
      case 'TECHNICAL_ERROR':
        this.postalCodeWarning = result.message;
        break;
    }
  }

  private resetPostalCodeState() {
    this.postalCodeState = null;
    this.postalCodeError = '';
    this.postalCodeWarning = '';
    this.isManualFallback = false;
    this.isProvinceReadonly = true;
    this.availableCities = [];
    this.ciudad = '';
    this.poblacion = '';
  }

  ngOnInit(): void {
    this.SPINNER();
    this.subscribeToLocalization();
    this.verifyAuthenticatedUser();
    this.checkIfAddressClientExists();
    this.subscribeToQueryParams();
    this.showProfileClient();
  }
  
  private subscribeToLocalization(): void {
    // Suscribirse a cambios de country y locale
    this.subscriptions.add(
      this.localizationService.country$.subscribe(country => {
        this.country = country;
      })
    );
    
    this.subscriptions.add(
      this.localizationService.locale$.subscribe(locale => {
        this.locale = locale;
      })
    );
  }
  
  private SPINNER() {
    const loadingSubscription = this._ecommerceAuthService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
    this.subscriptions.add(loadingSubscription);
  }

  checkIfAddressClientExists() {
    this._ecommerceAuthService.listAddressClient(this.CURRENT_USER_AUTHENTICATED._id).subscribe((resp: any) => {
      this.listAddressClients = resp.address_client;
      if (this.listAddressClients.length === 0) {
        // Guarda la URL actual en sessionStorage
        sessionStorage.setItem('returnUrl', this.router.url);
        
        // Redirige al formulario de agregar dirección
        this.router.navigate(['/myaddresses/add']);
      }
    });
  }

  private subscribeToQueryParams(): void {

    this.queryParamsSubscription = this._routerActived.params.subscribe(
      ( resp: any ) => {
        this.idAdressClient = resp["idAdressClient"];
      });
  }

  private verifyAuthenticatedUser(): void {
    this._ecommerceAuthService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
        
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
        this.router.navigate(['/', this.country, this.locale, 'auth', 'login']);
      }
    });
  }

  private showProfileClient() {
    this._ecommerceAuthService.listOneAdessClient(this.idAdressClient).subscribe( (resp:any) => {

      console.log("address: ", resp);
      this.address_client_selected = resp.address_client;
      console.log("Address_cliente_seletec: ",  this.address_client_selected);

      if ( this.address_client_selected ) {
        this.name       = this.address_client_selected.name;
        this.surname    = this.address_client_selected.surname;
        
        // 🎯 NORMALIZAR el código de país (puede venir como nombre completo o código)
        const rawPais = this.address_client_selected.pais || 'ES';
        this.pais = this.normalizeCountryCode(rawPais);
        console.log(`🌍 [EditAddress] País raw: '${rawPais}' → normalizado: '${this.pais}'`);
        
        this.address    = this.address_client_selected.address;
        this.zipcode    = this.address_client_selected.zipcode;
        
        // 👉 NORMALIZAR poblacion al cargar desde BD
        const poblacionFromBD = this.address_client_selected.poblacion;
        this.poblacion  = poblacionFromBD?.trim() || '';
        console.log('📊 [EditAddress-DEBUG] poblacion from BD:', poblacionFromBD);
        console.log('📊 [EditAddress-DEBUG] poblacion after normalize:', this.poblacion);
        
        this.ciudad     = this.address_client_selected.ciudad;
        this.email      = this.address_client_selected.email;
        this.phone      = this.address_client_selected.phone;
        this.usual_shipping_address = this.address_client_selected.usual_shipping_address;
        
        // 🎯 Parsear la dirección completa en calle + número + apartamento si es posible
        this.parseAddressFields(this.address);
        
        // 🔥 FORZAR detección de cambios INMEDIATA y luego otra vez después
        this.cdr.detectChanges();
        console.log(`✅ [EditAddress] Datos cargados - pais='${this.pais}', poblacion='${this.poblacion}'`);
        
        // 🔥 CARGAR availableCities usando el zipcode existente
        if (this.zipcode) {
          console.log(`🔄 [EditAddress] Cargando ciudades para CP: ${this.zipcode}`);
          this.onZipCodeChange(this.zipcode);
        }
      }
    });
  }
  
  /**
   * Normaliza el código de país - convierte nombres completos a códigos ISO
   * Ej: "España" → "ES", "Italia" → "IT"
   */
  private normalizeCountryCode(rawCountry: string): string {
    if (!rawCountry) return 'ES';
    
    // Si ya es un código de 2 letras, devolverlo en mayúsculas
    if (rawCountry.length === 2) {
      return rawCountry.toUpperCase();
    }
    
    // ⚠️ Buscar en la lista COMPLETA (no en supportedCountries, restringido a España) para no
    // convertir silenciosamente una dirección histórica FR/IT/DE a ES por no encontrar coincidencia.
    const found = this.addressValidationService.getAvailableCountries(false).find(c => 
      c.name.toLowerCase() === rawCountry.toLowerCase()
    );
    
    return found ? found.code : 'ES'; // Fallback a España si no se encuentra
  }
  
  /**
   * Parsea la dirección completa en sus componentes individuales
   * Formato esperado: "Calle Gran Vía 123, 3º B" o "Calle Gran Vía 123"
   */
  private parseAddressFields(fullAddress: string) {
    if (!fullAddress) return;
    
    // Intentar separar por coma (apartamento está después de la coma)
    const parts = fullAddress.split(',').map(p => p.trim());
    
    if (parts.length > 0) {
      // La primera parte contiene calle y número
      const streetAndNumber = parts[0];
      
      // Buscar el último número en la primera parte (suele ser el número de la calle)
      const numberMatch = streetAndNumber.match(/^(.*?)(\d+[A-Za-z]?)$/);
      
      if (numberMatch) {
        this.calle = numberMatch[1].trim();
        this.numero = numberMatch[2].trim();
      } else {
        // Si no se encuentra patrón, poner todo en calle
        this.calle = streetAndNumber;
        this.numero = '';
      }
      
      // Si hay una segunda parte, es el apartamento
      if (parts.length > 1) {
        this.apartamento = parts[1];
      }
    }
  }

  public store() {
    // Prevenir múltiples submissions
    if (this.isSubmitting) {
      console.log('⚠️ [EditAddress] Already submitting, skipping...');
      return;
    }
    
    if (this.address_client_selected) {
      this.updateAddress();
    } 
  }

  private updateAddress() {
    // Validación de campos obligatorios
    if (
      !this.name || 
      !this.surname || 
      !this.pais || 
      !this.calle || 
      !this.numero || 
      !this.zipcode || 
      !this.poblacion || 
      !this.ciudad || 
      !this.email || 
      !this.phone 
    ) {
      this.status = false;
      this.validMessage = true;
      this.errorOrSuccessMessage = "Por favor, complete los campos obligatorios de la dirección de envío";
      this.hideMessageAfterDelay();
      alertDanger("Por favor, complete los campos obligatorios de la dirección de envío");
      return;
    }

    // Construir la dirección completa combinando calle + número + apartamento
    this.address = this.calle.trim() + ' ' + this.numero.trim();
    if (this.apartamento && this.apartamento.trim()) {
      this.address += ', ' + this.apartamento.trim();
    }

    // Marcar como enviando para evitar duplicados
    this.isSubmitting = true;
    this.isValidating = true;
    this.validationMessage = 'Validando dirección con Printful...';

    // Construir objeto de dirección
    const addressData = {
      name: this.name,
      surname: this.surname,
      pais: this.pais,
      address: this.address,
      zipcode: this.zipcode,
      poblacion: this.poblacion,
      ciudad: this.ciudad,
      email: this.email,
      phone: this.phone
    };

    // 🔍 PASO 1: VALIDAR CON BACKEND API (validación local con base de datos)
    console.log('🔍 [EditAddress] Step 1: Validating with backend API...');
    this.validationMessage = 'Validando código postal y ciudad...';
    
    const proceedToPrintful = () => {
      this.validationMessage = 'Validando dirección con Printful...';
      this.addressValidationService.validateWithPrintful(addressData).subscribe({
        next: (validation) => {
          this.isValidating = false;
          
          if (!validation.isValid) {
            // ❌ Dirección no válida según Printful
            this.isSubmitting = false;
            this.status = false;
            this.validMessage = true;
            this.errorOrSuccessMessage = validation.message;
            this.validationMessage = '';
            this.hideMessageAfterDelay();
            alertDanger(validation.message);
            return;
          }

          // ✅ Dirección válida, proceder a guardar
          this.validationMessage = 'Dirección válida, guardando...';
          this.saveUpdatedAddress(addressData);
        },
        error: (err) => {
          console.error('❌ Error validando dirección:', err);
          this.isValidating = false;
          this.isSubmitting = false;
          this.status = false;
          this.validMessage = true;
          this.errorOrSuccessMessage = "Error al validar la dirección con Printful";
          this.validationMessage = '';
          this.hideMessageAfterDelay();
          alertDanger("Error al validar la dirección con Printful");
        }
      });
    };

    if (this.postalCodeState === 'NOT_FOUND' || this.postalCodeState === 'TECHNICAL_ERROR') {
      // 🎯 CP ausente de postal_codes o servicio postal caído: la validación cruzada local
      // siempre rechazaría este CP; Printful valida operacionalmente la dirección manual.
      console.log('ℹ️ [EditAddress] CP en modo fallback manual, se omite validateLocalRulesAsync()');
      proceedToPrintful();
    } else {
      this.addressValidationService.validateLocalRulesAsync(addressData).subscribe({
        next: (localValidation) => {
          if (!localValidation.isValid) {
            // ❌ Validación local falló
            console.log('❌ [EditAddress] Backend validation failed:', localValidation.message);
            this.isSubmitting = false;
            this.isValidating = false;
            this.status = false;
            this.validMessage = true;
            this.errorOrSuccessMessage = localValidation.message;
            this.validationMessage = '';
            this.hideMessageAfterDelay();
            alertDanger(localValidation.message);
            return;
          }
          
          // ✅ Validación local correcta, ahora validar con Printful
          console.log('✅ [EditAddress] Backend validation passed, now validating with Printful...');
          proceedToPrintful();
        },
        error: (err) => {
          // Error en validación local (backend API)
          console.error('❌ [EditAddress] Backend API error:', err);
          this.isValidating = false;
          this.isSubmitting = false;
          this.status = false;
          this.validMessage = true;
          this.errorOrSuccessMessage = "Error al validar la dirección con nuestro sistema. Por favor intenta de nuevo.";
          this.validationMessage = '';
          this.hideMessageAfterDelay();
          alertDanger("Error de validación");
        }
      });
    }
  }

  /**
   * Guarda la dirección actualizada en la base de datos después de validar con Printful
   */
  private saveUpdatedAddress(addressData: any) {
    let data = {
      _id: this.address_client_selected.id,
      user: this.CURRENT_USER_AUTHENTICATED._id,
      ...addressData,
      usual_shipping_address: this.usual_shipping_address,
    };

    this._ecommerceAuthService.updateAddressClient(data).subscribe({
      next: (resp: any) => {
        this.isSubmitting = false;
        this.validationMessage = '';
        
        if (resp.status == 200) {
          let INDEX = this.listAddressClients.findIndex((item:any) => item.id == this.address_client_selected.id);
          if (INDEX !== -1) {
            this.listAddressClients[INDEX] = resp.address_client;
          }

          this.status = true;
          this.validMessage = true;
          this.errorOrSuccessMessage = resp.message;
          this.hideMessageAfterDelay();
          alertSuccess(resp.message);
          this.resetForm();
          this.dynamicRouter.navigateWithLocale(['account', 'myaddresses']);
        } else {
          this.status = false;
          this.errorOrSuccessMessage = "Error al actualizar la dirección.";
          this.hideMessageAfterDelay();
          alertDanger("Error al actualizar la dirección.");
        }
      },
      error: (error) => {
        console.error('❌ [EditAddress] Backend error:', error);
        this.isSubmitting = false;
        this.validationMessage = '';
        this.status = false;
        this.errorOrSuccessMessage = "Error al actualizar la dirección.";
        this.hideMessageAfterDelay();
        alertDanger("Error al actualizar la dirección.");
      }
    });
  }

  private resetForm() {
    this.name = '';
    this.surname = '';
    this.pais = '';
    this.calle = '';
    this.numero = '';
    this.apartamento = '';
    this.address = '';
    this.zipcode = '';
    this.poblacion = '';
    this.ciudad = '';
    this.email = '';
    this.phone = '';
    this.resetPostalCodeState();
    this.lastCheckedZip = '';
  }


  private hideMessageAfterDelay() {
    setTimeout(() => {
      this.validMessage = false;
    }, 6000);
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }

}
