import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import Sortable from 'sortablejs';
import { RouterOutlet } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DashboardComponent, CommonModule],
  template: `
    <div class="tree-wrapper">
      <h3>SortableJS Flat-Tree</h3>
      
      <ul #treeContainer class="tree-container">
        <li *ngFor="let item of items" 
            class="tree-branch"
            [attr.data-id]="item.id"
            [attr.data-parent]="item.parent_id"
            [attr.data-level]="item.level"
            [style.--level]="item.level"> <div class="drag-handle">
            <div class="drag-handle">
  ⠿ </div>
          </div>
          
          <span class="branch-title">{{ item.title }} (Level {{ item.level }})</span>
          
          <div class="actions">
       
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .tree-wrapper { padding: 20px; font-family: sans-serif; }
    .tree-container { list-style: none; padding: 0; margin: 0; }
    
    .tree-branch {
      display: flex;
      align-items: center;
      background: white;
      border: 1px solid #e0e0e0;
      padding: 10px;
      margin-bottom: 4px;
      border-radius: 4px;
      
      /* The Magic: Margin is calculated automatically based on the --level variable */
      margin-left: calc(30px * (var(--level) - 1));
      transition: margin-left 0.1s ease-out;
    }
    
    .drag-handle { cursor: grab; margin-right: 15px; color: #999; }
    .drag-handle:active { cursor: grabbing; }
    .branch-title { flex-grow: 1; font-weight: 500; }
    .actions button { cursor: pointer; border: none; background: none; }

    /* SortableJS Visual Classes */
    .sortable-ghost { opacity: 0.4; background: #e3f2fd; border-color: #90caf9; }
    .sortable-drag { opacity: 1 !important; box-shadow: 0 5px 15px rgba(0,0,0,0.15); }
  `]
})
export class AppComponent {

  @ViewChild('treeContainer') treeContainer!: ElementRef;
  title = 'gridstack';

 
// Configuration
  depthPixels = 30;
  maxLevel = 10;
  
  // Your Data
  items = [
    { id: 1, parent_id: 0, title: 'Branch 1', level: 1 },
    { id: 2, parent_id: 1, title: 'Branch 2', level: 2 },
    { id: 3, parent_id: 1, title: 'Branch 3', level: 2 },
    { id: 4, parent_id: 3, title: 'Branch 4', level: 3 },
    { id: 7, parent_id: 0, title: 'Branch 7', level: 1 },
  ];

 private dragListener: any;
  private hiddenDescendants: any[] = [];
  private hiddenDOMNodes: HTMLElement[] = []; // Add this!
  private initialLevel = 1;
  private trueZeroX = 0;
  private clickOffsetX = 0;

