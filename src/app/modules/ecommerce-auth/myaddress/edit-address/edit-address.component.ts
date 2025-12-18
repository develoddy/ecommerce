import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AddressValidationService } from '../../_services/address-validation.service';
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
    return this.addressValidationService.getAvailableCountries(true); // true = pre-launch mode
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
    // Limpiar errores previos
    this.postalCodeError = '';
    this.cityError = '';
    
    // 🔍 Verificar que haya país seleccionado
    if (!this.pais) {
      this.postalCodeError = 'Por favor, selecciona primero un país';
      return;
    }
    
    // Validar longitud mínima (España: 5 dígitos)
    if (!zipCode || zipCode.length < 5) {
      this.availableCities = [];
      this.ciudad = ''; // Limpiar provincia
      this.poblacion = ''; // Limpiar ciudad
      return;
    }

    this.isLoadingPostalCode = true;
    const countryCode = this.addressValidationService.getCountryCode(this.pais);
    
    console.log(`🔍 [EditAddress] País actual: '${this.pais}' → countryCode: '${countryCode}'`);
    console.log(`🔍 [EditAddress] Buscando CP ${zipCode} en ${countryCode}`);
    
    this.addressValidationService.getPostalCodeInfo(countryCode, zipCode)
      .subscribe({
        next: (info) => {
          this.isLoadingPostalCode = false;
          
          if (!info || !info.exists) {
            // ❌ Código postal no encontrado
            this.postalCodeError = `El código postal ${zipCode} no existe en ${this.pais || 'España'}`;
            this.availableCities = [];
            this.ciudad = '';
            this.poblacion = '';
            console.log(`❌ [EditAddress] CP ${zipCode} no encontrado`);
            return;
          }
          
          // ✅ CP encontrado - autocompletar provincia (readonly)
          console.log(`✅ [EditAddress] CP ${zipCode} encontrado:`, info);
          this.ciudad = info.province; // Autocompletar provincia
          this.availableCities = info.cities;
          
          // 👉 LOGS DE DEBUG COMPLETOS
          console.log('📊 [EditAddress-DEBUG] availableCities:', this.availableCities);
          console.log('📊 [EditAddress-DEBUG] poblacion ANTES de asignar:', this.poblacion);
          
          // 🔥 CRITICAL: Dar tiempo al *ngIf para renderizar el select antes de asignar poblacion
          setTimeout(() => {
            // Si solo hay una ciudad, autoseleccionarla
            if (info.cities.length === 1) {
              this.poblacion = info.cities[0].city.trim();
              console.log(`✅ [EditAddress] Autoseleccionada ciudad única: '${this.poblacion}'`);
            } else if (info.cities.length > 1) {
              // Si hay múltiples ciudades, mantener la ciudad actual si está en la lista (normalizado CASE-INSENSITIVE)
              const poblacionNormalizada = this.poblacion?.trim().toLowerCase();
              const currentCityExists = info.cities.some(c => c.city.trim().toLowerCase() === poblacionNormalizada);
              
              if (!currentCityExists) {
                this.poblacion = ''; // Limpiar para que el usuario elija
                console.log(`⚠️ [EditAddress] Ciudad actual '${this.poblacion}' NO encontrada en availableCities`);
              } else {
                // Normalizar el valor para que coincida exactamente (case-insensitive)
                const matchedCity = info.cities.find(c => c.city.trim().toLowerCase() === poblacionNormalizada);
                if (matchedCity) {
                  this.poblacion = matchedCity.city; // Asignar el valor exacto del array
                  console.log(`✅ [EditAddress] Ciudad actual '${this.poblacion}' encontrada y normalizada`);
                }
              }
              console.log(`ℹ️ [EditAddress] ${info.cities.length} ciudades disponibles`);
            }
            
            console.log('📊 [EditAddress-DEBUG] poblacion DESPUÉS de asignar:', this.poblacion);
          }, 0); // setTimeout con 0ms = ejecutar DESPUÉS del render del DOM
        },
        error: (error) => {
          this.isLoadingPostalCode = false;
          console.error('❌ [EditAddress] Error al buscar CP:', error);
          this.postalCodeError = 'Error al validar el código postal. Por favor intenta de nuevo.';
          this.availableCities = [];
          this.ciudad = '';
          this.poblacion = '';
        }
      });
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
    
    // Buscar por nombre completo en la lista de países soportados
    const found = this.supportedCountries.find(c => 
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
        this.validationMessage = 'Validando dirección con Printful...';
        
        // 🔍 PASO 2: VALIDAR CON PRINTFUL
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
    this.availableCities = [];
    this.postalCodeError = '';
    this.cityError = '';
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
