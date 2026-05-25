import { AfterViewInit, Component, DestroyRef, Directive, ElementRef, inject, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import { GridstackComponent, NgGridStackOptions, BaseWidget } from 'gridstack/dist/angular';
import { CardModule } from 'primeng/card';
import { DashboardWidget,  DashboardAction, WidgetService, DashboardCard } from '../widget.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';

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
  imports: [CardModule, CommonModule, PanelModule],
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
    @if (templateType !== 'placeholder') {
      <ng-container *ngTemplateOutlet="template$ | async"></ng-container>
    } @else { 
      <p-panel [header]="cardType">
      <div class="placeholder-card">
        <h3></h3>
        <p>Diese Karte dient als Platzhalter. Sie wird nur eingeblendet, falls valide Daten vorhanden sind.</p>
      </div>
      </p-panel>
    }
  </div>
  `,
  styles: [`
    .placeholder-card {
      padding: 5px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      font-family: Arial, sans-serif;
      background-color: #ffffff;
    }
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
  private destroyRef: DestroyRef = inject(DestroyRef);
  
  private isEditable: boolean = false;
  template$!: Observable<TemplateRef<any> | null>;

  @Input({required: true})
  templateType!: string;

  @ViewChild('container') 
  container!: ElementRef<HTMLDivElement>;

  cardType: string = "";

  constructor() {
    super(); 
  }

  ngOnInit() {
    const widget = this.widgetItem as DashboardWidget | undefined;
    if (widget) this.cardType = widget.card.cardType;

    this.widgetService.isEditable$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(isEditable => this.isEditable = isEditable);

    this.template$ = this.widgetService.templateRegistry$.pipe(
      takeUntilDestroyed(this.destroyRef),
      map((templateMap: Map<string, TemplateRef<any>>) => templateMap.get(this.templateType) || null)
    );
  }

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const widget = this.widgetItem as DashboardWidget | undefined;
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
  }

  removeWidget(): void {
    const widget = this.widgetItem as DashboardWidget | undefined;
    if (widget && this.isEditable) {
      this.widgetService.removeWidget(widget);
    }
  }
}

@Component({
  selector: 'dashboard',
  styleUrl: 'dashboard.component.scss',
  templateUrl: 'dashboard.component.html',
  providers: [WidgetService],
  imports: [
    FormsModule,
    JsonPipe,
    CheckboxModule,
    GridstackComponent,
    CardTemplateComponent,
    CardTemplateComponent
]
})
export class DashboardComponent implements AfterViewInit {
  
  private destroyRef = inject(DestroyRef); 

  widgetService: WidgetService = inject(WidgetService);

  isUsingDefault: boolean = true;

  isEditable: boolean = false;

  editableCards: DashboardCard[] | null = null;

  @ViewChild(GridstackComponent) 
  dashboard!: GridstackComponent;

  gridOptions: NgGridStackOptions = {
    handle: '.widget-header',
    resizable: {
      handles: 'w, e'
    },
    acceptWidgets: (el: Element) => this.isEditable,
    sizeToContent: false,
    margin: 5,
    minRow: 6,
    cellHeight: 10
  }

  constructor() {
    GridstackComponent.addComponentToSelectorType([WidgetCardComponent]);
  }

  toggleEdit(): void {
    this.widgetService.setEditableStatus(!this.isEditable);
  }

  ngAfterViewInit() {
    const grid: GridStack | undefined = this.dashboard.grid;
    if(grid) {
      grid.on('change', (event: Event, changedNodes: GridStackNode[]) => {
        if (!this.editableCards) return;
        for (const widget of changedNodes as DashboardWidget[]) {
          const card: DashboardCard | undefined = this.editableCards.find(card => card.cardType === widget.id);
          if (card && widget.isEditable) {
            card.positionX = widget.x!;
            card.positionY = widget.y!;  
            card.width = widget.w!;
          }
        }    
      });

      grid.on('dropped', (event: Event, _: GridStackNode, node: GridStackNode) => {
        const dropped = node as DashboardWidget;
        const { id, x, y, w, noResize, selector, input, card } = dropped;
        if(dropped.el) {
          const widget: DashboardWidget = { id, x, y, w, noResize, selector, input, card, isEditable: true, h: 1 };
          grid.removeWidget(dropped.el);
          this.widgetService.addWidget(widget);
        }
      });

      grid.on('resizestop', (event: Event, el: GridItemHTMLElement) => {
        if (el) grid.resizeToContent(el);
      });

      this.widgetService.isUsingDefault$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(isUsingDefault => this.isUsingDefault = isUsingDefault);

      this.widgetService.isEditable$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(isEditable => {
        this.isEditable = isEditable;
        isEditable ? grid.enable() : grid.disable();
      });

      this.widgetService.editableCards$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((editableCards: DashboardCard[] | null) => {
        this.editableCards = editableCards;

          setTimeout(() => {
            GridStack.setupDragIn(
              '.sidebar-item', 
              { helper: 'clone', appendTo: 'body' }
          )}, 100);
      });

      this.widgetService.dashboardAction$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((action: DashboardAction) => {
        if (!action) return;

        if(action.type === 'load') {
            grid.load(action.widgets);
            grid.getGridItems().forEach(item => grid.resizeToContent(item));
        } else {
          if (!this.editableCards) return;

          const allItems: GridItemHTMLElement[] = grid.getGridItems();
          const item: GridItemHTMLElement | undefined = allItems.find((item: GridItemHTMLElement) =>
            item.gridstackNode?.id === action.widget.id);
          const editableCard: DashboardCard | undefined = this.editableCards.find(
            card => card.cardType === action.widget.id);

          switch (action.type) {
            case 'add':
              if (!item && editableCard) {
                editableCard.positionX = action.widget.x!;
                editableCard.positionY = action.widget.y!;
                editableCard.width = action.widget.w!;
                editableCard.height = 1;
                editableCard.enabled = true;
                const addedItem: GridItemHTMLElement = grid.addWidget(action.widget);
                grid.resizeToContent(addedItem)
              }
              break;
            case 'remove':
              if (item && editableCard) {
                editableCard.height = 1;
                editableCard.enabled = false;
                grid.removeWidget(item);
              }
          }
        }
      });
    }
  }
}