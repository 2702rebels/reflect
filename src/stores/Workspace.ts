import { arrayMove } from "@dnd-kit/sortable";
import { castDraft } from "immer";
import { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { Logger } from "@2702rebels/logger";

import { createPersistentStorage } from "../lib/storage";
import { VERSION, WorkspaceDocumentSchema } from "../specs";
import { WidgetRegistry } from "../widgets/WidgetRegistry";

import type { ZodError } from "zod";
import type { DashboardRecord, WidgetLayout, WidgetRecord, WorkspaceDocument } from "../specs";
import type { WidgetDescriptor } from "../widgets/types";

export type RuntimeWidget = WidgetRecord & {
  descriptor: WidgetDescriptor;
};

export type DashboardType = "auto" | "teleop" | "custom";

export type RuntimeDashboard = Omit<DashboardRecord, "widgets"> & {
  /** Dashboard type */
  type: DashboardType;
  /** Display name of the dashboard */
  name: string;
  /** Runtime widgets */
  widgets: Record<string, RuntimeWidget>;
};

type WorkspaceStore = {
  /** Hydration state */
  hasHydrated: boolean;
  /** Identifier of the selected dashboard */
  dashboardId: string | null;
  /** Design mode indicator */
  designMode: boolean;
  /** Dashboards */
  dashboards: {
    /** Auto-mode dashboard */
    auto: RuntimeDashboard;
    /** Teleop-mode dashboard */
    teleop: RuntimeDashboard;
    /** Custom dashboards */
    custom: Array<RuntimeDashboard>;
  };
  /** Slots to subscribe */
  slots: Array<string> | null;
};

type WorkspaceStoreActions = {
  /** Imports workspace */
  import: (document: unknown) => ZodError<WorkspaceDocument> | undefined;
  /** Adds custom dashboard */
  addDashboard: () => void;
  /** Removes custom dashboard */
  removeDashboard: (dashboardId: string) => void;
  /** Moves dashboard to the position before target dashboard */
  moveDashboard: (dashboardId: string, targetId: string) => void;
  /** Selects current dashboard */
  selectDashboard: (dashboardId: string) => void;
  /** Selects current dashboard via hotkey index */
  selectDashboardByKey: (index: number) => void;
  /** Gets widget by identifier */
  getWidget: (widgetId: string, dashboardId?: string) => RuntimeWidget | undefined;
  /** Enters design mode */
  enterDesignMode: () => void;
  /** Exits design mode */
  exitDesignMode: () => void;
  /** Toggles design mode selection */
  toggleDesignMode: () => void;
  /** Creates new widget */
  addWidget: (descriptor: WidgetDescriptor, layout: WidgetLayout, dashboardId?: string) => void;
  /** Removes widget */
  removeWidget: (widgetId: string, dashboardId?: string) => void;
  /** Updates widget layout */
  layoutWidget: (widgetId: string, layout: WidgetLayout, dashboardId?: string) => void;
  /** Updates widget custom properties */
  updateWidgetProps: (widgetId: string, props: unknown, dashboardId?: string) => void;
  /** Updates widget lookback period */
  updateWidgetLookback: (widgetId: string, lookback: number, dashboardId?: string) => void;
  /** Updates widget data slot */
  updateWidgetSlot: (widgetId: string, channelId: string | undefined, dashboardId?: string) => void;
  /** Updates dashboard viewport */
  updateViewport: (x: number, y: number, scale: number, dashboardId?: string) => void;
  /** Sets hydration state to `true` */
  markHydrated: () => void;
};

const defaultState: WorkspaceStore = {
  hasHydrated: false,
  dashboardId: null,
  designMode: false,
  dashboards: {
    auto: {
      id: "auto",
      name: "Auto",
      type: "auto",
      widgets: {},
    },
    teleop: {
      id: "teleop",
      name: "Teleop",
      type: "teleop",
      widgets: {},
    },
    custom: [],
  },
  slots: null,
};

const dashboardName = (index: number) => `Dashboard ${index + 1}`;

const getDashboard = (state: WorkspaceStore, id?: string) => {
  const dashboardId = id ?? state.dashboardId;
  if (state.dashboards.auto.id === dashboardId) {
    return state.dashboards.auto;
  }

  if (state.dashboards.teleop.id === dashboardId) {
    return state.dashboards.teleop;
  }

  return state.dashboards.custom.find((_) => _.id === dashboardId);
};

/** Enumerates all slots registered in the workspace. */
const getSlots = (dashboards: WorkspaceStore["dashboards"]) => {
  const set = new Set<string>();
  for (const dashboard of [dashboards.auto, dashboards.teleop, ...dashboards.custom]) {
    for (const widget of Object.values(dashboard.widgets)) {
      if (widget.slot) {
        set.add(widget.slot);
      }
      if (widget.descriptor.extraSlots && widget.props) {
        for (const slot of widget.descriptor.extraSlots(widget.props)) {
          if (slot) {
            set.add(slot);
          }
        }
      }
    }
  }

  return Array.from(set);
};

/** Parses widget properties or returns the default value. */
function parseWidgetProps<P>(unknownValue: unknown, descriptor: WidgetDescriptor<P>): P {
  if (descriptor.props) {
    const result = descriptor.props.schema.safeParse(unknownValue);
    return result.success ? result.data : descriptor.props.defaultValue;
  }

  // P = void when no props are defined by the descriptor
  return {} as P;
}

function persistDashboard(dashboard: RuntimeDashboard): DashboardRecord {
  return {
    id: dashboard.id,
    viewport: dashboard.viewport,
    widgets: Object.values(dashboard.widgets).map((widget) => ({
      id: widget.id,
      type: widget.type,
      layout: widget.layout,
      constraints: widget.constraints,
      slot: widget.slot,
      lookback: widget.lookback,
      props: widget.props,
    })),
  };
}

function parseDashboard(dashboard: DashboardRecord | undefined, type: DashboardType, index?: number): RuntimeDashboard {
  return dashboard
    ? {
        ...dashboard,
        type,
        id: type === "auto" ? "auto" : type === "teleop" ? "teleop" : dashboard.id,
        name: type === "auto" ? "Auto" : type === "teleop" ? "Teleop" : dashboardName(index ?? -1),
        widgets: dashboard.widgets.reduce((acc, widget) => {
          const descriptor = WidgetRegistry[widget.type];
          return descriptor == null
            ? acc
            : {
                ...acc,
                [widget.id]: {
                  ...widget,
                  descriptor,
                  props: parseWidgetProps(widget.props, descriptor),
                },
              };
        }, {}),
      }
    : {
        id: type === "auto" ? "auto" : type === "teleop" ? "teleop" : "",
        name: type === "auto" ? "Auto" : type === "teleop" ? "Teleop" : "Dashboard",
        type,
        widgets: {},
      };
}

/** Converts runtime state to persistent */
function persistState(state: WorkspaceStore): WorkspaceDocument {
  return {
    version: VERSION,
    dashboardId: state.dashboardId ?? undefined,
    dashboards: {
      auto: persistDashboard(state.dashboards.auto),
      teleop: persistDashboard(state.dashboards.teleop),
      custom: state.dashboards.custom.map(persistDashboard),
    },
  };
}

/** Merges persistent into runtime state */
function mergeState(
  persistedState: unknown,
  state: WorkspaceStore & WorkspaceStoreActions
): WorkspaceStore & WorkspaceStoreActions {
  const record = persistedState as WorkspaceDocument;
  const dashboards = {
    auto: parseDashboard(record?.dashboards?.auto, "auto"),
    teleop: parseDashboard(record?.dashboards?.teleop, "teleop"),
    custom: record?.dashboards?.custom?.map((_, index) => parseDashboard(_, "custom", index)) ?? [],
  };

  return {
    ...state,
    dashboardId: record?.dashboardId ?? "teleop",
    dashboards,
    slots: state.designMode ? null : getSlots(dashboards),
  };
}

export const useWorkspaceStore = create(
  persist(
    immer<WorkspaceStore & WorkspaceStoreActions>((set, get) => ({
      ...defaultState,

      import: (document) => {
        const result = WorkspaceDocumentSchema.safeParse(document);
        if (result.success) {
          set((draft) => mergeState(result.data, draft));
          return undefined;
        } else {
          return result.error;
        }
      },
      addDashboard: () =>
        set((draft) => {
          const id = uuidv4();
          draft.dashboards.custom.push({
            id,
            name: dashboardName(draft.dashboards.custom.length),
            type: "custom",
            widgets: {},
          });
          draft.dashboardId = id;
        }),

      moveDashboard: (id, targetId) =>
        set((draft) => {
          const oldIndex = draft.dashboards.custom.findIndex((_) => _.id === id);
          const newIndex = draft.dashboards.custom.findIndex((_) => _.id === targetId);
          draft.dashboards.custom = arrayMove(draft.dashboards.custom, oldIndex, newIndex);

          // adjust name of all dashboards
          for (let i = 0; i < draft.dashboards.custom.length; ++i) {
            draft.dashboards.custom[i]!.name = dashboardName(i);
          }
        }),

      removeDashboard: (id) =>
        set((draft) => {
          const index = draft.dashboards.custom.findIndex((_) => _.id === id);
          if (index >= 0) {
            draft.dashboards.custom.splice(index, 1);

            // adjust name of all dashboards with higher indices
            for (let i = index; i < draft.dashboards.custom.length; ++i) {
              draft.dashboards.custom[i]!.name = dashboardName(i);
            }
          }

          // select teleop by default
          draft.dashboardId = "teleop";
        }),

      selectDashboard: (id) =>
        set((draft) => {
          const dashboard = getDashboard(draft, id);
          if (dashboard) {
            draft.dashboardId = dashboard.id;
          }
        }),

      selectDashboardByKey: (index) => {
        set((draft) => {
          if (index >= 0 && index < draft.dashboards.custom.length) {
            draft.dashboardId = draft.dashboards.custom[index]!.id;
          }
        });
      },

      getWidget: (widgetId, dashboardId) => {
        const state = get();
        return getDashboard(state, dashboardId)?.widgets[widgetId];
      },

      enterDesignMode: () =>
        set((draft) => {
          draft.designMode = true;
        }),

      exitDesignMode: () =>
        set((draft) => {
          draft.designMode = false;
        }),

      toggleDesignMode: () =>
        set((draft) => {
          draft.designMode = !draft.designMode;
          draft.slots = draft.designMode ? null : getSlots(draft.dashboards);
        }),

      addWidget: (descriptor, layout, dashboardId) =>
        set((draft) => {
          const dashboard = getDashboard(draft, dashboardId);
          if (dashboard) {
            const id = uuidv4();
            dashboard.widgets[id] = {
              id,
              type: descriptor.type,
              layout,
              constraints: descriptor.constraints ? structuredClone(descriptor.constraints) : undefined,
              lookback: descriptor.slot?.lookback,
              props: descriptor.props?.defaultValue,
              descriptor: castDraft(descriptor),
              slot: descriptor.slot?.defaultChannel,
            };
          }
        }),

      removeWidget: (widgetId, dashboardId) =>
        set((draft) => {
          const dashboard = getDashboard(draft, dashboardId);
          if (dashboard) {
            delete dashboard.widgets[widgetId];
          }
        }),

      layoutWidget: (widgetId, layout, dashboardId) =>
        set((draft) => {
          const widget = getDashboard(draft, dashboardId)?.widgets[widgetId];
          if (widget) {
            widget.layout = layout;
          }
        }),

      updateWidgetProps: (widgetId, props, dashboardId) =>
        set((draft) => {
          const widget = getDashboard(draft, dashboardId)?.widgets[widgetId];
          if (widget) {
            widget.props = props;
            if (!draft.designMode) {
              draft.slots = getSlots(draft.dashboards);
            }
          }
        }),

      updateWidgetLookback: (widgetId, lookback, dashboardId) =>
        set((draft) => {
          const widget = getDashboard(draft, dashboardId)?.widgets[widgetId];
          if (widget) {
            widget.lookback = lookback;
          }
        }),

      updateWidgetSlot: (widgetId, channelId, dashboardId) =>
        set((draft) => {
          const widget = getDashboard(draft, dashboardId)?.widgets[widgetId];
          if (widget) {
            widget.slot = channelId;
          }
        }),

      updateViewport: (x, y, scale, dashboardId) =>
        set((draft) => {
          const dashboard = getDashboard(draft, dashboardId);
          if (dashboard) {
            dashboard.viewport ??= { x: 0, y: 0, scale: 1 };
            dashboard.viewport.x = x;
            dashboard.viewport.y = y;
            dashboard.viewport.scale = scale;
          }
        }),

      markHydrated: () =>
        set({
          hasHydrated: true,
        }),
    })),
    {
      name: "workspace",
      storage: createPersistentStorage(".workspace.json"),
      partialize: persistState,
      merge: mergeState,
      onRehydrateStorage: (state) => (_, error) => {
        if (error) {
          Logger.Default.error(`Failed to rehydrate workspace from the persistent storage [${error}]`);
        } else {
          state.markHydrated();
        }
      },
      // must be bumped on non-backward-compatible schema changes and
      // appropriate migration strategy implemented via `migrate` option
      // https://zustand.docs.pmnd.rs/integrations/persisting-store-data#migrate
      version: VERSION,
    }
  )
);

const selectActions = (state: WorkspaceStoreActions) => ({
  import: state.import,
  addDashboard: state.addDashboard,
  removeDashboard: state.removeDashboard,
  moveDashboard: state.moveDashboard,
  selectDashboard: state.selectDashboard,
  selectDashboardByKey: state.selectDashboardByKey,
  getWidget: state.getWidget,
  enterDesignMode: state.enterDesignMode,
  exitDesignMode: state.exitDesignMode,
  toggleDesignMode: state.toggleDesignMode,
  addWidget: state.addWidget,
  removeWidget: state.removeWidget,
  layoutWidget: state.layoutWidget,
  updateWidgetLookback: state.updateWidgetLookback,
  updateWidgetProps: state.updateWidgetProps,
  updateWidgetSlot: state.updateWidgetSlot,
  updateViewport: state.updateViewport,
});

/**
 * Workspace API (actions).
 */
export const workspaceActions = selectActions(useWorkspaceStore.getState());

/**
 * Hook that returns currently loaded dashboards.
 */
export function useDashboards() {
  return useWorkspaceStore((state) => state.dashboards);
}

/**
 * Hook that returns the specified or current dashboard instance.
 */
export function useDashboard(dashboardId?: string) {
  return useWorkspaceStore((state) => getDashboard(state, dashboardId));
}

/**
 * Hook that returns the specified widget instance from the dashboard.
 */
export function useWidget(widgetId: string, dashboardId?: string) {
  return useWorkspaceStore((state) => getDashboard(state, dashboardId)?.widgets[widgetId]);
}

const {
  addWidget,
  removeWidget,
  layoutWidget,
  updateWidgetProps,
  updateWidgetLookback,
  updateWidgetSlot,
  updateViewport,
} = workspaceActions;

/**
 * Hook that returns actions scoped to the specified dashboard.
 */
export function useDashboardActions(dashboardId: string) {
  return useMemo(
    () => ({
      addWidget: (descriptor: WidgetDescriptor, layout: WidgetLayout) => addWidget(descriptor, layout, dashboardId),
      removeWidget: (id: string) => removeWidget(id, dashboardId),
      layoutWidget: (id: string, layout: WidgetLayout) => layoutWidget(id, layout, dashboardId),
      updateWidgetProps: (id: string, props: unknown) => updateWidgetProps(id, props, dashboardId),
      updateWidgetLookback: (id: string, lookback: number) => updateWidgetLookback(id, lookback, dashboardId),
      updateWidgetSlot: (id: string, channel: string | undefined) => updateWidgetSlot(id, channel, dashboardId),
      updateViewport: (x: number, y: number, scale: number) => updateViewport(x, y, scale, dashboardId),
    }),
    [dashboardId]
  );
}

/**
 * Hook that returns design mode state.
 */
export function useDesignModeState() {
  return useWorkspaceStore((state) => state.designMode);
}

/**
 * Returns the workspace as the document.
 */
export function getWorkspaceDocument() {
  return persistState(useWorkspaceStore.getState());
}
