import { Component, OnInit, AfterViewInit } from '@angular/core';

declare var $: any;

interface Testimonial {
  id: number;
  text: string;
  rating: number;
  author: {
    name: string;
    role: string;
    image: string;
  };
  reviewCount: number;
}

@Component({
  selector: 'app-testimonials',
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.scss']
})
export class TestimonialsComponent implements OnInit, AfterViewInit {

  testimonials: Testimonial[] = [
    {
      id: 1,
      text: 'Usé la de Python para dar clase y terminé regalando el enlace de la tienda a medio grupo. Se nota que está hecha por alguien que sabe lo que es un buen print… y un buen lenguaje 😎',
      rating: 5,
      author: {
        name: 'Lucia M.',
        role: 'Profesora de programación',
        image: 'assets/images/users/luciaM.jpeg'
      },
      reviewCount: 24
    },
    {
      id: 2,
      text: 'La camiseta de Swift me acompaña en todas mis sesiones de código. Calidad increíble y diseño que no pasa desapercibido. Perfecta para los que vivimos programando en iOS.',
      rating: 4,
      author: {
        name: 'Diego F.',
        role: 'Full Stack',
        image: 'assets/images/users/diegoF.jpeg'
      },
      reviewCount: 15
    },
    {
      id: 3,
      text: 'Me compré la camiseta con el logo de ChatGPT y terminé dando una charla improvisada sobre IA en la oficina. Literalmente, una prenda que inicia conversaciones.',
      rating: 3,
      author: {
        name: 'Jorge T.',
        role: 'DevOps',
        image: 'assets/images/users/jorjeT.jpeg'
      },
      reviewCount: 17
    },
    {
      id: 4,
      text: 'La de \'Code Style\' fue un golpe bajo para los que usan Python, pero bueno, alguien tenía que decirlo 😎',
      rating: 2,
      author: {
        name: 'Marta L.',
        role: 'JavaScript Lover',
        image: 'assets/images/users/martaL.jpeg'
      },
      reviewCount: 29
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initializeSlider();
  }

  private initializeSlider(): void {
    if (typeof $ !== 'undefined') {
      setTimeout(() => {
        $('.testimonial-slider-3items').slick({
          dots: true,
          arrows: true,
          infinite: true,
          speed: 300,
          slidesToShow: 3,
          slidesToScroll: 1,
          autoplay: true,
          autoplaySpeed: 5000,
          responsive: [
            {
              breakpoint: 1024,
              settings: {
                slidesToShow: 2,
                slidesToScroll: 1
              }
            },
            {
              breakpoint: 768,
              settings: {
                slidesToShow: 1,
                slidesToScroll: 1
              }
            }
          ]
        });
      }, 100);
    }
  }

  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
  }

}