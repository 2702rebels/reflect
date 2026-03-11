import { KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useMemo } from "react";
import { create } from "zustand";

import { Slot } from "../widgets/slot";
import { canAccept } from "../widgets/utils";
import { expandRectBy, overlap } from "./Layout";

import type {
  ClientRect,
  DragEndEvent,
  DragMoveEvent,
  KeyboardSensorOptions,
  Modifier,
  PointerSensorOptions,
} from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";
import type { RuntimeDashboard, RuntimeWidget, useDashboardActions } from "../stores/Workspace";
import type { TopicEntryProps } from "./TopicEntry";

const zeroRect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 } as const;

const keyboardSensorOptions: KeyboardSensorOptions = {};
const pointerSensorOptions: PointerSensorOptions = {
  activationConstraint: {
    /**
     * Activate dragging only after a delay (in ms) to allow click interactions.
     * See https://docs.dndkit.com/api-documentation/sensors/pointer#delay
     */
    delay: 50,
    /**
     * Motion tolerance in pixels to abort the drag operation during the delay.
     */
    tolerance: 200,
  },
};

type DashboardDndData =
  | {
      type: "widget";
      widget: RuntimeWidget;
    }
  | {
      type: "template";
      widget: RuntimeWidget;
    }
  | {
      type: "topic";
      props: TopicEntryProps;
    };

/**
 * Type guard for active dragged component data.
 */
export function isDashboardDndData(value: unknown): value is DashboardDndData {
  return value != null && typeof value === "object" && "type" in value;
}

type DraggableWidgetStore = {
  overlapping: boolean;
};

const useDraggableWidgetStore = create<DraggableWidgetStore>(() => ({
  overlapping: false,
}));

/**
 * Sets the flag indicating that widget is overlapping with other widgets
 * during drag-and-drop or resize operation.
 */
export const setWidgetOverlapping = (v: boolean) => useDraggableWidgetStore.setState({ overlapping: v });

/**
 * Determines whether widget overlapping flag is set.
 * This method does not subscribe to live updates and returns current value.
 */
export const isWidgetOverlapping = () => useDraggableWidgetStore.getState().overlapping;

/**
 * Determines whether widget overlapping flag is set, subscribing to live updates.
 */
export const useWidgetOverlapping = () => useDraggableWidgetStore((state) => state.overlapping);

/**
 * Translates the numeric value to the grain units.
 */
export function toGrain(v: number, grain: number) {
  return Math.round(v / grain);
}

function restrictToBoundingRect(transform: Transform, rect: ClientRect, boundingRect: ClientRect): Transform {
  const value = {
    ...transform,
  };

  if (rect.top + transform.y <= boundingRect.top) {
    value.y = boundingRect.top - rect.top;
  } else if (rect.bottom + transform.y >= boundingRect.top + boundingRect.height) {
    value.y = boundingRect.top + boundingRect.height - rect.bottom;
  }

  if (rect.left + transform.x <= boundingRect.left) {
    value.x = boundingRect.left - rect.left;
  } else if (rect.right + transform.x >= boundingRect.left + boundingRect.width) {
    value.x = boundingRect.left + boundingRect.width - rect.right;
  }

  return value;
}

function scaleRect(rect: ClientRect, scale: number): ClientRect {
  if (scale === 1) {
    return rect;
  }

  const w = rect.width / scale;
  const h = rect.height / scale;
  const x = (rect.left + rect.right) / 2;
  const y = (rect.top + rect.bottom) / 2;

  return {
    left: x - w / 2,
    right: x + w / 2,
    top: y - h / 2,
    bottom: y + h / 2,
    width: w,
    height: h,
  };
}

const restrictToViewport =
  (viewportBox: () => ClientRect | undefined, grain: number, scale: number, vx: number, vy: number): Modifier =>
  ({ draggingNodeRect, transform, active }) => {
    if (!draggingNodeRect) {
      return transform;
    }

    if (!isDashboardDndData(active?.data.current)) {
      return transform;
    }

    const { type } = active.data.current;

    // do not restrict topics
    if (type === "topic") {
      return transform;
    }

    const viewportRect = viewportBox() ?? zeroRect;
    const t = restrictToBoundingRect(
      transform,
      // rescale bbox to undo the "magic" scaling introduced in DraggableOverlayRealWidget,
      // no need to do the same for the template since it occupies its natural dimensions
      type === "template" ? draggingNodeRect : scaleRect(draggingNodeRect, 1 / scale),
      viewportRect
    );

    // snap to the grid based on the grain size
    const snapSize = grain * scale;

    let dx = 0;
    let dy = 0;

    // determine xy offset for templates due to the initial position not aligned with
    // the viewport grid
    if (type === "template" && active?.rect.current.initial) {
      dx = snapSize - ((active.rect.current.initial.left - viewportRect.left - vx) % snapSize);
      dy = snapSize - ((active.rect.current.initial.top - viewportRect.top - vy) % snapSize);

      // snap to the nearest point
      if (dx > snapSize / 2) {
        dx -= snapSize;
      }

      if (dy > snapSize / 2) {
        dy -= snapSize;
      }
    }

    return {
      ...t,
      x: Math.round(t.x / snapSize) * snapSize + dx,
      y: Math.round(t.y / snapSize) * snapSize + dy,
    };
  };

