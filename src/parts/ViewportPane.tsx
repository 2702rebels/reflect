import { composeRefs } from "@radix-ui/react-compose-refs";
import { clamp, infiniteExtent, isMacOs, PanOnScrollMode, XYPanZoom } from "@xyflow/system";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import { binarySearch } from "@2702rebels/shared/binarySearch";

import { useKeyPress } from "../hooks/useKeyPress";

import type { CoordinateExtent, KeyCode, PanZoomInstance, Transform, Viewport } from "@xyflow/system";

const defaultViewport = { x: 0, y: 0, zoom: 1 } as const;
const nop = () => {};

function createScales(min: number, max: number, step = 0.25): ReadonlyArray<number> {
  if (min > 1 || max < 1) {
    throw new Error("Ensure that zoom scale range includes 1");
  }

  const scales: Array<number> = [];
  scales.push(1);
  for (let s = 1 + step; s < max; s += step) {
    scales.push(s);
  }
  scales.push(max);
  for (let s = 1 - step; s > min; s -= step) {
    scales.unshift(s);
  }
  scales.unshift(min);
  return scales;
}

function nextScale(current: number, scales: ReadonlyArray<number>, direction: -1 | 1) {
  const index = binarySearch(scales, current, (a, b) => a - b);
  return scales[clamp(index >= 0 ? index + direction : direction > 0 ? ~index : ~index - 1, 0, scales.length - 1)] ?? 1;
}

export type ViewportPaneRef = {
  zoomIn: () => void;
  zoomOut: () => void;
};

export type ViewportPaneProps = React.PropsWithChildren<{
  /**
   * Viewport behavior when on scroll.
   *
   * - `zoom` zoom in and out
   * - `pan` pan in any direction
   * - `pan-horizontal` pan horizontally
   * - `pan-vertical` pan vertically
   * @default "zoom"
   */
  scrollBehavior?: "zoom" | "pan" | "pan-horizontal" | "pan-vertical";

  /**
   * Relative speed of panning when {@link scrollBehavior} is set to pan.
   * @default 0.5
   */
  panOnScrollSpeed?: number;

  /**
   * Determines whether viewport can be panned by clicking and dragging.
   *
   * You can also set this prop to an array of numbers to limit which mouse
   * buttons can activate panning.
   *
   * @default true
   * @example [0, 2] // allows panning with the left and right mouse buttons
   * [0, 1, 2, 3, 4] // allows panning with all mouse buttons
   */
  panOnDrag?: boolean | Array<number>;

  /**
   * Determines whether viewport should zoom by pinching on a touch screen.
   * @default true
   */
  zoomOnPinch?: boolean;

  /**
   * Determines whether viewport should zoom by double clicking.
   * @default false
   */
  zoomOnDoubleClick?: boolean;

  /**
   * Minimum zoom level.
   * @default 0.5
   */
  minZoom?: number;

  /**
   * Maximum zoom level.
   * @default 2
   */
  maxZoom?: number;

  /**
   * Sets the key code that allows zooming the viewport while that key is
   * held down when {@link scrollBehavior} is set to `pan`.
   *
   * @default "Meta" for Mac OS, "Ctrl" otherwise
   */
  zoomActivationKeyCode?: KeyCode | null;

  /**
   * Viewport X translation.
   */
  viewportX?: number;

  /**
   * Viewport Y translation.
   */
  viewportY?: number;

  /**
   * Viewport scale.
   */
  viewportScale?: number;

  /**
   * Boundary of the viewport extents. Default viewport extends infinitely.
   *
   * The first pair of coordinates is the top left boundary and the second pair
   * is the bottom right.
   *
   * @example [[-10000, -10000], [10000, 10000]]
   */
  viewportExtent?: CoordinateExtent;

  /**
   * Invoked when viewport changes.
   */
  onViewportChange?: (viewport: Viewport) => void;

  /**
   * Invoked when the user right clicks inside the pane.
   */
  onPaneContextMenu?: (event: React.MouseEvent | MouseEvent) => void;

  /**
   * Handle for imperative control.
   */
  handle?: React.Ref<ViewportPaneRef> | null;

  /**
   * Component reference.
   */
  ref?: React.Ref<HTMLDivElement | null>;
}>;

