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

  // Países del PRE-LAUNCH - Los 4 mercados principales
  countries = [
    { code: 'es', name: 'España (Península y Baleares)' },
    { code: 'fr', name: 'France' },
    { code: 'it', name: 'Italia' },
    { code: 'de', name: 'Deutschland' }
  ];

  // Idiomas nativos por país para PRE-LAUNCH
  languageOptions: { [key: string]: { code: string, name: string }[] } = {
    'es': [
      { code: 'es', name: 'Castellano' }
    ],
    'fr': [
      { code: 'fr', name: 'Français' }
    ],
    'it': [
      { code: 'it', name: 'Italiano' }
    ],
    'de': [
      { code: 'de', name: 'Deutsch' }
    ]
  };

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
