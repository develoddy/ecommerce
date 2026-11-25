import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { EcommerceGuestService, EditorialBanner } from 'src/app/modules/ecommerce-guest/_service/ecommerce-guest.service';
import { LocalizationService } from 'src/app/services/localization.service';

export type StoreEditorialCategory =
  | 't-shirts'
  | 'hoodies'
  | 'mugs'
  | 'caps';

@Component({
  selector: 'app-store-editorial',
  templateUrl: './store-editorial.component.html',
  styleUrls: ['./store-editorial.component.css']
})
export class StoreEditorialComponent implements OnInit {

  editorialBanner: EditorialBanner | null = null;

  editorialLoading = true;
  useEditorialFallback = false;
  editorialImageFailed = false;

  ngOnInit(): void {
    this.loadEditorialBanner();
  }

  private loadEditorialBanner(): void {
    this.ecommerceGuestService.getEditorialBanner().subscribe({
      next: (response) => {
        const banner = response?.banner;

        this.editorialBanner =
          banner &&
          banner.placement === 'editorial' &&
          banner.state === 1 &&
          banner.imagen_mobile_url &&
          banner.imagen_desktop_url
            ? banner
            : null;

        if (!this.editorialBanner) {
          this.showEditorialFallback();
        }
      },
      error: (error) => {
        this.showEditorialFallback();
        console.warn(
          '[StoreEditorial] Banner dinamico no disponible:',
          error
        );
      }
    });
  }

  onEditorialImageLoad(): void {
    this.editorialLoading = false;
  }

  onEditorialImageError(): void {
    this.showEditorialFallback();
  }

  private showEditorialFallback(): void {
    this.editorialBanner = null;
    this.useEditorialFallback = true;
  }

  onEditorialFallbackError(): void {
    this.editorialImageFailed = true;
    this.editorialLoading = false;
  }

  constructor(
    private router: Router,
    private localizationService: LocalizationService,
    private ecommerceGuestService: EcommerceGuestService
  ) {}


  @Output() categorySelected =
    new EventEmitter<StoreEditorialCategory>();

  @Output() enterStore = new EventEmitter<void>();

  private readonly categoryConfig: Record<
    StoreEditorialCategory,
    { apiSlug: string; routeSlug: string }
  > = {
    't-shirts': { apiSlug: 'all-shirts', routeSlug: 'camisetas' },
    'hoodies': { apiSlug: 'hoodies', routeSlug: 'hoddies' },
    'mugs': { apiSlug: 'mugs', routeSlug: 'mugs' },
    'caps': { apiSlug: 'dad-hats-baseball-caps', routeSlug: 'gorras' }
  };

  selectCategory(category: StoreEditorialCategory): void {
    const config = this.categoryConfig[category];

    this.ecommerceGuestService.configInitial().subscribe({
      next: (response: any) => {
        const categories = response?.categories || [];

        const selected = categories.find((item: any) => {
          const slug = String(item.slug || item.title || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          return slug === config.apiSlug;
        });

        if (!selected || selected._id == null) {
          console.warn(
            '[StoreEditorial] Categoría no encontrada:',
            category
          );
          return;
        }

        this.router.navigate([
          this.localizationService.routePrefix,
          'shop',
          'filter-products',
          config.routeSlug,
          selected._id
        ]);
      },
      error: (error) => {
        console.error(
          '[StoreEditorial] Error al cargar categorías:',
          error
        );
      }
    });
  }

  openStore(): void {
    this.router.navigateByUrl(
      `${this.localizationService.routePrefix}/home`
    );
  }
}