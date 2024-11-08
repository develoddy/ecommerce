import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pre-home',
  templateUrl: './pre-home.component.html',
  styleUrls: ['./pre-home.component.css']
})
export class PreHomeComponent implements OnInit {

  selectedCountry = 'es'; // Valor predeterminado o el que elijas
  selectedLocale = 'es';  // Valor predeterminado o el que elijas

  // Opciones de países
  countries = [
    { code: 'es', name: 'España (Península y Baleares)' },
    { code: 'us', name: 'Estados Unidos' },
    { code: 'ee', name: 'Estonia' }
  ];

  // Opciones de idioma por país
  languageOptions: { [key: string]: { code: string, name: string }[] } = {
    'es': [
      { code: 'es', name: 'Castellano' },
      { code: 'ca', name: 'Catalán' }
    ],
    'us': [
      { code: 'en', name: 'English (USA)' }
    ],
    'ee': [
      { code: 'et', name: 'Estonian' }
    ]
  };

  availableLocales: { code: string, name: string }[] = []; // Idiomas disponibles según el país seleccionado

  constructor(private router: Router,) { }

  ngOnInit(): void {
    // Llama a onCountryChange al cargar el componente para establecer los idiomas disponibles
    this.onCountryChange();
  }

  // Actualiza los idiomas disponibles según el país seleccionado
  onCountryChange() {
    this.availableLocales = this.languageOptions[this.selectedCountry] || [];
    //this.selectedLocale = ''; // Reinicia el idioma seleccionado
  }

  gotoHome() {
    //this.router.navigate(['/']);
    if (this.selectedCountry && this.selectedLocale) {
      this.router.navigate([`/${this.selectedLocale}/${this.selectedCountry}/home`]);
    }
  }

}
