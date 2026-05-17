import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Widget } from './dashboard/dashboard.component';

export type GridAction = 
  { type: 'load'; widgets: Widget[]; } | 
  { type: 'add'; widget: Widget; } | 
  { type: 'remove'; widgetId: string; } | 
  null;

@Injectable()
export class WidgetService {

  private templates = new Map<string, TemplateRef<any>>();

  private templateRegistry = new BehaviorSubject<Map<string, TemplateRef<any>>>(new Map());

  private widgets: Widget[] = [];

  private gridAction = new BehaviorSubject<GridAction>(null);

  templateRegistry$ = this.templateRegistry.asObservable();

  gridAction$ = this.gridAction.asObservable();

  registerTemplate(name: string, template: TemplateRef<any>) {
    console.log("Registered", name)
    this.templates.set(name, template);
    this.templateRegistry.next(new Map(this.templates));
  }

  unregisterTemplate(name: string) {
    this.templates.delete(name);
    this.templateRegistry.next(new Map(this.templates));
  }

  loadLayout(widgets: Widget[]) {
    this.widgets = widgets;
    this.gridAction.next({
      type: 'load',
      widgets: widgets
    });
  }

  addWidget(widget: Widget): void {
    if (!this.widgets.find((w: Widget) => w.id === widget.id)) {
      this.widgets.push(widget);
      this.gridAction.next({
        type: 'add',
        widget
      });
    }
  }

  removeWidget(widgetId: string): void {
    const length: number = this.widgets.length;
    const updated = this.widgets.filter((w: Widget) => w.id !== widgetId);
    if (length !== updated.length) {
      this.widgets = updated;
      this.gridAction.next({
        type: 'remove',
        widgetId
      });
    }
  }
}