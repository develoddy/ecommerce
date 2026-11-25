import { LoaderService } from 'src/app/modules/home/_services/product/loader.service';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { EcommerceGuestService, EditorialBanner, EditorialCategory } from 'src/app/modules/ecommerce-guest/_service/ecommerce-guest.service';
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
  activeEditorialCategory: EditorialCategory = 'default';

  private readonly editorialCategories: StoreEditorialCategory[] = [
    't-shirts', 'hoodies', 'mugs', 'caps'
  ];

  private editorialBanners: Record<EditorialCategory, EditorialBanner | null> = {
    default: null,
    't-shirts': null,
    hoodies: null,
    mugs: null,
    caps: null
  };

  private editorialPreloadStarted = false;
  private readonly preloadedEditorialImages = new Map<string, HTMLImageElement>();

  editorialLoading = true;
  useEditorialFallback = false;
  editorialImageFailed = false;

  ngOnInit(): void {
    this.loadEditorialBanner();
  }

  private loadEditorialBanner(): void {
    this.ecommerceGuestService.getEditorialBanner().subscribe({
      next: (response) => {
        this.editorialBanners.default = this.validateEditorialBanner(
          response?.banner
        );

        for (const category of this.editorialCategories) {
          this.editorialBanners[category] = this.validateEditorialBanner(
            response?.banners?.[category]
          );
        }

        this.editorialBanner = this.editorialBanners.default;

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

  private validateEditorialBanner(
    banner: EditorialBanner | null | undefined
  ): EditorialBanner | null {
    return banner &&
      banner.placement === 'editorial' &&
      banner.state === 1 &&
      banner.imagen_mobile_url &&
      banner.imagen_desktop_url
        ? banner
        : null;
  }

  onEditorialImageLoad(): void {
    this.editorialLoading = false;
    this.preloadEditorialImages();
  }

  private preloadEditorialImages(): void {
    if (
      this.editorialPreloadStarted ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }

    this.editorialPreloadStarted = true;

    for (const category of this.editorialCategories) {
      const banner = this.editorialBanners[category];

      if (!banner) {
        continue;
      }

      const url = this.getEditorialImageUrl(banner);

      if (this.preloadedEditorialImages.has(url)) {
        continue;
      }

      const image = new Image();

      image.onload = () => {
        this.preloadedEditorialImages.set(url, image);
      };

      image.onerror = () => {
        console.warn(
          '[StoreEditorial] Imagen secundaria no disponible:',
          category
        );
      };

      image.src = url;
    }
  }

  private getEditorialImageUrl(banner: EditorialBanner): string {
    return window.matchMedia('(max-width: 767px)').matches
      ? banner.imagen_mobile_url
      : banner.imagen_desktop_url;
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
    private ecommerceGuestService: EcommerceGuestService,
    public loader: LoaderService
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

  get readyEditorialCampaigns(): {
    category: StoreEditorialCategory;
    url: string;
  }[] {
    const campaigns: {
      category: StoreEditorialCategory;
      url: string;
    }[] = [];

    for (const category of this.editorialCategories) {
      const banner = this.editorialBanners[category];

      if (banner) {
        const url = this.getEditorialImageUrl(banner);

        if (this.preloadedEditorialImages.has(url)) {
          campaigns.push({ category, url });
        }
      }
    }

    return campaigns;
  }

  trackEditorialCampaign(
    index: number,
    campaign: { category: StoreEditorialCategory; url: string }
  ): string {
    return campaign.category;
  }

  previewEditorialCategory(category: StoreEditorialCategory): void {
    const banner = this.editorialBanners[category];

    if (
      banner &&
      this.preloadedEditorialImages.has(this.getEditorialImageUrl(banner))
    ) {
      this.activeEditorialCategory = category;
    } else {
      this.activeEditorialCategory = 'default';
    }
  }

  resetEditorialCategory(): void {
    this.activeEditorialCategory = 'default';
  }

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