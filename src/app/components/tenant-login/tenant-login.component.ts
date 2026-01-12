import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SaasService } from 'src/app/services/saas.service';
import { ModulesService } from 'src/app/services/modules.service';

@Component({
  selector: 'app-tenant-login',
  templateUrl: './tenant-login.component.html',
  styleUrls: ['./tenant-login.component.css']
})
export class TenantLoginComponent implements OnInit {
  loginForm: FormGroup;
  isSubmitting = false;
  error: string = '';
  moduleKey: string = '';
  moduleName: string = '';
  module: any = null;
  isLoadingModule = true;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private saasService: SaasService,
    private modulesService: ModulesService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Obtener el módulo desde la URL
    this.route.queryParams.subscribe(params => {
      this.moduleKey = params['module'];

      if (!this.moduleKey) {
        this.router.navigate(['/labs']);
        return;
      }

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
   * Enviar formulario de login
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    const formValue = this.loginForm.value;

    this.saasService.login({
      email: formValue.email,
      password: formValue.password,
      moduleKey: this.moduleKey
    }).subscribe({
      next: (response) => {
        if (response.success) {
          // Redirigir al dashboard
          this.router.navigate([response.dashboard_url]);
        }
      },
      error: (error) => {
        console.error('Error logging in:', error);
        this.error = error.error?.error || 'Credenciales inválidas';
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
    const control = this.loginForm.get(field);
    return !!(control && control.hasError(error) && control.touched);
  }

  /**
   * Ir a registro
   */
  goToRegister(): void {
    this.router.navigate(['/trial/register'], { queryParams: { module: this.moduleKey } });
  }

  /**
   * Volver a la landing
   */
  goBack(): void {
    this.router.navigate(['/labs', this.moduleKey]);
  }
}
