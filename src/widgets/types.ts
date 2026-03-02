import type { z } from "zod";
import type {
  DataChannelPublisherOptions,
  DataChannelRecord,
  DataType,
  StructuredTypeDescriptor,
} from "@2702rebels/wpidata/abstractions";
import type { WidgetLayoutConstraints, WidgetType } from "../specs";

export type WidgetComponentProps<P = void> = {
  /** Slot reference */
  slot?: string;
  /** Data extracted from the channel and possibly transformed */
  data?: unknown;
  /** Callback to publish channel data if supported */
  publish?: (value: unknown, path?: ReadonlyArray<string>, options?: DataChannelPublisherOptions) => void;
  /** Custom widget properties */
  props: P;
  /** Presentation mode */
  mode?: "template" | "design";
};

export type WidgetEditorProps<P> = {
  /** Custom widget properties */
  props: P;
  /** Callback updating custom widget properties */
  onPropsChange: (v: P) => void;
  /** Indicates that editor is disabled */
  disabled?: boolean;
  /** Primary slot binding for this widget */
  slot?: string;
};

export type WidgetDescriptor<P = unknown> = Readonly<{
  /** Widget type */
  type: WidgetType;
  /** Display name */
  name: string;
  /** Detailed description */
  description: React.ReactNode;
  /** Icon name */
  icon?: string;
  /** Render function for presentational component */
  component: (props: WidgetComponentProps<P>) => React.ReactNode;
  /** Default width */
  width: number;
  /** Default height */
  height: number;
  /** Default layout constraints */
  constraints?: WidgetLayoutConstraints;
  /** Data slot definition */
  slot?: Readonly<{
    /** Default lookback period in seconds */
    lookback?: number;
    /** Data transformer */
    transform?: (
      dataType: DataType,
      records: ReadonlyArray<DataChannelRecord>,
      structuredType: StructuredTypeDescriptor | undefined,
      props: P
    ) => unknown;
    /** Accepted data types */
    accepts?: {
      primitive?: ReadonlyArray<DataType>;
      json?: ReadonlyArray<string>;
      composite?: ReadonlyArray<string>;
    };
    /** Default channel binding */
    defaultChannel?: string;
  }>;
  /** Custom properties specification */
  props?: Readonly<{
    /** Properties schema */
    schema: z.ZodType<P>;
    /** Default value */
    defaultValue: P;
    /** Render function for custom properties editor */
    editor: (props: WidgetEditorProps<P>) => React.ReactNode;
    /** Render function for custom properties quick menu */
    menu?: (props: WidgetEditorProps<P>) => React.ReactNode;
  }>;
  /** Returns additional slot paths derived from widget props (for subscription) */
  extraSlots?: (props: P) => ReadonlyArray<string>;
  /** Spotlight background */
  spotlight?: boolean;
  /** Season-specific widget. */
  season?: number;
}>;
