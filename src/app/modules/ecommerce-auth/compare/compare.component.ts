import { Component, OnInit } from '@angular/core';
declare var $:any;
declare function HOMEINITTEMPLATE([]):any;
@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.css']
})
export class CompareComponent implements OnInit {

  ngOnInit(): void {
     setTimeout(() => {
       HOMEINITTEMPLATE($);
    }, 50);
  }

}
