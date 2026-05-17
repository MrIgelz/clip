import { AfterViewInit, Component, DestroyRef, Directive, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { GridItemHTMLElement, GridStack, GridStackOptions } from 'gridstack';
import { GridstackComponent, gsCreateNgComponents, NgGridStackOptions, NgGridStackWidget, nodesCB, BaseWidget, NgCompInputs } from 'gridstack/dist/angular';
import { CardModule } from 'primeng/card';
import { GridAction, WidgetService } from '../widget.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import { map, Observable, pairwise, startWith } from 'rxjs';

export interface CardData {
  positionX: number;
  positionY: number;
  width: number;
  name: string
}

export interface Widget extends NgGridStackWidget {
  el?: GridItemHTMLElement;
  cardData: CardData;  
}

@Directive({
  selector: '[namedCardTemplate]',
  standalone: true
})
export class NamedTemplateDirective implements OnInit, OnDestroy {
  private widgetService: WidgetService = inject(WidgetService);
  private templateRef: TemplateRef<any> = inject(TemplateRef<any>);

  @Input('namedCardTemplate') name!: string;

  ngOnInit() {
    if (this.name) {
      this.widgetService.registerTemplate(this.name, this.templateRef);
    }
  }

  ngOnDestroy() {
    if (this.name) {
      this.widgetService.unregisterTemplate(this.name);
    }
  }
}

@Component({
  selector: 'card-template-component',
  imports: [NamedTemplateDirective],
  template: `
    <ng-template namedCardTemplate="timeLeave">
      <div>
        <h3>Dynamic Template</h3>
        <p>This content was defined in the first child component!</p>
      </div>
    </ng-template>
    <ng-template namedCardTemplate="booking">
      <p>Standard Body Content.</p>
    </ng-template>
  `
})
export class CardTemplateComponent {}


@Component({
  selector: 'widget-card',
  imports: [CardModule, CommonModule],
  template: `
  <div #container>
    <div class="widget-header">
      <div class="drag-widget">
        <i class="fa-solid fa-grip fa-xs"></i>
      </div>
      <div (click)="removeWidget()"
        class="remove-widget cursor-pointer">
        <i class="fa-solid fa-xmark fa-xs"></i>
      </div>
    </div>
      <ng-container *ngTemplateOutlet="template$ | async"></ng-container>
  </div>
  `,
  styles: [`
    ::ng-deep .grid-stack-placeholder > .placeholder-content {
      border-radius: var(--p-card-border-radius);
    }
    ::ng-deep .grid-stack-item-content {
      background: var(--p-card-background);
      color: var(--p-card-color);
      border-radius: var(--p-card-border-radius);
      box-shadow: var(--p-card-shadow);
      overflow: hidden !important; 
    }
    .widget-header {
      display: flex;
      user-select: none;
      -webkit-user-select: none;
      justify-content: space-between;
      padding: 2px 12px 0 12px;
      border-bottom: 1px solid var(--p-content-border-color);
      cursor: move;
    }
    .widget-content {

    }
    .widget-resizer {
      position: absolute;
      right: 5px;
      bottom: 5px;
      z-index: 1000;
      cursor: se-resize;
    }
    .drag-widget > i,
    .remove-widget > i, 
    .widget-resizer > i {
      color: var(--p-surface-500);
    }
    .drag-widget:hover > i,
    .remove-widget:hover > i,
    .widget-resizer:hover > i {
      color: var(--p-primary-color);
    }
  `]
})
export class WidgetCardComponent extends BaseWidget implements OnInit, AfterViewInit, OnDestroy {

  private resizeObserver!: ResizeObserver;

  private prevHeight: number | undefined;

  private widgetService: WidgetService = inject(WidgetService);

  template$!: Observable<TemplateRef<any> | null>;

  @ViewChild('container') 
  container!: ElementRef<HTMLDivElement>;

  constructor() {
    super(); 
  }

  ngOnInit() {
    this.template$ = this.widgetService.templateRegistry$.pipe(
      map((templateMap: Map<string, TemplateRef<any>>) => templateMap.get("timeLeave") || null)
    );
  }

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const widget: Widget | undefined = this.widgetItem as Widget | undefined;
      const el: GridItemHTMLElement | undefined = widget?.el
      const grid: GridStack | undefined = el?.gridstackNode?.grid;
      if (el && grid && entries.length) {
        const height: number = Math.round(entries[0].contentRect.height);
        if (height !== this.prevHeight) {
          grid.resizeToContent(el);
          this.prevHeight = height;
        }
      }
    });

    this.resizeObserver.observe(this.container.nativeElement)
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    console.log("Template Destroyed", this.widgetItem);
  }

  removeWidget(): void {
    if (this.widgetItem && this.widgetItem.id) {
      this.widgetService.removeWidget(this.widgetItem.id);
    }
  }
}

