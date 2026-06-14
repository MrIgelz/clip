import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { TREE_CONFIG } from '../main';


export interface NodeMetaData {
  [key: string]: any;
}

export interface DragInfo {
  source: any;
  sourceInfo: {
    cloneModel: any | undefined;
    nodeScope: any;
    index: number;
    nodesScope: any;
  };
  index: number;
  siblings: HTMLElement[];
  parent: any;
  resetParent: () => void;
}

export interface PositionState {
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  nowX: number;
  nowY: number;
  distX: number;
  distY: number;
  dirAx: number;
  dirX: number;
  dirY: number;
  lastDirX: number;
  lastDirY: number;
  distAxX: number;
  distAxY: number;
}

@Injectable({
  providedIn: 'root' // Macht den Service global (Singleton) wie die AngularJS-Factory
})
export class UiTreeHelperService {
  private treeConfig = inject(TREE_CONFIG);

  private nodesData = new Map<string, NodeMetaData>();

  setNodeAttribute(nodeId: string | undefined, attrName: string, val: any): void {
    if (!nodeId) {
      return;
    }

    if (!this.nodesData.has(nodeId)) {
      this.nodesData.set(nodeId, {});
    }

    const data = this.nodesData.get(nodeId);
    if (data) {
      data[attrName] = val;
    }
  }

  getNodeAttribute(nodeId: string | undefined, attrName: string): any {
    if (!nodeId) return null;
    return this.nodesData.get(nodeId)?.[attrName] ?? null;
  }

  noDrag(targetElm: HTMLElement): boolean {
    const attr = targetElm.getAttribute('data-nodrag');
    if (attr !== null) {
      return attr !== 'false';
    }
    return false;
  }

  eventObj(e: MouseEvent | TouchEvent | any): MouseEvent | Touch {
    if (e.targetTouches && e.targetTouches.length > 0) {
      return e.targetTouches[0];
    }

    if (e.originalEvent?.targetTouches && e.originalEvent.targetTouches.length > 0) {
      return e.originalEvent.targetTouches[0];
    }
    return e;
  }

  dragInfo(node: any) {
  const cloneModel = node.$treeScope?.cloneEnabled === true 
    ? structuredClone(node.$modelValue) 
    : undefined;

  const parentNodes = typeof node.$parentNodesScope?.childNodes === 'function'
    ? node.$parentNodesScope.childNodes()
    : [];

  const siblingsList = [...parentNodes]; 

  return {
    source: node,
    sourceInfo: {
      cloneModel: cloneModel,
      nodeScope: node,
      index: node.index(),
      nodesScope: node.$parentNodesScope
    },
    index: node.index(),
    siblings: siblingsList,
    parent: node.$parentNodesScope,

    resetParent() {
      this.parent = node.$parentNodesScope;
    },

    moveTo(parent: any, siblings: any[], index: number) {
      this.parent = parent;
      this.siblings = [...siblings];

      const i = this.siblings.indexOf(this.source);
      if (i > -1) {
        this.siblings.splice(i, 1);
        if (this.source.index() < index) {
          index--;
        }
      }

      this.siblings.splice(index, 0, this.source);
      this.index = index;
    },

    parentNode() {
      return this.parent?.$nodeScope;
    },

    prev() {
      return this.index > 0 ? this.siblings[this.index - 1] : null;
    },

    next() {
      return this.index < this.siblings.length - 1 ? this.siblings[this.index + 1] : null;
    },

    isClone() {
      return this.source.$treeScope?.cloneEnabled === true;
    },

    clonedNode(nodeToClone: any) {
      return structuredClone(nodeToClone);
    },

    isDirty() {
      return this.source.$parentNodesScope != this.parent ||
                  this.source.index() != this.index;
    },

    isForeign() {
      return this.source.$treeScope !== this.parent?.$treeScope;
    },

    eventArgs(elements: any, pos: any) {
      return {
        source: this.sourceInfo,
        dest: {
          index: this.index,
          nodesScope: this.parent
        },
        elements: elements,
        pos: pos
      };
    },

    apply() {
      const nodeData = this.source.$modelValue;

      if (this.parent?.nodropEnabled || this.parent?.$treeScope?.nodropEnabled) {
        return;
      }

      if (!this.isDirty()) {
        return;
      }

      if (this.isClone() && this.isForeign()) {
        this.parent.insertNode(this.index, this.sourceInfo.cloneModel);
      } else {
        if (typeof this.source.remove === 'function') {
          this.source.remove();
        }
        this.parent.insertNode(this.index, nodeData);
      }
    }
  };
  }

  height(element: HTMLElement): number {
    return element.scrollHeight;
  }

  /**
   * Holt die scrollWidth des Elements.
   */
  width(element: HTMLElement): number {
    return element.scrollWidth;
  }

  /**
   * Berechnet die exakten Offset-Werte des Elements relativ zum Dokument.
   */
  offset(element: HTMLElement) {
    const boundingClientRect = element.getBoundingClientRect();

    // Nutzt die modernen, nativen Eigenschaften für das Page-Scrolling
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft;

    return {
      width: element.offsetHeight,
      height: element.offsetWidth,
      top: boundingClientRect.top + scrollTop,
      left: boundingClientRect.left + scrollLeft
    };
  }

