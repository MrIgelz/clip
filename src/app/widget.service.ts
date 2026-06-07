import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject, catchError, combineLatest, EMPTY, map, Observable, of, Subject, switchMap } from 'rxjs';
import { NgGridStackWidget } from 'gridstack/dist/angular';
import { GridItemHTMLElement } from 'gridstack';
import { Timeline } from "vis-timeline";

// NEW
export interface WidgetServiceMessage {
  receiver: string;
  sender?: string;
  action: string;
}

export interface DashboardCardRequest {
  uuid: string;
  parentUuid: string;
  cardType: string;
  positionX: number;
  positionY: number;
  width: number;
}

export type DashboardCardResponse = DashboardCardRequest;

export interface DashboardResponse {
  dashboard: {
    uuid: string;
    module: string;
    useDefault: boolean;
  } | null;
  cards: DashboardCardResponse[];
}

export interface DashboardCard extends DashboardCardRequest {
  name: string;
  height: number;
  resizeable: boolean;
  enabled: boolean;
  isSystemCard: boolean;
  hideOnEmpty: boolean;
}

export interface DashboardWidget extends NgGridStackWidget {
  el?: GridItemHTMLElement
  isEditable: boolean;
  card: DashboardCard;
}

export type WidgetType = 'custom' | 'editable' | 'default';

export type DashboardAction = 
  { type: 'load'; widgets: DashboardWidget[]; } | 
  { type: 'add'; widget: DashboardWidget; } | 
  { type: 'remove'; widget: DashboardWidget; } | 
  // NEW
  { type: 'noContentRemove'; widget: DashboardWidget } |
  null;

@Injectable()
export class WidgetService {

  private templates = new Map<string, TemplateRef<any>>();
  private templateRegistry = new BehaviorSubject<Map<string, TemplateRef<any>>>(new Map());
  templateRegistry$ = this.templateRegistry.asObservable();

  private isEditable = new BehaviorSubject<boolean>(true);
  isEditable$ = this.isEditable.asObservable();

  private isUsingDefault = new BehaviorSubject<boolean>(true);
  isUsingDefault$ = this.isUsingDefault.asObservable();

  private dashboardAction = new BehaviorSubject<DashboardAction>(null);
  dashboardAction$ = this.dashboardAction.asObservable();

  private loadModul$ = new BehaviorSubject<string | DashboardResponse>("");

  private response: DashboardResponse | null = null;
  private editableCards: DashboardCard[] | null = null;
  testObs = new BehaviorSubject<string | null>("test");

  private getAllCards(): DashboardCard[] {
    return [
      {
        uuid: "",
        parentUuid: "",
        cardType: "calendar3",
        name: "Calendar3",
        positionX: 2,
        positionY: 2,
        width: 5,
        height: 2,
        resizeable: true,
        enabled: false,
        isSystemCard: false,
        hideOnEmpty: false
      },
      {
        uuid: "",
        parentUuid: "",
        cardType: "calendar2",
        name: "Calendar2",
        positionX: 2,
        positionY: 2,
        width: 5,
        height: 2,
        resizeable: true,
        enabled: false,
        isSystemCard: false,
        hideOnEmpty: false
      },
      {
        uuid: "",
        parentUuid: "",
        cardType: "calendar",
        name: "Calendar",
        positionX: 2,
        positionY: 2,
        width: 3,
        height: 2,
        resizeable: true,
        enabled: false,
        isSystemCard: false,
        hideOnEmpty: false
      },
      {
        uuid: "",
        parentUuid: "",
        cardType: "calendarr",
        name: "Duplicate",
        positionX: 2,
        positionY: 2,
        width: 3,
        height: 2,
        resizeable: true,
        enabled: false,
        isSystemCard: false,
        hideOnEmpty: false
      },
      {
        uuid: "",
        parentUuid: "",
        cardType: "qwerty",
        name: "Qwerty",
        positionX: 2,
        positionY: 2,
        width: 3,
        height: 2,
        resizeable: true,
        enabled: false,
        isSystemCard: false,
        hideOnEmpty: true
      },
    ];
  } 

  // NEW
  private message = new Subject<WidgetServiceMessage>();
  message$ = this.message.asObservable();
  sendMessage(message: WidgetServiceMessage): void {
    if (message.receiver === 'widgetService') {
      if (message.action === 'noContentRemove') {
        const card: DashboardCard | undefined = this.getAllCards().find((card: DashboardCard) => card.cardType === message.sender);
        if (card) {
          const widgetDummy: DashboardWidget = {
            id: card.cardType,
            isEditable: false,
            card
          }
          this.removeNoConntentWidget(widgetDummy);
        }
      }
    } else {
      this.message.next(message);
    }
  }

