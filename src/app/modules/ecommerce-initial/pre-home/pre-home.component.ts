import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalizationService } from 'src/app/services/localization.service';

@Component({
  selector: 'app-pre-home',
  templateUrl: './pre-home.component.html',
  styleUrls: ['./pre-home.component.css']
})
export class PreHomeComponent implements OnInit {

  selectedCountry = 'es'; // España por defecto
  selectedLocale = '';  // Se asigna automáticamente

  // Usar configuración centralizada del servicio
  countries = this.localizationService.countries;
  languageOptions = this.localizationService.languageOptions;

  availableLocales: { code: string, name: string }[] = []; // Idiomas disponibles según el país seleccionado

  constructor(private router: Router, private localizationService: LocalizationService) { }

  ngOnInit(): void {
    // Llama a onCountryChange al cargar el componente para establecer los idiomas disponibles
    this.onCountryChange();
  }

  // Actualiza los idiomas disponibles según el país seleccionado
  onCountryChange() {
    this.availableLocales = this.languageOptions[this.selectedCountry] || [];

    // Si hay idiomas disponibles, asignar el primero
    if (this.availableLocales.length > 0) {
      this.selectedLocale = this.availableLocales[0].code;
    } else {
      this.selectedLocale = ''; // Si no hay idiomas disponibles, lo dejamos vacío
    }
  }

  gotoHome() {
    if (this.selectedCountry && this.selectedLocale) {
      this.localizationService.setLocaleAndCountry(this.selectedCountry , this.selectedLocale );
      this.router.navigate([`/${this.selectedCountry}/${this.selectedLocale}/home`]);
    }
  }

}