  /**
   * Berechnet die Start-Position des Elements basierend auf Maus- oder Touch-Events.
   */
  positionStarted(e: MouseEvent | TouchEvent | any, target: HTMLElement): PositionState {
    let pageX = e.pageX;
    let pageY = e.pageY;

    // Touch-Event Prüfung (Natives JS TouchEvent oder jQuery-Weichzeichner)
    const touches = e.touches || e.originalEvent?.touches;
    if (touches && touches.length > 0) {
      pageX = touches[0].pageX;
      pageY = touches[0].pageY;
    }

    const targetOffset = this.offset(target);

    return {
      offsetX: pageX - targetOffset.left,
      offsetY: pageY - targetOffset.top,
      startX: pageX,
      startY: pageY,
      lastX: pageX,
      lastY: pageY,
      nowX: 0,
      nowY: 0,
      distX: 0,
      distY: 0,
      dirAx: 0,
      dirX: 0,
      dirY: 0,
      lastDirX: 0,
      lastDirY: 0,
      distAxX: 0,
      distAxY: 0
    };
  }

  positionMoved(e: MouseEvent | TouchEvent | any, pos: any, firstMoving: boolean): void {
    let pageX = e.pageX;
    let pageY = e.pageY;

    // Touch-Event Prüfung
    const touches = e.touches || e.originalEvent?.touches;
    if (touches && touches.length > 0) {
      pageX = touches[0].pageX;
      pageY = touches[0].pageY;
    }

    // Maus-Position des vorherigen Events zwischenspeichern
    pos.lastX = pos.nowX;
    pos.lastY = pos.nowY;

    // Aktuelle Maus-Position setzen
    pos.nowX = pageX;
    pos.nowY = pageY;

    // Zurückgelegte Distanz berechnen
    pos.distX = pos.nowX - pos.lastX;
    pos.distY = pos.nowY - pos.lastY;

    // Vorherige Richtung sichern
    pos.lastDirX = pos.dirX;
    pos.lastDirY = pos.dirY;

    // Neue Richtung bestimmen (-1 = Links/Oben, 0 = Stillstand, 1 = Rechts/Unten)
    pos.dirX = pos.distX === 0 ? 0 : pos.distX > 0 ? 1 : -1;
    pos.dirY = pos.distY === 0 ? 0 : pos.distY > 0 ? 1 : -1;

    // Aktuelle Bewegungsachse ermitteln (1 = Horizontal, 0 = Vertikal)
    const newAx = Math.abs(pos.distX) > Math.abs(pos.distY) ? 1 : 0;

    // Beim allerersten Bewegungsschritt abbrechen
    if (firstMoving) {
      pos.dirAx = newAx;
      pos.moving = true;
      return;
    }

    // Distanz auf der aktuellen Achse berechnen
    if (pos.dirAx !== newAx) {
      pos.distAxX = 0;
      pos.distAxY = 0;
    } else {
      pos.distAxX += Math.abs(pos.distX);
      if (pos.dirX !== 0 && pos.dirX !== pos.lastDirX) {
        pos.distAxX = 0;
      }
      pos.distAxY += Math.abs(pos.distY);
      if (pos.dirY !== 0 && pos.dirY !== pos.lastDirY) {
        pos.distAxY = 0;
      }
    }
    pos.dirAx = newAx;
  }

  /**
   * Prüft via nativem HTML, ob das Element ein Tree-Node ist.
   */
  elementIsTreeNode(element: HTMLElement): boolean {
    return element.hasAttribute('ui-tree-node');
  }

  /**
   * Prüft, ob das Element ein Handle (Anfass-Punkt) ist.
   */
  elementIsTreeNodeHandle(element: HTMLElement): boolean {
    return element.hasAttribute('ui-tree-handle');
  }

  /**
   * Prüft, ob das Element die Haupt-Tree-Komponente ist.
   */
  elementIsTree(element: HTMLElement): boolean {
    return element.hasAttribute('ui-tree');
  }

  /**
   * Prüft, ob das Element ein Container für mehrere Nodes ist.
   */
  elementIsTreeNodes(element: HTMLElement): boolean {
    return element.hasAttribute('ui-tree-nodes');
  }

  /**
   * Prüft mittels classList, ob das Element ein Platzhalter ist.
   */
  elementIsPlaceholder(element: HTMLElement): boolean {
    return element.classList.contains(this.treeConfig.placeholderClass);
  }

  /**
   * Prüft, ob das Element eine Dropzone ist.
   */
  elementIsDropzone(element: HTMLElement): boolean {
    return element.classList.contains(this.treeConfig.dropzoneClass);
  }

  /**
   * Prüft mittels nativem querySelectorAll, ob das Element ein Handle enthält.
   */
  elementContainsTreeNodeHandler(element: HTMLElement): boolean {
    return element.querySelectorAll('[ui-tree-handle]').length >= 1;
  }

  /**
   * Sucht das erste übergeordnete Element (Parent), das das Attribut 'ui-tree-handle' besitzt.
   * Nutzt dafür das extrem schnelle, native HTML5 '.closest()'.
   */
  treeNodeHandlerContainerOfElement(element: HTMLElement): HTMLElement | null {
    return element.closest('[ui-tree-handle]');
  }
}

export function findFirstParentElementWithAttribute(attributeName: string, childObj: HTMLElement | undefined | null): HTMLElement | null {
  // Verhindert Fehler, wenn das Element undefined ist (z.B. wenn die Maus das Fenster verlässt)
  if (!childObj || typeof childObj.closest !== 'function') {
    return null;
  }

  // Da wir das ERSTE ÜBERGEORDNETE Element suchen (childObj.parentNode), 
  // starten wir die .closest()-Suche direkt beim Elternelement.
  const parentElement = childObj.parentNode as HTMLElement;

  if (!parentElement || typeof parentElement.closest !== 'function') {
    return null;
  }

  // Nutzt CSS-Attribut-Selektor-Syntax: 'ui-tree-handle' wird zu '[ui-tree-handle]'
  return parentElement.closest(`[${attributeName}]`);
}