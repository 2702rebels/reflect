import { z } from "zod";

export const VERSION = 1;

export const WidgetTypeValues = [
  "toggle",
  "chooser",
  "slider",
  "gyro",
  "power.pdp",
  "power.pdh",
  "field2d",
  "robot3d",
  "chart.line",
  "color",
  "value",
  "camera",
  "fms",
  "alerts",
  "swerve",
  "2025.reef.coral",
  "2025.reef.algae",
] as const;

const WidgetType = z.enum(WidgetTypeValues);

const WidgetLayout = z.object({
  left: z.number(),
  top: z.number(),
  width: z.number(),
  height: z.number(),
});

const WidgetBounds = z.object({
  min: z.number().nonnegative().optional(),
  max: z.number().positive().optional(),
  fixed: z.boolean().optional(),
});

const WidgetLayoutConstraints = z.object({
  width: WidgetBounds.optional(),
  height: WidgetBounds.optional(),
});

const WidgetRecord = z.object({
  id: z.string(),
  type: WidgetType,
  layout: WidgetLayout,
  constraints: WidgetLayoutConstraints.optional(),
  slot: z.string().optional(),
  lookback: z.number().nonnegative().optional(),
  props: z.unknown().optional(),
});

const DashboardRecord = z.object({
  id: z.string(),
  widgets: z.array(WidgetRecord),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      scale: z.number().positive(),
    })
    .optional(),
});

export const WorkspaceDocument = z.object({
  version: z.literal(VERSION),
  dashboardId: z.string().optional(),
  dashboards: z
    .object({
      auto: DashboardRecord.optional(),
      teleop: DashboardRecord.optional(),
      custom: z.array(DashboardRecord).optional(),
    })
    .optional(),
});

export type WidgetLayout = z.infer<typeof WidgetLayout>;
export type WidgetBounds = z.infer<typeof WidgetBounds>;
export type WidgetLayoutConstraints = z.infer<typeof WidgetLayoutConstraints>;
export type WidgetType = z.infer<typeof WidgetType>;
export type WidgetRecord = z.infer<typeof WidgetRecord>;
export type DashboardRecord = z.infer<typeof DashboardRecord>;
export type WorkspaceDocument = z.infer<typeof WorkspaceDocument>;
