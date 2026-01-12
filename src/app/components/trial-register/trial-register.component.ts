import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SaasService } from 'src/app/services/saas.service';
import { ModulesService } from 'src/app/services/modules.service';

@Component({
  selector: 'app-trial-register',
  templateUrl: './trial-register.component.html',
  styleUrls: ['./trial-register.component.css']
})
export class TrialRegisterComponent implements OnInit {
  registerForm: FormGroup;
  isSubmitting = false;
  error: string = '';
  moduleKey: string = '';
  moduleName: string = '';
  planName: string = '';
  trialDays: number = 14;
  module: any = null;
  isLoadingModule = true;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private saasService: SaasService,
    private modulesService: ModulesService
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.moduleKey = params['module'];
      this.planName = params['plan'] || 'trial';

      if (!this.moduleKey) {
        this.router.navigate(['/labs']);
        return;
      }

      // Cargar info del módulo
      this.loadModule();
    });
  }

  /**
   * Cargar información del módulo
   */
  loadModule(): void {
    this.modulesService.getModuleByKey(this.moduleKey).subscribe({
      next: (response) => {
        if (response.module) {
          this.module = response.module;
          this.moduleName = response.module.name;
          this.trialDays = response.module.saas_config?.trial_days || 14;
        }
        this.isLoadingModule = false;
      },
      error: (error) => {
        console.error('Error loading module:', error);
        this.error = 'No se pudo cargar el módulo';
        this.isLoadingModule = false;
      }
    });
  }

  /**
   * Validador personalizado para confirmar password
   */
  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Enviar formulario de registro
   */
  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    const formValue = this.registerForm.value;

    this.saasService.startTrial({
      name: formValue.name,
      email: formValue.email,
      password: formValue.password,
      moduleKey: this.moduleKey,
      plan: this.planName
    }).subscribe({
      next: (response) => {
        if (response.success) {
          // Redirigir a app.lujandev.com (o localhost:4202 en desarrollo)
          const isDevelopment = window.location.hostname === 'localhost';
          const appUrl = isDevelopment 
            ? `http://localhost:4202/${this.moduleKey}` 
            : `https://app.lujandev.com/${this.moduleKey}`;
          
          window.location.href = appUrl;
        }
      },
      error: (error) => {
        console.error('Error starting trial:', error);
        this.error = error.error?.error || 'Error al iniciar el trial. Por favor intenta de nuevo.';
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Helper para marcar todos los campos como touched
   */
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Verificar si un campo tiene error
   */
  hasError(field: string, error: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.hasError(error) && control.touched);
  }

  /**
   * Volver a la landing del módulo
   */
  goBack(): void {
    this.router.navigate(['/labs', this.moduleKey]);
  }
}
