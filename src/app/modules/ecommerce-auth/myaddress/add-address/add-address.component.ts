import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { EcommerceAuthService } from '../../_services/ecommerce-auth.service';
import { AddressValidationService, PostalCodeCheckResult, PostalCodeCheckState } from '../../_services/address-validation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalizationService } from 'src/app/services/localization.service';

declare var $:any;
declare function alertDanger([]):any;
declare function alertWarning([]):any;
declare function alertSuccess([]):any;

@Component({
  selector: 'app-add-address',
  templateUrl: './add-address.component.html',
  styleUrls: ['./add-address.component.css']
})
export class AddAddressComponent implements OnInit {

  address_client_selected:any = null;
  listAddressClients:any = [];

  returnUrl: string = 'myaddresses';  // Valor por defecto si no se pasa ningún returnUrl

  // Address
  name: string = '';
  surname: string = '';
  pais: string = '';
  calle: string = ''; // Nombre de la calle
  numero: string = ''; // Número de la calle (obligatorio)
  apartamento: string = ''; // Apartamento/Piso (opcional)
  address: string = ''; // Dirección completa (se genera combinando calle + numero + apartamento)
  zipcode: string = '';
  poblacion: string = ''; // Ciudad/población
  ciudad: string = ''; // Provincia/estado
  email: string | null = null;
  phone: string = '';
  usual_shipping_address:boolean=false;
  
  // Validación
  isValidating: boolean = false;
  validationMessage: string = '';
    
  errorOrSuccessMessage:any="";
  validMessage:boolean=false;
  status:boolean=false;
  loading: boolean = false;
  private isSubmitting: boolean = false; // Prevenir múltiples submissions
  
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
  //loadingSubscription: Subscription = new Subscription();
  private subscriptions: Subscription = new Subscription();
  CURRENT_USER_AUTHENTICATED:any=null;
  CURRENT_USER_GUEST:any=null;

  locale: string = "";
  country: string = "";