  private createEditableCardsFromResponse(cardResponses: DashboardCardResponse[]): DashboardCard[] {
    const cards: DashboardCard[] = this.getAllCards();
    const editCards: DashboardCard[] = [];

    for (const card of cards) {
      if (card.isSystemCard || !this.hasRights(card)) continue;

      const index: number = cardResponses.findIndex((cr: DashboardCardResponse) => cr.cardType === card.cardType);
      card.enabled = index !== -1;

      if (index !== -1) {
        card.uuid = cardResponses[index].uuid;
        card.parentUuid = cardResponses[index].parentUuid;
        card.positionX = cardResponses[index].positionX;
        card.positionY = cardResponses[index].positionY;
        card.width = cardResponses[index].width;
      }

      editCards.push(card);
    }

    return editCards;
  }

  private createWidgetsFromCards(cards: DashboardCard[], type: WidgetType): DashboardWidget[] {

    const createWidgetFromCard = (card: DashboardCard): DashboardWidget => {
      return {
        id: card.cardType,
        x: card.positionX, 
        y: card.positionY, 
        w: card.width, 
        h: 1,
        noResize: type === 'editable' ? !card.resizeable : true,
        selector:'widget-card',
        input: {
          templateType: type === 'editable' && card.hideOnEmpty ? 'placeholder' : card.cardType
        },
        isEditable: type === 'editable',
        card
      }
    }

    if (type !== 'editable') cards = cards.map(card => ({...card}));

    switch (type) {
      case 'custom':
        cards = cards.filter((card: DashboardCard) => {
          return this.hasRights(card) && !(card.hideOnEmpty && !this.hasContent(card)) && card.enabled; 
        });
        for (const card of cards) {
          card.positionY += 100;
        }
        const systemCards: DashboardCard[] = this.getAllCards().filter((card: DashboardCard) => {
          return this.hasRights(card) && !(card.hideOnEmpty && !this.hasContent(card)) && card.enabled && card.isSystemCard;
        });
        cards.push(...systemCards);
        break;
      case 'editable':
        cards = cards.filter((card: DashboardCard) => card.enabled);
        break;
      case 'default':
        cards = cards.filter((card: DashboardCard) => {
          return this.hasRights(card) && !(card.hideOnEmpty && !this.hasContent(card)) && card.enabled; 
        });
    }

    return cards.map((card: DashboardCard) => createWidgetFromCard(card));
  }

  private hasContent(card: DashboardCard): boolean {
    switch (card.cardType) {
      case 'timeLeave':
        return true;
      default:
        return true;
    }
  }

  private hasRights(card: DashboardCard): boolean {
    switch (card.cardType) {
      case 'timeLeave':
        return true;
      default:
        return true;
    }
  }

  loadModule(module: string): void {
    this.loadModul$.next(module);
  }

  restore(): void {
    if (this.response) {
      this.loadModul$.next(this.response);
    }
  }

  save(): void {
    if (this.response && this.response.dashboard && this.editableCards) {
      const dashboardRequest = this.response.dashboard;
      const cardRequests: DashboardCardRequest[] = [];
      for (const card of this.editableCards) {
        if (card.enabled) {
          const cardRequest: DashboardCardRequest = {
            uuid: "",
            parentUuid: dashboardRequest.uuid,
            cardType: card.cardType,
            positionX: card.positionX,
            positionY: card.positionY,
            width: card.width
          };
          cardRequests.push(cardRequest);
        }
      }
      console.log("Saving Dashboard", { dashboardRequest, cardRequests });
    }
  }

  importDefaultAsCustom(): void {
    if (!this.editableCards || !this.response) return;
    
    const defaultCards: DashboardCard[] = this.getAllCards();
    for (const card of this.editableCards) {
      const defaultCard: DashboardCard | undefined = defaultCards.find((c: DashboardCard) => c.cardType === card.cardType);
      if (defaultCard) {
        card.enabled = defaultCard.enabled;
        card.positionX = defaultCard.positionX;
        card.positionY = defaultCard.positionY;
        card.width = defaultCard.width;
      } else {
        card.enabled = false;
      }
    }

    this.useDefault(false);
  }

