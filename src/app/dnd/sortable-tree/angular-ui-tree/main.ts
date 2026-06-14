/**
 * @license Angular UI Tree v2.22.5
 * (c) 2010-2017. https://github.com/angular-ui-tree/angular-ui-tree
 * License: MIT
 */
import { InjectionToken } from '@angular/core';

export interface TreeConfig {
  treeClass: string;
  emptyTreeClass: string;
  dropzoneClass: string;
  hiddenClass: string;
  nodesClass: string;
  nodeClass: string;
  handleClass: string;
  placeholderClass: string;
  dragClass: string;
  dragThreshold: number;
  defaultCollapsed: boolean;
  appendChildOnHover: boolean;
  
}

export const TREE_CONFIG = new InjectionToken<TreeConfig>('TREE_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    treeClass: 'angular-ui-tree',
    emptyTreeClass: 'angular-ui-tree-empty',
    dropzoneClass: 'angular-ui-tree-dropzone',
    hiddenClass: 'angular-ui-tree-hidden',
    nodesClass: 'angular-ui-tree-nodes',
    nodeClass: 'angular-ui-tree-node',
    handleClass: 'angular-ui-tree-handle',
    placeholderClass: 'angular-ui-tree-placeholder',
    dragClass: 'angular-ui-tree-drag',
    dragThreshold: 3,
    defaultCollapsed: false,
    appendChildOnHover: true
  })
});