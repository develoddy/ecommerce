import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnDestroy, ViewChild,
  ElementRef, NgZone
} from '@angular/core';

import { PriceCalculationService } from
  'src/app/modules/home/_services/product/price-calculation.service';

@Component({
  selector: 'app-product-recommendations',
  templateUrl: './product-recommendations.component.html',
  styleUrls: [
    './product-recommendations.component.scss',
    './styles/recommendations-layout.scss',
    './styles/recommendations-cards.scss',
    './styles/recommendations-controls.scss',
    './styles/recommendations-responsive.scss'
  ]
})
export class ProductRecommendationsComponent
  implements AfterViewInit, OnDestroy {

  @Input() products: any[] = [];
  @Input() translationPrefix = '';
  @Input() euro = '';
  @Input() SALE_FLASH: any;

  @Output() navigateToProduct =
    new EventEmitter<{slug: string, discountId?: string}>();

  @ViewChild('track') track!: ElementRef<HTMLElement>;

  maxScroll = 0;
  scrollPosition = 0;
  indicatorWidth = 100;
  indicatorPosition = 0;

  private observer?: ResizeObserver;

  constructor(
    private priceService: PriceCalculationService,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => {
        this.ngZone.run(() => this.updateScroll());
      });

      this.observer.observe(this.track.nativeElement);
    }

    this.updateScroll();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  updateScroll(): void {
    const track = this.track?.nativeElement;
    if (!track) return;

    const width = track.scrollWidth;

    this.maxScroll = Math.max(
      0, width - track.clientWidth
    );

    this.scrollPosition = Math.max(
      0, Math.min(track.scrollLeft, this.maxScroll)
    );

    this.indicatorWidth = width
      ? Math.min(100, track.clientWidth / width * 100)
      : 100;

    this.indicatorPosition = width
      ? this.scrollPosition / width * 100
      : 0;
  }

  scroll(direction: number): void {
    const track = this.track.nativeElement;
    const card = track.firstElementChild as HTMLElement;

    if (!card) return;

    const gap = parseFloat(
      window.getComputedStyle(track).columnGap
    ) || 0;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    track.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  }

  setScroll(event: Event): void {
    this.track.nativeElement.scrollLeft =
      Number((event.target as HTMLInputElement).value);
  }

  trackProduct(index: number, product: any): string {
    return product.slug;
  }

  calculateFinalPrice(product: any): number {
    return this.priceService.calculateFinalPrice(
      product, this.SALE_FLASH
    );
  }

  hasDiscount(product: any): boolean {
    return this.priceService.hasDiscount(
      product.price_usd,
      this.calculateFinalPrice(product)
    );
  }

  openProduct(product: any): void {
    this.navigateToProduct.emit({
      slug: product.slug,
      discountId: product.campaing_discount?.id
    });
  }
}