@Component({
  selector: 'dashboard',
  templateUrl: 'dashboard.component.html',
  providers: [WidgetService],
  imports: [
    GridstackComponent,
    CardTemplateComponent,
    CardTemplateComponent
]
})
export class DashboardComponent implements AfterViewInit {
  
  private id: number = 0;

  private destroyRef = inject(DestroyRef); 

  private widgetService: WidgetService = inject(WidgetService);

  @ViewChild(GridstackComponent) 
  dashboard!: GridstackComponent;

  gridOptions: NgGridStackOptions = {
    handle: '.widget-header',
    resizable: {
      handles: 'w, e'
    },
    acceptWidgets: (el: Element) => true,
    sizeToContent: false,
    margin: 5,
    minRow: 6,
    cellHeight: 10
  }

  constructor() {
    GridstackComponent.addComponentToSelectorType([WidgetCardComponent]) ;
  }

  ngAfterViewInit() {
    const grid: GridStack | undefined = this.dashboard.grid;
    if(grid) {
      GridStack.setupDragIn('.sidebar-item', { 
        helper: 'clone',
        appendTo: 'body'
      }); 
      grid.updateOptions({sizeToContent: false});

      grid.on('resizestop', (event: Event, el: HTMLElement) => {
        if (el) grid.resizeToContent(el);
      });

      this.widgetService.gridAction$
        .pipe(
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((action: GridAction) => {
          if (!action) return;

          let allItems: GridItemHTMLElement[] | undefined;
          let el: GridItemHTMLElement | undefined;
          switch (action.type) {
            case 'load':
              grid.load(action.widgets);
              break;
            case 'add':
              allItems = grid.getGridItems();
              el = allItems.find((item: GridItemHTMLElement) => item.gridstackNode?.id === action.widget.id);
              if (!el) {
                grid.addWidget(action.widget);
              }
              break;
            case 'remove':
              allItems = grid.getGridItems();
              el = allItems.find((item: GridItemHTMLElement) => item.gridstackNode?.id === action.widgetId);
              if (el) {
                grid.removeWidget(el);
              }
          }
        });
    }

    const widgets: any[]= [];
    for(let i: number = 0; i < 4; i++) {
      const widget: Widget = {
        id: String(++this.id),
        x: 0, y: 4-i, w: 4-i, h: 1,
        selector:'widget-card',
        input: {
          grid: this.dashboard
        },
        cardData: {
          positionX: 1,
          positionY: 2,
          width: 3,
          name: "asd"
        }
      };
      widgets.push(widget);
    }

    this.widgetService.loadLayout(widgets);
  
    /* Copy Widget
    const wCopy: Widget[] = widgets.map(w => ({
      id: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: 1,
      selector: w.selector,
      input: { grid: this.dashboard }, 
      cardData: JSON.parse(JSON.stringify(w.cardData))
    }));

    this.widgetService.loadLayout(wCopy);*/
  }

    addWidget(widget: Widget) {
      this.widgetService.addWidget(widget)
    }
}