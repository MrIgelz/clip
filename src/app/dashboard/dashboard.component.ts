import { AfterViewInit, Component, DestroyRef, EventEmitter, inject, Input, OnDestroy, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { GridItemHTMLElement, GridStack, GridStackOptions } from 'gridstack';
import { GridstackComponent, gsCreateNgComponents, NgGridStackOptions, NgGridStackWidget, nodesCB, BaseWidget, NgCompInputs } from 'gridstack/dist/angular';
import { CardModule } from 'primeng/card';
import { WidgetService } from '../widget.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import { pairwise, startWith } from 'rxjs';

@Component({
  selector: 'widget-card',
  imports: [CardModule],
  template: `
  <p-card [style]="{'display': 'none'}"></p-card>
    <div class="widget-header">
      <div class="drag-widget">
        <i class="fa-solid fa-grip fa-xs"></i>
      </div>
      <div (click)="removeWidget()"
        class="remove-widget cursor-pointer">
        <i class="fa-solid fa-xmark fa-xs"></i>
      </div>
    </div>
      <div class="widget-content">
      <div class="widget-resizer">
        <i class="fa-solid fa-up-right-and-down-left-from-center fa-xs fa-rotate-90"></i>
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
export class WidgetCardComponent extends BaseWidget implements OnDestroy {

  widgetService: WidgetService = inject(WidgetService);

  @Input() id!: string;
  @Input() text: string = 'foo';

  onRemove(event: MouseEvent) {
    event.stopPropagation(); 
    
  }

  constructor() {
    super();
  }

  ngOnDestroy() {
    console.log('WidgetCardComponent destroyed');
  }

  override serialize(): NgCompInputs | undefined  { 
    return this.text ? {text: this.text} : undefined; 
  }

  removeWidget(): void {
    console.log("Remove", this.widgetItem?.id)
    if(this.widgetItem && this.widgetItem.id) {
      this.widgetService.removeWidget(this.widgetItem.id)
    }
  }
}

@Component({
  selector: 'dashboard',
  templateUrl: 'dashboard.component.html',
  imports: [
    AsyncPipe,
    GridstackComponent
  ]
})
export class DashboardComponent implements AfterViewInit {
  
  private id: number = 0;
  private isDropAllowed: boolean = false;

  private destroyRef = inject(DestroyRef); 

  widgetService: WidgetService = inject(WidgetService);
  @ViewChild(GridstackComponent) dashboard!: GridstackComponent;

  gridOptions: NgGridStackOptions = {
    handle: '.widget-header',
    resizable: {
      element: '.widget-resizer',
      handles: 'se'
    },
    acceptWidgets: (el: Element) => this.isDropAllowed,
    margin: 5,
    minRow: 6,
    children: [
      {x:0, y:0, minW:2, selector:'widget-card'},
      {x:1, y:0, minW:2, selector:'widget-card', input: { text: 'bar' }},
      {x:3, y:0, content:`<p-card>asdasdasdassssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssd<br>dasd</p-card>`},
    ]
  }

  constructor() {
    GridstackComponent.addComponentToSelectorType([WidgetCardComponent]) ;
  }

  ngAfterViewInit() {
    GridStack.setupDragIn('.sidebar-item', { 
      helper: 'clone',
      appendTo: 'body'
    }); 

    this.isDropAllowed = true;
  
    this.widgetService.widgets$
      .pipe(
        startWith([] as NgGridStackWidget[]),
        pairwise(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(([prev, curr]) => {
        console.log(prev, curr)
        const grid: GridStack | undefined = this.dashboard.grid;
        if (!grid) return;

        const commonItems: NgGridStackWidget[] = curr.filter(c => prev.some(p => p.id === c.id));
        const isEvolution: boolean = commonItems.length === Math.min(prev.length, curr.length);

        // Case A: Substantial change
        if (!isEvolution || Math.abs(curr.length - prev.length) > 1) {
          grid.load(curr);
        }
        // Case B: Single widget added
        else if (curr.length > prev.length) {
          const added: NgGridStackWidget | undefined = curr.find(c => !prev.some(p => p.id === c.id));
          if (added) {
            const el: GridItemHTMLElement = grid.addWidget(added);
            //if (el) grid.resizable(el, true);
          }
        }
        // Case C: Single widget removed
        else if (curr.length < prev.length) {
          const removed: NgGridStackWidget | undefined = prev.find(p => !curr.some(c => c.id === p.id));
          if (removed) {
            const allItems: GridItemHTMLElement[] = grid.getGridItems();
            const el: GridItemHTMLElement | undefined = allItems.find(item => item.gridstackNode?.id === removed.id);
            if (el) {
              grid.removeWidget(el);
            }
          }
        }
      });
  }

  addWidget() {
    const widget: NgGridStackWidget = {
      id:String(++this.id),
      x: 0, y: 3, w: 2, h: 2,
      selector:'widget-card'
    };
    this.widgetService.addWidget(widget)
   // this.dashboard.grid?.resizable(el as any, true); 
  }

  onChange(data: nodesCB) {
    if(this.id === 0) this.addWidget();
    console.log('change ', data.nodes.length > 1 ? data.nodes : data.nodes[0]);
  }
}