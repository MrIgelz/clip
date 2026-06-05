import { AfterViewInit, Component, DestroyRef, Directive, ElementRef, inject, Input, OnDestroy, OnInit, Self, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import { GridstackComponent, NgGridStackOptions, BaseWidget } from 'gridstack/dist/angular';
import { CardModule } from 'primeng/card';
import { DashboardWidget,  DashboardAction, WidgetService, DashboardCard, WidgetServiceMessage } from '../widget.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import timeGridPlugin from '@fullcalendar/timegrid';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import { Timeline, TimelineOptions } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';  

// NEW
@Directive({
  selector: 'full-calendar[cardType]'
})
export class CalendarWidgetDirective implements OnInit {
  @Input('cardType') cardType!: string;

  private widgetService: WidgetService = inject(WidgetService);
  private destroyRef: DestroyRef = inject(DestroyRef); 

  constructor(@Self() private calendar: FullCalendarComponent) {}

  ngOnInit() {
    if (this.cardType === '') return;
    this.widgetService.message$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((message: WidgetServiceMessage) => {
      console.log(message)
      if (message.receiver === this.cardType + "_calendar" && message.action === 'updateSize') {
        this.calendar.getApi().updateSize();
      }
    });
  };
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
  // NEW
  //styles: '::ng-deep .fc .fc-view-harness { max-height: 200px !important; overflow-y: auto !important; }',
  imports: [NamedTemplateDirective, FullCalendarModule, CalendarWidgetDirective],
  template: `
    <ng-template namedCardTemplate="calendar">
      <!-- NEW -->
      <div>
       <!--[style]="{
          'max-height': typeof maxHeight === 'number' ? maxHeight + 'px' : maxHeight,
          'overflow-y': 'auto'
        }"-->
        <full-calendar #fc cardType="calendar" [options]="calendarOptions"></full-calendar>
      </div>  
    </ng-template>
    <ng-template namedCardTemplate="timeLeave">
      <div>
        <h3>Dynamic Template</h3>
        <p>This content was defined in the first child component!</p>
      </div>
    </ng-template>
    <ng-template  namedCardTemplate="booking">
      <p>Standard Body Content.</p>
    </ng-template>
  `
})
export class CardTemplateComponent implements AfterViewInit {

  @ViewChild('fc', {static: false}) set fc(fc:any) {
    console.log("FC", fc); 
  }
  // NEW
  //maxHeight: number | 'auto' = 'auto';

  widgetService: WidgetService = inject(WidgetService);

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin],
    initialView: 'timeGridDay',
    slotDuration: { minutes: 30 },
    // NEW
    scrollTime: '08:00:00', 
    height: 400,
    events: [
      { title: 'Meeting', start: new Date() }
    ]
  };

  constructor() {
  }

  ngAfterViewInit(): void {
    // NEW (This is example usage only)
    setTimeout(() => this.widgetService.sendMessage({
      receiver: 'widgetService',
      sender: 'calendar',
      action: 'noContentRemove'
    }), 1115000);
  }
}


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
      <div>
        <ng-container *ngTemplateOutlet="template$ | async"></ng-container>
    </div>
    } @else { 
      <p-panel [header]="cardType" [style]="{'margin': '5px'}">
        <p>Diese Karte dient als Platzhalter. Sie wird nur eingeblendet, falls valide Daten vorhanden sind.</p>
      </p-panel>
    }
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
      map((templateMap: Map<string, TemplateRef<any>>) => {
        console.log("Getting template", templateMap.get(this.templateType))
        return templateMap.get(this.templateType) || null
      })
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
    CommonModule,
    FormsModule,
    JsonPipe,
    CheckboxModule,
    CardModule,
    GridstackComponent,
    CardTemplateComponent,
    CardTemplateComponent,
    MessageModule,
    ButtonModule
]
})
export class DashboardComponent implements AfterViewInit {

  @ViewChild('timelineContainer', { static: false }) timelineContainer!: ElementRef;
  
  private timeline!: Timeline;
  
  private destroyRef = inject(DestroyRef); 

  widgetService: WidgetService = inject(WidgetService);

  isUsingDefault: boolean = true;

  isEditable: boolean = false;

  editableCards: DashboardCard[] | null = null;

  @ViewChild(GridstackComponent) 
  dashboard!: GridstackComponent;

  gridOptions: NgGridStackOptions = {
    //handle: '.widget-header',
    resizable: {
      handles: 'w, e'
    },
    acceptWidgets: (el: Element) => this.isEditable,
    sizeToContent: false,
    margin: 5,
    minRow: 55,
    cellHeight: 10
  }

  constructor() {
    GridstackComponent.addComponentToSelectorType([WidgetCardComponent]);
  }

  toggleEdit(): void {
    this.widgetService.setEditableStatus(!this.isEditable);
  }

  private updateSidebar(): void {
    setTimeout(() => {
      GridStack.setupDragIn(
        '.sidebar-item', 
        { helper: 'clone', appendTo: 'body' }
    )}, 200);
  }

