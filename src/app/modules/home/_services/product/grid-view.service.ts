import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface GridViewMode {
  columns: number;
  type: 'list' | 'grid';
  className: string;
}

@Injectable({
  providedIn: 'root'
})
export class GridViewService {
  private gridModes: GridViewMode[] = [
    { columns: 1, type: 'list', className: 'list-view' },
    { columns: 2, type: 'grid', className: 'grid-2-col' },
    { columns: 3, type: 'grid', className: 'grid-3-col' },
    { columns: 4, type: 'grid', className: 'grid-4-col' },
    { columns: 5, type: 'grid', className: 'grid-5-col' }
  ];

  private currentViewSubject = new BehaviorSubject<GridViewMode>(this.gridModes[3]); // Default to 4-column grid (desktop)
  public currentView$ = this.currentViewSubject.asObservable();

  constructor() {}

  /**
   * Set the current grid view mode
   * @param columns - Number of columns (1-5)
   */
  setGridView(columns: number): void {
    const mode = this.gridModes.find(m => m.columns === columns);
    if (mode) {
      this.currentViewSubject.next(mode);
    }
  }

  /**
   * Get the current grid view mode
   * @returns Current GridViewMode
   */
  getCurrentView(): GridViewMode {
    return this.currentViewSubject.value;
  }

  /**
   * Get all available grid modes
   * @returns Array of GridViewMode
   */
  getAvailableGridModes(): GridViewMode[] {
    return this.gridModes;
  }

  /**
   * Get CSS class for current view
   * @returns CSS class string
   */
  getCurrentViewClass(): string {
    return this.currentViewSubject.value.className;
  }

  /**
   * Check if current view is list mode
   * @returns boolean
   */
  isListView(): boolean {
    return this.currentViewSubject.value.type === 'list';
  }

  /**
   * Check if current view is grid mode
   * @returns boolean
   */
  isGridView(): boolean {
    return this.currentViewSubject.value.type === 'grid';
  }
}