  ngAfterViewInit() {
    new Sortable(this.treeContainer.nativeElement, {
      handle: '.drag-handle', 
      animation: 150, 
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      
      // THE MAGIC BULLET: Disables HTML5 Drag and Drop and uses Mouse coordinates.
      // This makes it behave exactly like the old jQuery UI plugin!
      forceFallback: true, 
      fallbackClass: 'sortable-drag', 

      onStart: (e: any) => {
        this.initialLevel = parseInt(e.item.getAttribute('data-level') || '1');
        
        // --- NEW: Calibrate the X-Axis Grid ---
        const rect = e.item.getBoundingClientRect();
        // How far into the row did you click? (Neutralizes handle width)
        this.clickOffsetX = e.originalEvent.clientX - rect.left; 
        // What is the absolute X coordinate of Level 1 on your monitor?
        this.trueZeroX = rect.left - ((this.initialLevel - 1) * this.depthPixels);
        
        this.hiddenDescendants = [];
        this.hiddenDOMNodes = [];

        // 1. Scoop up all descendants AND their physical DOM nodes
        for (let i = e.oldIndex + 1; i < this.items.length; i++) {
          if (this.items[i].level > this.initialLevel) {
            this.hiddenDescendants.push(this.items[i]);
            
            const node = this.treeContainer.nativeElement.children[i];
            this.hiddenDOMNodes.push(node);
            
            // Hide them so SortableJS jumps over them cleanly
            if (node) node.style.display = 'none';
          } else {
            break; 
          }
        }

        this.dragListener = (mouseEvent: MouseEvent) => {
          this.calculateHorizontalDepth(mouseEvent, e.item);
        };
        document.addEventListener('mousemove', this.dragListener);
      },

      onEnd: (e: any) => {
        document.removeEventListener('mousemove', this.dragListener);

        // 1. Physically move the hidden DOM nodes to follow the parent's new location!
        let currentTarget = e.item;
        this.hiddenDOMNodes.forEach(node => {
          currentTarget.insertAdjacentElement('afterend', node);
          currentTarget = node; // advance target so they stay in the correct order
          node.style.display = ''; // Unhide them
        });

        // 2. Calculate the new array insertion index
        let insertIndex = e.newIndex;
        if (e.newIndex > e.oldIndex) {
          // If we dragged DOWN, the newIndex includes the hidden nodes we left behind.
          // We must subtract them to find the true index for the Angular array.
          insertIndex = e.newIndex - this.hiddenDescendants.length;
        }

        // 3. Get the horizontal level shift
        const newLevelStr = e.item.getAttribute('data-new-level');
        const newLevel = newLevelStr ? parseInt(newLevelStr) : this.initialLevel;
        const levelShift = newLevel - this.initialLevel;
        e.item.removeAttribute('data-new-level');

        // 4. Extract the parent and children from the OLD array position
        const parentItem = this.items[e.oldIndex];
        this.items.splice(e.oldIndex, 1 + this.hiddenDescendants.length);

        // 5. Apply the level shifts to the parent and children
        parentItem.level = newLevel;
        this.hiddenDescendants.forEach(desc => desc.level += levelShift);

        // 6. Insert the entire block into the NEW array position
        this.items.splice(insertIndex, 0, parentItem, ...this.hiddenDescendants);

        // 7. Rebuild parent IDs so your data stays intact
        this.rebuildTreeRelationships();
      }
    });
  }


  rebuildTreeRelationships() {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.level === 1) {
        item.parent_id = 0;
        continue;
      }
      
      // Scan upwards to find the nearest parent
      for (let j = i - 1; j >= 0; j--) {
        if (this.items[j].level === item.level - 1) {
          item.parent_id = this.items[j].id;
          break;
        }
      }
    }
  }

  calculateHorizontalDepth(mouseEvent: MouseEvent, ghostElement: HTMLElement) {
    // 1. Where is the left edge of the row physically hovering right now?
    const currentLeft = mouseEvent.clientX - this.clickOffsetX;
    
    // 2. How far is that from our True Zero grid?
    const offset = Math.max(0, currentLeft - this.trueZeroX);

    // 3. Math.round snaps it EXACTLY at the 50% midpoint of your depthPixels
    let newLevel = Math.round(offset / this.depthPixels) + 1;

    // 4. Find the true visible item directly above the drop gap
    let prevItem = ghostElement.previousElementSibling as HTMLElement;
    while (prevItem && (prevItem.style.display === 'none' || prevItem.classList.contains('sortable-drag'))) {
      prevItem = prevItem.previousElementSibling as HTMLElement;
    }

    // 5. Find the true visible item directly below the drop gap
    let nextItem = ghostElement.nextElementSibling as HTMLElement;
    while (nextItem && (nextItem.style.display === 'none' || nextItem.classList.contains('sortable-drag'))) {
      nextItem = nextItem.nextElementSibling as HTMLElement;
    }

    // 6. Calculate boundaries
    const prevLevel = prevItem ? parseInt(prevItem.getAttribute('data-level') || '1') : 0;
    const nextLevel = nextItem ? parseInt(nextItem.getAttribute('data-level') || '1') : 1;

    const upperBound = Math.min(prevLevel + 1, this.maxLevel);
    const lowerBound = Math.max(1, nextLevel); 

    // 7. Clamp the level strictly between the upper and lower bounds
    newLevel = Math.max(lowerBound, Math.min(newLevel, upperBound));

    // 8. Visually update the indent instantly
    ghostElement.style.setProperty('--level', newLevel.toString());
    ghostElement.setAttribute('data-new-level', newLevel.toString());
  }
}
