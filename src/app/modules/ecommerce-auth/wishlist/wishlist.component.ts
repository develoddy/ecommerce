import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WishlistService } from '../../ecommerce-guest/_service/wishlist.service';

declare var $:any;
declare function HOMEINITTEMPLATE([]):any;

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css']
})
export class WishlistComponent implements OnInit {

  euro = "€";
  listWishlists:any=[];
  totalWishlists:any=0;
  userId: any;

  loading: boolean = false;

  REVIEWS:any=null;
  AVG_REVIEW:any=null;
  COUNT_REVIEW:any=null;
  exist_review:any=null;

  constructor(
    public _router: Router,
    public _wishlistService: WishlistService,
  ) {}

  ngOnInit(): void {
    
    this._wishlistService.loading$.subscribe(isLoading => {
      this.loading = isLoading;
    });


    this._wishlistService._authService.user.subscribe(user => {
      if (user) {
        this.userId = user._id;
      }
    });

    this.listAllCarts();

    this._wishlistService.currenteDataWishlist$.subscribe((resp:any) => {
      
      this.listWishlists      = resp;
      this.REVIEWS            = resp.REVIEWS;
      this.AVG_REVIEW         = resp.AVG_REVIEW;
      this.COUNT_REVIEW       = resp.COUNT_REVIEW;


      this.totalWishlists = this.listWishlists.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0);
      this.totalWishlists = parseFloat(this.totalWishlists.toFixed(2));
    });

    setTimeout(() => {
       HOMEINITTEMPLATE($);
    }, 50);
  }

  listAllCarts() {
    this._wishlistService.resetWishlist();
    if ( this._wishlistService._authService.user ) {
      this._wishlistService.listWishlist(this.userId).subscribe((resp:any) => {
        resp.wishlists.forEach((cart:any) => {
          this._wishlistService.changeWishlist(cart);
        });
      });
    }
  }

  removeWishlist(wishlist:any) {
    this._wishlistService.deleteWishlist(wishlist._id).subscribe((resp:any) => {
      this._wishlistService.removeItemWishlist(wishlist);
    });
  }

}
