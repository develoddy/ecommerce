import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { EcommerceAuthService } from '../../ecommerce-auth/_services/ecommerce-auth.service';
import { AuthService } from '../../auth-profile/_services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestCleanupService {
  private currentUrl: string = '';

  constructor(
    private router: Router,
    private authEcommerce: EcommerceAuthService,
    private authService: AuthService,
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (this.shouldCleanup(event.url)) {
          this.cleanGuestData();
        }
        this.currentUrl = event.url;
      }
    });
  }

  //private shouldCleanup(nextUrl: string): boolean {
  //  const isLeavingCheckout = this.currentUrl.includes('/checkout') && !nextUrl.includes('/checkout');
  //  return isLeavingCheckout;
  // }

  private shouldCleanup(nextUrl: string): boolean {
    const isLeavingCheckout = this.currentUrl.includes('/checkout') && !nextUrl.includes('/checkout');

    // Rutas a las que NO queremos borrar guest porque se puede seguir comprando
    const safeRoutes = ['/cart', '/home', '/filter-products'];

    const isSafeRoute = safeRoutes.some(route => nextUrl.includes(route));

    // Solo limpiar si sale de checkout y no va a una ruta segura
    return isLeavingCheckout && !isSafeRoute;
  }


  cleanGuestData(): void {
    
    
    const accessToken = localStorage.getItem("access_token");
    const guestData = localStorage.getItem("user_guest");

    //if (guestData && !accessToken) {
    if (!accessToken) {
        // Solo si es un invitado y no está logueado
        this.authEcommerce.deleteGuestAndAddresses().subscribe({
            next: (resp: any) => {
                console.log("🧹 Guest y direcciones eliminadas al salir del checkout", resp);
                sessionStorage.removeItem("user_guest");
                this.authService.addGuestLocalStorage();
                this.authEcommerce._authService.userGuestSubject.next(null);
            },
            error: err => {
                console.error("❌ Error al limpiar datos guest al salir del checkout", err);
            }
      });
    }
  }
}
