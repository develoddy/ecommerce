import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EcommerceInitialComponent } from './ecommerce-initial.component';

describe('EcommerceInitialComponent', () => {
  let component: EcommerceInitialComponent;
  let fixture: ComponentFixture<EcommerceInitialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EcommerceInitialComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EcommerceInitialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
