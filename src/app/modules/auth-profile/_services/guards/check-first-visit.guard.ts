import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CheckFirstVisitGuard implements CanActivate {

  constructor(
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean | UrlTree {

    // 🏠 LÓGICA DE PRIMERA VISITA (Pre-launch ya verificado por PrelaunchGuard)
    console.log('🔍 CheckFirstVisitGuard - Verificando primera visita...');

    // ⚠️ CRÍTICO: Si viene de logout (sin tokens), NO redirigir automáticamente
    const hasUser = localStorage.getItem('user');
    const hasAccessToken = localStorage.getItem('access_token');
    
    if (!hasUser || !hasAccessToken) {
      console.warn('⚠️ CheckFirstVisitGuard: Sin autenticación, permitiendo acceso público');
      return true; // Permitir acceso para que otros guards manejen la redirección si es necesario
    }

    // 🏠 Lógica de primera visita (solo para usuarios autenticados)
    const isFirstVisit = localStorage.getItem('isFirstVisit');

    console.log('Check First visita: ', isFirstVisit);

    if (!isFirstVisit) {
      console.warn('Primera visita autenticada, redirigiendo a preHome...');
      localStorage.setItem('isFirstVisit', 'true');
      this.router.navigate(['/preHome']); 
      return false;
    } else {
      console.warn('No es la primera visita, permitiendo acceso a home...');
      return true;
    }
  }
  
}