  ngAfterViewInit() {

    const groups = new DataSet([
      { id: 'raum_a', content: 'Raum A' },
      { id: 'raum_b', content: 'Raum B' },
      { id: 'raum_c', content: 'Raum C' },
      { id: 'raum_d', content: 'Raum D' },
      { id: 'raum_e', content: 'Raum E' },
      { id: 'raum_f', content: 'Raum F' },
      { id: '1', content: 'Raum A' },
      { id: '2', content: 'Raum B' },
      { id: '3', content: 'Raufsdsdfm C' },
      { id: '4', content: 'Raum D' },
      { id: '5', content: 'Raum E' },
      { id: '6', content: 'Raum F' },
      { id: 'raum_x', content: 'Raum A', nestedGroups: ['raum_a', 'raum_b'], className: 'no-bookings-parent' }
    ]);

    const items = new DataSet([
      { id: 10, group: '5', content: 'Meeting', start: '2026-05-31T09:00:00', end: '2026-05-31T11:00:00' },
      { id: 4, group: 'raum_e', content: 'Meeting', start: '2026-05-31T09:00:00', end: '2026-05-31T11:00:00' },
      { id: 5, group: 'raum_d', content: 'Kundenpräsentation', start: '2026-05-31T10:00:00', end: '2026-05-31T12:00:00' },
      { id: 6, group: 'raum_f', content: 'Workshop', start: '2026-05-31T13:00:00', end: '2026-05-31T16:00:00' },
      { id: 7, group: 'raum_f', content: 'Meeting', start: '2026-05-31T09:00:00', end: '2026-05-31T11:00:00' },
      { id: 8, group: 'raum_c', content: 'Kundenpräsentation', start: '2026-05-31T10:00:00', end: '2026-05-31T12:00:00' },
      { id: 9, group: 'raum_c', content: 'Workshop', start: '2026-05-31T13:00:00', end: '2026-05-31T16:00:00' }
    ]);

    const slotWidth = 55; 
    const containerWidth = 1200; 
    const visibleSlots = containerWidth / slotWidth;
    const visibleHours = visibleSlots * 0.5;

    const startDate = new Date('2026-05-31T08:00:00');
    const endDate = new Date(startDate.getTime() + (visibleHours * 60 * 60 * 1000));

    const options: TimelineOptions = {
      orientation: 'top',
      width: '100%',
      verticalScroll: true,
      moveable: true,
      height: undefined,
      
      zoomable: false,
      min: '2026-05-31T00:00:00', 
      max: '2026-05-31T24:00:00', 
      start: '2026-05-31T08:00:00',
      end: endDate,
      stack: false,
      showMajorLabels: false,
      margin: {
        item: 6,
        axis: 3
      },
      timeAxis: { 
        scale: 'minute', 
        step: 30,
        
      } as const
    };

    this.timeline = new Timeline(this.timelineContainer.nativeElement, items, groups, options);

    const grid: GridStack | undefined = this.dashboard.grid;
    if(grid) {
      this.widgetService.loadModule("desktop");

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

      // NEW
      grid.on('resizestop', (event: Event, el: GridItemHTMLElement) => {
        if (el) {
          grid.resizeToContent(el);
          this.widgetService.sendMessage({
            receiver: el.gridstackNode!.id! + "_calendar",
            action: 'updateSize'
          });
        }
      });

      this.widgetService.isUsingDefault$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(isUsingDefault => this.isUsingDefault = isUsingDefault);

      this.widgetService.isEditable$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(isEditable => {
        this.isEditable = isEditable;
        this.updateSidebar();
        isEditable ? grid.enable() : grid.disable();
      });

      this.widgetService.editableCards$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((editableCards: DashboardCard[] | null) => {
        this.editableCards = editableCards; 
        this.updateSidebar();
      });

      this.widgetService.dashboardAction$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((action: DashboardAction) => {
        if (!action) return;

        if(action.type === 'load') {
            grid.load(action.widgets);
            grid.getGridItems().forEach(item => grid.resizeToContent(item));
        } else {
          // NEW
          //if (!this.editableCards) return;

          const allItems: GridItemHTMLElement[] = grid.getGridItems();
          const item: GridItemHTMLElement | undefined = allItems.find((item: GridItemHTMLElement) =>
            item.gridstackNode?.id === action.widget.id);
          // NEW
          let editableCard: DashboardCard | undefined;
          if (this.editableCards) {
            editableCard = this.editableCards.find(
              card => card.cardType === action.widget.id);
          }

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
            // NEW
            case 'remove':
            case 'noContentRemove':
              console.log("Remove")
              if (item  && (editableCard || action.type === 'noContentRemove')) {
                if (action.type === 'remove') {
                  editableCard!.height = 1; 
                  editableCard!.enabled = false;
                }
                grid.removeWidget(item);
              }
          }
        }
      });
    }
  }
}