/**
 * Hook that returns properties to pass to <DndContext/> responsible for
 * tracking widgets and topics.
 *
 * @param dashboard dashboard descriptor
 * @param actions dashboard scoped actions
 * @param options additional options
 * @param viewportBox function that returns viewport bounding box
 */
export function useDashboardDnd(
  dashboard: RuntimeDashboard,
  actions: ReturnType<typeof useDashboardActions>,
  options: {
    grain: number;
    gap: boolean;
  },
  viewportBox: () => ClientRect | undefined
) {
  const { viewport, widgets } = dashboard;
  const scale = viewport?.scale ?? 1;
  const vx = viewport?.x ?? 0;
  const vy = viewport?.y ?? 0;

  const { grain, gap } = options;
  const { addWidget, layoutWidget, updateWidgetSlot } = actions;

  // returns widget XY position in the dashboard frame of reference
  const getWidgetXY = useCallback(
    (widget: RuntimeWidget, isTemplate: boolean, e: DragMoveEvent) => {
      if (isTemplate) {
        if (e.active.rect.current?.initial) {
          const rect = viewportBox();
          const dx = e.active.rect.current.initial.left - (rect?.left ?? 0) - vx;
          const dy = e.active.rect.current.initial.top - (rect?.top ?? 0) - vy;
          return {
            x: toGrain(Math.round((dx + e.delta.x) / scale), grain),
            y: toGrain(Math.round((dy + e.delta.y) / scale), grain),
          };
        } else {
          return {
            x: 0,
            y: 0,
          };
        }
      } else {
        return {
          x: widget.layout.left + toGrain(Math.round(e.delta.x / scale), grain),
          y: widget.layout.top + toGrain(Math.round(e.delta.y / scale), grain),
        };
      }
    },
    [viewportBox, grain, scale, vx, vy]
  );

  // drag-and-drop behavior
  const handleDragMove = useCallback(
    (e: DragMoveEvent) => {
      // determine if the widget being dragged intersects with other widgets
      // takes gap distance into account if gap constraint is configured
      const dragData = e.active.data.current;
      if (isDashboardDndData(dragData) && (dragData.type === "widget" || dragData.type === "template")) {
        const { widget, type } = dragData;
        const { x, y } = getWidgetXY(widget, type === "template", e);
        const bbox = {
          left: x,
          top: y,
          right: x + widget.layout.width,
          bottom: y + widget.layout.height,
        };

        if (gap) {
          expandRectBy(bbox, 1);
        }

        setWidgetOverlapping(Object.values(widgets).some((_) => _.id !== widget.id && overlap(bbox, _)));
      }
    },
    [widgets, gap, getWidgetXY]
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const dragData = e.active.data.current;
      if (isDashboardDndData(dragData)) {
        if (dragData.type === "topic") {
          const overData = e.over?.data.current;
          if (
            isDashboardDndData(overData) &&
            overData.type === "widget" &&
            overData.widget.descriptor.slot?.ignored != true &&
            dragData.props.channel &&
            canAccept(overData.widget.descriptor.slot, dragData.props.channel)
          ) {
            updateWidgetSlot(overData.widget.id, Slot.fromChannel(dragData.props.channel));
          }
        } else if (!isWidgetOverlapping()) {
          const { widget, type } = dragData;
          const isTemplate = type === "template";
          const { x, y } = getWidgetXY(widget, isTemplate, e);
          if (isTemplate) {
            addWidget(widget.descriptor, {
              left: x,
              top: y,
              width: widget.layout.width,
              height: widget.layout.height,
            });
          } else {
            layoutWidget(widget.id, {
              left: x,
              top: y,
              width: widget.layout.width,
              height: widget.layout.height,
            });
          }
        }
      }

      setWidgetOverlapping(false);
    },
    [addWidget, layoutWidget, updateWidgetSlot, getWidgetXY]
  );

  const handleDragCancel = useCallback(() => {
    setWidgetOverlapping(false);
  }, []);

  // activation sensors
  const keyboardSensor = useSensor(KeyboardSensor, keyboardSensorOptions);
  const pointerSensor = useSensor(PointerSensor, pointerSensorOptions);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  // modifiers
  const modifiers = useMemo(
    () => [restrictToViewport(viewportBox, grain, scale, vx, vy)],
    [viewportBox, grain, scale, vx, vy]
  );

  return {
    sensors,
    modifiers,
    onDragEnd: handleDragEnd,
    onDragMove: handleDragMove,
    onDragCancel: handleDragCancel,
  };
}