  useDefault(useDefault: boolean): void {
    const dashboard = this.response?.dashboard;
    if (dashboard) {
      dashboard.useDefault = useDefault;
      this.isUsingDefault.next(useDefault);
    } else {
      this.isUsingDefault.next(true);
    }

    // @TODO: Remove, it is just for testing
    if (!this.isEditable.value) {
      if (this.editableCards && !this.isUsingDefault.value) {
        const layout: DashboardWidget[] = this.createWidgetsFromCards(this.editableCards, 'custom');
        this.loadLayout(layout);
      } else {
        const layout: DashboardWidget[] = this.createWidgetsFromCards(this.getAllCards(), 'default');
        this.loadLayout(layout);
      }
    }
  }

  setEditableStatus(isEditable: boolean): void {
    if (isEditable && this.editableCards) {
      this.isEditable.next(true);
      const layout: DashboardWidget[] = this.createWidgetsFromCards(this.editableCards, 'editable');
      this.loadLayout(layout);
    } 

    if (!isEditable) {
      this.isEditable.next(false);
      if (this.editableCards && !this.isUsingDefault.value) {
        const layout: DashboardWidget[] = this.createWidgetsFromCards(this.editableCards, 'custom');
        this.loadLayout(layout);
      } else {
        const layout: DashboardWidget[] = this.createWidgetsFromCards(this.getAllCards(), 'default');
        this.loadLayout(layout);
      }
    }
  }
  
  editableCards$: Observable<DashboardCard[] | null> = this.loadModul$.pipe(
    switchMap((module: string | DashboardResponse): Observable<{ module: string, response: DashboardResponse | 'error' }> => {

      const dashboardResponse: DashboardResponse = {
        dashboard: {
          uuid: "",
          module: "desktop",
          useDefault: false
        },
        cards: [
        
        ]
      };

      const fetchDashboard = (): Observable<DashboardResponse | 'error'> => of(dashboardResponse).pipe(
        catchError(() => of<'error'>('error'))
      );

      if (typeof module === 'string') {
        switch (module) {
          case 'desktop':
            return combineLatest([this.testObs, fetchDashboard()]).pipe(
              switchMap(([test, dashboardResponse]) => {
                if (test === null) return EMPTY;

                return of({ module, response: dashboardResponse });
              })
            );
          case 'booking':
            return of({ module, response: 'error' });
          default:
            return EMPTY;
        }
      } else {
        return of({ 
          module: module.dashboard!.module, 
          response: module
        });
      }
    }),
    map(({ module, response }: { module: string; response: DashboardResponse | 'error' }) => {
      if (response === 'error' || !response.dashboard) {

        if (this.isEditable.value) this.isEditable.next(false);
        this.isUsingDefault.next(true);

        const layout: DashboardWidget[] = this.createWidgetsFromCards(this.getAllCards(), 'default');
        this.loadLayout(layout);

        if (response === 'error') {
          this.response = null;
          this.editableCards = null;
          return null;
        } else {
          this.response = {
            dashboard: { uuid: "", module, useDefault: true },
            cards: []
          };
          this.editableCards = this.createEditableCardsFromResponse([]);
          return this.editableCards;
        }
      } else {

        this.response = response;
        this.editableCards = this.createEditableCardsFromResponse(response.cards);
        this.isUsingDefault.next(response.dashboard.useDefault);
        
        if (this.isEditable.value) {
          const layout: DashboardWidget[] = this.createWidgetsFromCards(this.editableCards, 'editable');
          this.loadLayout(layout);
        } else {
          let layout: DashboardWidget[]; 
          if (response.dashboard.useDefault) {
            layout = this.createWidgetsFromCards(this.getAllCards(), 'default');
          } else {
            layout = this.createWidgetsFromCards(this.editableCards, 'custom');
          }
          this.loadLayout(layout);
        }

        return this.editableCards;
      }  
    })
  );

  private loadLayout(widgets: DashboardWidget[]) {
    this.dashboardAction.next({
      type: 'load',
      widgets
    });
  }

  addWidget(widget: DashboardWidget): void {
    this.dashboardAction.next({
      type: 'add',
      widget
    });
  }

  // NEW
  removeNoConntentWidget(widget: DashboardWidget): void {
    if (this.isEditable.value) return;
    this.dashboardAction.next({
      type: 'noContentRemove',
      widget
    });
  }

  removeWidget(widget: DashboardWidget): void {
    this.dashboardAction.next({
      type: 'remove',
      widget
    });
  }

  registerTemplate(name: string, template: TemplateRef<any>) {
    this.templates.set(name, template);
    this.templateRegistry.next(new Map(this.templates));
  }

  unregisterTemplate(name: string) {
    this.templates.delete(name);
    this.templateRegistry.next(new Map(this.templates));
  }
}