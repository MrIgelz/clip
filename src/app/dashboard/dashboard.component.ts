import { AfterViewInit, Component, DestroyRef, Directive, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, Self, TemplateRef, ViewChild } from '@angular/core';
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
import listPlugin from '@fullcalendar/list';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import { DataGroup, DataItem, Timeline, TimelineOptions } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';  
import { DividerModule } from 'primeng/divider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';

@Directive({
  selector: '[timeline]'
})
export class TimelineWidgetDirective implements AfterViewInit, OnDestroy {

  private slotWidth!: number;

  private resizeObserver!: ResizeObserver;

  private timeline!: Timeline;
  private _groups = new DataSet<DataGroup>();
  private _items = new DataSet<DataItem>();

  @Input('cardContainer') 
  cardContainer!: HTMLDivElement;

  @Input('groups') 
  set groups(groups: DataGroup[]) {
    if (groups) {
      this._groups.clear();
      this._groups.add(groups);
    }
  }

  @Input('items') 
  set items(items: DataItem[]) {
    if (items) {
      this._items.clear();
      this._items.add(items);
    }
  };

  @Output() loaded = new EventEmitter<void>();

  constructor(@Self() private containerRef: ElementRef) {}

  ngAfterViewInit() {
    
    this.timeline = new Timeline(this.containerRef.nativeElement, this._items, this._groups, this.getOptions());
    this.loaded.emit();
    this.setupResizeObserver();
  };

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0 && this.timeline) {
          const start: Date = this.timeline.getWindow().start;
          const end: Date = this.getEndDate(start, width);
          this.timeline.setWindow( start, end );
        }
      }
    });

    this.resizeObserver.observe(this.cardContainer);
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.timeline) {
      this.timeline.destroy();
    }
  }

  private getEndDate(startDate: Date, cardWidth: number): Date {
    this.updateSlotWidth(cardWidth);
    const slotDuration: number = 30; 
    const numSlots: number = cardWidth / this.slotWidth;
    const visibleHours = (numSlots * 60) / slotDuration;
    return new Date(startDate.getTime() + (visibleHours * 60 * 60 * 1000));
  }

  private updateSlotWidth(cardWidth: number): void {
    const divElement = this.containerRef.nativeElement as  HTMLDivElement;
    if (cardWidth > 700) {
      this.slotWidth = 300;
      divElement.classList.remove('small-time-slots');
    }  else {
      this.slotWidth = 200;
      divElement.classList.add('small-time-slots');
    }
  }

  private getOptions(): TimelineOptions {
    const min: Date = new Date();
    min.setHours(0, 0, 0, 0);
    const max: Date = new Date(min.getTime() + 24 * 60 * 60 * 1000);
    const start: Date = new Date(min.getTime() + 8 * 60 * 60 * 1000);
    const width: number = this.cardContainer.offsetWidth;
    const end: Date = this.getEndDate(start, width);

    return {
      orientation: 'top',
      width: '100%',
      verticalScroll: true,
      moveable: true,
      zoomable: false,
      stack: false,
      showMajorLabels: false,
      margin: {
        item: 6,
        axis: 3
      },
      timeAxis: { 
        scale: 'minute', 
        step: 30
      },
      min, max, start, end   
    };
  }
}

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
  imports: [TimelineWidgetDirective, NamedTemplateDirective, FullCalendarModule, CalendarWidgetDirective],
  template: `
      <ng-template namedCardTemplate="calendar3" let-cardContainer>
        <div timeline [cardContainer]=cardContainer [groups]=groups [items]=items (loaded)="loadAllBookings()"></div>
      </ng-template>
      <ng-template namedCardTemplate="calendar2">
      <!-- NEW -->
      <div>
       <!--[style]="{
          'max-height': typeof maxHeight === 'number' ? maxHeight + 'px' : maxHeight,
          'overflow-y': 'auto'
        }"-->
        <full-calendar #fc2 cardType="calendar2" [options]="calendarOptions2"></full-calendar>
      </div>  
    </ng-template>
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

  private isMyBookingsLoading = false; 
  private isAllBookingsLoading = false; 
  private isBookingTasksLoading = false;

  groups: DataGroup[] = [];
  items: DataItem[] = [];

  loadMyBookings(): void {
    if (this.isMyBookingsLoading) return; 
    this.isMyBookingsLoading = true; 
  }

  loadAllBookings(): void {
    if (this.isAllBookingsLoading) return; 
    this.isAllBookingsLoading = true; 

    setTimeout(() => {
      this.groups = [
        { id: 'raum_a', content: 'Raum A' },
        { id: 'raum_b', content: 'Raum B' },
        { id: 'raum_c', content: 'Raum C' },
        { id: 'raum_d', content: 'Raum D' },
        { id: 'raum_e', content: 'Raum E' },
        { id: 'raum_f', content: 'Raum F' },
        { id: '1', content: 'Raum A' },
        { id: '2', content: 'Raum B' },
        { id: '3', content: 'Raufsdsdfgdfgfm C' },
        { id: '4', content: 'Raum D' },
        { id: '5', content: 'Raum E' },
        { id: '6', content: 'Raum F' },
        { id: 'raum_x', content: 'Raum A', nestedGroups: ['raum_a', 'raum_b'], className: 'no-bookings-parent' }
      ];

      this.items = [
        { id: 10, group: '5', content: 'Meeting', start: '2026-05-31T09:00:00', end: '2026-05-31T11:00:00' },
        { id: 4, group: 'raum_e', content: 'Meeting', start: '2026-05-31T09:00:00', end: '2026-05-31T11:00:00' },
        { id: 5, group: 'raum_d', content: 'Kundenpräsentation', start: '2026-05-31T10:00:00', end: '2026-05-31T12:00:00' },
        { id: 6, group: 'raum_f', content: 'Workshop', start: '2026-05-31T13:00:00', end: '2026-05-31T16:00:00' },
        { id: 7, group: 'raum_f', content: 'Meeting', start: '2026-05-31T09:00:00', end: '2026-05-31T11:00:00' },
        { id: 8, group: 'raum_c', content: 'Kundenpräsentation', start: '2026-05-31T10:00:00', end: '2026-05-31T12:00:00' },
        { id: 9, group: 'raum_c', content: 'Workshop', start: '2026-05-31T13:00:00', end: '2026-05-31T16:00:00' },

        { id: '11', group: 'raum_f', content: '', start: '2026-05-31T02:00:00', end: '2026-05-31T7:00:00', type: 'background' }
      ];
    }, 0);
  }

  loadBookingTasks(): void {
    if (this.isBookingTasksLoading) return; 
    this.isBookingTasksLoading = true; 
  }

  // NEW
  //maxHeight: number | 'auto' = 'auto';

  widgetService: WidgetService = inject(WidgetService);

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin],
    headerToolbar: false,
    initialView: 'timeGridDay',
    slotDuration: { minutes: 30 },
    // NEW
    scrollTime: '08:00:00', 
    height: 400,
    //timeZone: 'local',
    events: [
      { title: 'Meeting', start: new Date() }
    ],
    datesSet(arg) {
      console.log(arg)
    },
  };

  calendarOptions2: CalendarOptions = {
    plugins: [listPlugin],
    headerToolbar: false,
    initialView: 'listDay',
    slotDuration: { minutes: 30 },
    height: 400,
    //timeZone: 'local',
    events: [
      { title: 'Meeting', start: new Date() }
    ],
    datesSet(arg) {
      console.log(arg)
    },
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
        <ng-container *ngTemplateOutlet="(template$ | async); context: { $implicit: container }"></ng-container>
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
    ButtonModule,
    DividerModule,
    SelectButtonModule,
    TooltipModule
]
})
export class DashboardComponent implements OnInit, AfterViewInit {

  @ViewChild('timelineContainer', { static: false }) timelineContainer!: ElementRef;
  
  private timeline!: Timeline;
  
  private destroyRef = inject(DestroyRef); 

  widgetService: WidgetService = inject(WidgetService);

  showHintCard: boolean = false;
  isUsingDefault: boolean = true;
  isEditable: boolean = false;

  dashboardOptions: {label: string, value: 'DEFAULT' | 'CUSTOM'}[] = [];

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

  ngOnInit(): void {
    this.dashboardOptions = [
      { label: 'Eigenes Dashboard', value: 'CUSTOM' },
      { label: 'Standard Dashboard', value: 'DEFAULT' }
    ];
  }

  onDashboardChange(dashboard: 'DEFAULT' | 'CUSTOM'): void {
    this.widgetService.useDefault(dashboard === 'DEFAULT');
  }

  ngAfterViewInit() {
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
      ).subscribe(isUsingDefault => {
        if(isUsingDefault !== this.isUsingDefault) {
          this.showHintCard = this.isEditable && isUsingDefault;
        }
        this.isUsingDefault = isUsingDefault;
      });

      this.widgetService.isEditable$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(isEditable => {
        if(isEditable !== this.isEditable) {
          this.showHintCard = isEditable && this.isUsingDefault;
        }
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