export const ViewportPane = ({
  ref,
  children,
  scrollBehavior = "zoom",
  panOnScrollSpeed = 0.5,
  panOnDrag = true,
  zoomOnPinch = true,
  zoomOnDoubleClick = false,
  minZoom = 0.5,
  maxZoom = 2,
  zoomActivationKeyCode = isMacOs() ? "Meta" : "Control",
  viewportX,
  viewportY,
  viewportScale,
  viewportExtent = infiniteExtent,
  onViewportChange,
  onPaneContextMenu,
  handle,
}: ViewportPaneProps) => {
  const container = useRef<HTMLDivElement>(null);
  const zoomActivationKeyPressed = useKeyPress(zoomActivationKeyCode);
  const pz = useRef<PanZoomInstance>(null);

  const onTransformChange = useCallback(
    (transform: Transform) => onViewportChange?.({ x: transform[0], y: transform[1], zoom: transform[2] }),
    [onViewportChange]
  );

  useEffect(() => {
    if (container.current) {
      pz.current = XYPanZoom({
        domNode: container.current,
        minZoom,
        maxZoom,
        translateExtent: viewportExtent,
        viewport: {
          x: viewportX ?? defaultViewport.x,
          y: viewportY ?? defaultViewport.y,
          zoom: viewportScale ?? defaultViewport.zoom,
        },
        onDraggingChange: nop,
        onPanZoomStart: nop,
        onPanZoom: (event, vp) => onViewportChange?.(vp),
        onPanZoomEnd: nop,
      });
    }

    return () => {
      pz.current?.destroy();
    };
    // set defaultViewport to initial viewport values if provided,
    // but do not re-run this effect when viewport values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minZoom, maxZoom, viewportExtent, onViewportChange]);

  const zoomOnScroll = scrollBehavior === "zoom";
  const panOnScroll = scrollBehavior && scrollBehavior !== "zoom";
  const panOnScrollMode =
    scrollBehavior === "pan-horizontal"
      ? PanOnScrollMode.Horizontal
      : scrollBehavior === "pan-vertical"
        ? PanOnScrollMode.Vertical
        : PanOnScrollMode.Free;

  useEffect(() => {
    pz.current?.update({
      zoomOnScroll,
      zoomOnPinch,
      zoomOnDoubleClick,
      zoomActivationKeyPressed,
      panOnScroll,
      panOnScrollSpeed,
      panOnScrollMode,
      panOnDrag,
      preventScrolling: true,
      userSelectionActive: false,
      lib: "__", // used by xyflow to find its DOM nodes via className, we don't need it
      noPanClassName: "nopan",
      noWheelClassName: "nowheel",
      connectionInProgress: false,
      paneClickDistance: 1,
      onPaneContextMenu,
      onTransformChange,
    });
  }, [
    zoomOnScroll,
    zoomOnPinch,
    zoomOnDoubleClick,
    zoomActivationKeyPressed,
    panOnScroll,
    panOnScrollSpeed,
    panOnScrollMode,
    panOnDrag,
    onPaneContextMenu,
    onTransformChange,
  ]);

  const scales = useMemo(() => createScales(minZoom, maxZoom), [minZoom, maxZoom]);

  // expose zoom externally (imperatively)
  useImperativeHandle(handle, () => ({
    zoomIn: () => pz.current?.scaleTo(nextScale(viewportScale ?? 1, scales, 1)),
    zoomOut: () => pz.current?.scaleTo(nextScale(viewportScale ?? 1, scales, -1)),
  }));

  const transform = `translate(${viewportX ?? 0}px,${viewportY ?? 0}px) scale(${viewportScale ?? 1})`;
  return (
    <div
      ref={composeRefs(ref, container)}
      data-scroll="pan"
      className="absolute inset-0 z-10 h-full w-full overflow-hidden data-[scroll=pan]:cursor-grab">
      <div
        className="pointer-events-none absolute inset-0 h-full w-full origin-top-left"
        style={{ transform }}>
        {children}
      </div>
    </div>
  );
};

ViewportPane.displayName = "ViewportPane";
