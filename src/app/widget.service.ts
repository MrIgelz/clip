import { Injectable } from '@angular/core';
import { NgGridStackWidget } from 'gridstack/dist/angular';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WidgetService {
  
  private widgets = new BehaviorSubject<NgGridStackWidget[]>([]);
  private isLoading = new BehaviorSubject<boolean>(false);

  widgets$ = this.widgets.asObservable();
  isLoading$ = this.isLoading.asObservable();

  setLoading(state: boolean) {
    this.isLoading.next(state);
  }

  async loadLayout(config: NgGridStackWidget[]) {
    if (this.isLoading.value) return;
    
    this.isLoading.next(true);
    this.widgets.next(config);
    this.isLoading.next(false);
  }

  addWidget(widget: NgGridStackWidget) {
    if (this.isLoading.value) return;

    const current = this.widgets.value;
    this.widgets.next([...current, widget]);
  }

  removeWidget(id: string) {
    if (this.isLoading.value) return;

    const current = this.widgets.value;
    const updated = current.filter(w => w.id !== id);
    if (current.length !== updated.length) {
      this.widgets.next(updated);
    }
  }

  clearAll() {
    if (this.isLoading.value) return;

    this.widgets.next([]);
  }
}