  constructor(
    public _ecommerceAuthService: EcommerceAuthService,
    private addressValidationService: AddressValidationService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private localizationService: LocalizationService
  ) {

    this.activatedRoute.paramMap.subscribe(params => {
      this.locale = params.get('locale') || 'es';  // Valor predeterminado si no se encuentra
      this.country = params.get('country') || 'es'; // Valor predeterminado si no se encuentra
    });
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
   * 🎯 Método tipo Mango.es: Autocompletar provincia y ciudades al ingresar código postal
   * Se ejecuta cuando el usuario termina de escribir el CP (blur o change)
   */
  onZipCodeChange(zipCode: string) {
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
    const countryCode = this.addressValidationService.getCountryCode(this.pais || 'ES');

    console.log(`🔍 [AddAddress] Verificando CP ${trimmed} en ${countryCode}`);

    this.addressValidationService.checkPostalCode(trimmed, countryCode).subscribe({
      next: (result) => {
        this.isLoadingPostalCode = false;
        console.log(`🔍 [AddAddress] Estado CP ${trimmed}:`, result.state);
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
    this.availableCities = [];
    this.ciudad = '';
    this.poblacion = '';

    switch (result.state) {
      case 'INVALID_FORMAT':
        this.postalCodeError = result.message;
        break;
      case 'FOUND':
        this.ciudad = result.info?.province || '';
        this.availableCities = result.info?.cities || [];
        if (this.availableCities.length === 1) {
          this.poblacion = this.availableCities[0].city;
        }
        break;
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

  /**
   * 🎯 Método para verificar si el botón de guardar debe estar habilitado
   */
  isFormValid(): boolean {
    return !!(this.name && 
              this.surname && 
              this.pais && 
              this.calle && 
              this.numero && 
              this.zipcode && 
              this.poblacion && // Ciudad seleccionada
              this.ciudad && // Provincia autocompletada
              this.email && 
              this.phone &&
              !this.postalCodeError &&
              !this.isLoadingPostalCode);
  }

  ngOnInit(): void {
    
    this.SPINNER();
    this.subscribeToLocalization();
    
    // Captura la URL de retorno si existe
    this.returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl') || `/${this.country}/${this.locale}/account/myaddresses`;
    
    // 🎯 UX IMPROVEMENT: Preseleccionar país basado en la URL del usuario
    this.preselectCountryFromUrl();
    
    this.verifyAuthenticatedUser();
    this.subscribeToQueryParams();
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

  /**
   * 🎯 UX IMPROVEMENT: Preselecciona automáticamente el país basado en la URL
   * Si el usuario navega en /fr/fr/, preselecciona Francia
   * Si navega en /de/de/, preselecciona Alemania, etc.
   */
  private preselectCountryFromUrl(): void {
    const currentCountry = this.localizationService.country.toUpperCase();
    
    // Mapear códigos de país de URL a códigos de formulario
    const countryMapping: {[key: string]: string} = {
      'ES': 'ES', // España
      'FR': 'FR', // Francia  
      'IT': 'IT', // Italia
      'DE': 'DE'  // Alemania
    };
    
    // Si el país actual está en nuestros países soportados, preseleccionarlo
    if (countryMapping[currentCountry]) {
      this.pais = countryMapping[currentCountry];
      
      console.log(`🎯 UX: Preseleccionando país ${this.pais} basado en URL /${this.localizationService.country}/${this.localizationService.locale}/`);
    }
  }

  private subscribeToQueryParams(): void {
    const queryParamsSubscription = this.activatedRoute.queryParams.subscribe((resp: any) => {
      this.email = resp["email"];
    });
    // Añadir todas las suscripciones al objeto compuesto
    this.subscriptions.add(queryParamsSubscription);
  }

  private SPINNER() {
    this.subscriptions = this._ecommerceAuthService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });
  }

  private verifyAuthenticatedUser(): void {
    this._ecommerceAuthService._authService.user.subscribe( user => {
      if ( user ) {
        this.CURRENT_USER_AUTHENTICATED = user;
      } else {
        this.CURRENT_USER_AUTHENTICATED = null;
      }
    });
  }

  public store() {
    // Prevenir múltiples submissions
    if (this.isSubmitting) {
      console.log('⚠️ [AddAddress] Already submitting, skipping...');
      return;
    }
    
    if ( !this.address_client_selected ) {
      console.log('🔍 [AddAddress] Calling registerAddress()');
      this.registerAddress();
    } else {
      console.log('🔍 [AddAddress] Skipping registerAddress() - address_client_selected exists');
    }
  }

  /** Metodo para registrar direcciones de usuarios autenticados */
  private registerAddress() {
    
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
    console.log('🔍 [AddAddress] Step 1: Validating with backend API...');
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
          this.saveAddress(addressData);
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
      console.log('ℹ️ [AddAddress] CP en modo fallback manual, se omite validateLocalRulesAsync()');
      proceedToPrintful();
    } else {
      this.addressValidationService.validateLocalRulesAsync(addressData).subscribe({
        next: (localValidation) => {
          if (!localValidation.isValid) {
            // ❌ Validación local falló
            console.log('❌ [AddAddress] Backend validation failed:', localValidation.message);
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
          console.log('✅ [AddAddress] Backend validation passed, now validating with Printful...');
          proceedToPrintful();
        },
        error: (err) => {
          // Error en validación local (backend API)
          console.error('❌ [AddAddress] Backend API error:', err);
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
   * Guarda la dirección en la base de datos después de validar con Printful
   */
  private saveAddress(addressData: any) {
    const data = {    
      user: this.CURRENT_USER_AUTHENTICATED._id,
      ...addressData,
      usual_shipping_address: this.usual_shipping_address,
    };
    
    this._ecommerceAuthService.registerAddressClient(data).subscribe({
      next: (resp: any) => {
        this.isSubmitting = false;
        this.validationMessage = '';
        
        if (resp.status == 200) {
          this.status = true;
          this.validMessage = true;
          this.errorOrSuccessMessage = resp.message;
          this.hideMessageAfterDelay();
          alertSuccess(resp.message);
          this.resetForm();
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.status = false;
          this.errorOrSuccessMessage = "Error al registrar la dirección.";
          this.hideMessageAfterDelay();
        }
      },
      error: (error) => {
        console.log('❌ [AddAddress] Backend error:', error);
        this.isSubmitting = false;
        this.validationMessage = '';
        this.status = false;
        this.errorOrSuccessMessage = "Error al registrar la dirección.";
        this.hideMessageAfterDelay();
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
    }, 6000); // Desaparece después de 3 segundos
  }

  clearField(fieldName: string) {
    switch(fieldName) {
      case 'name':
        this.name = '';
        break;
      case 'surname':
        this.surname = '';
        break;
      case 'email':
        this.email = '';
        break;
      case 'calle':
        this.calle = '';
        break;
      case 'numero':
        this.numero = '';
        break;
      case 'apartamento':
        this.apartamento = '';
        break;
      case 'zipcode':
        this.zipcode = '';
        this.ciudad = '';
        this.poblacion = '';
        this.availableCities = [];
        this.postalCodeError = '';
        break;
      case 'phone':
        this.phone = '';
        break;
    }
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
