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
  /** Data extracted from the default channel and possibly transformed */
  data?: unknown;
  /** Data extracted from the named channels and possible transformed */
  namedData?: Record<
    string,
    Readonly<{
      timestamp: number;
      value: unknown;
    }>
  >;
  /** Callback to publish channel data if supported */
  publish?: (value: unknown, path?: ReadonlyArray<string>, options?: DataChannelPublisherOptions) => void;
  /** Custom widget properties */
  props: P;
  /** Presentation mode */
  mode?: "template" | "design";
};

export type WidgetEditorProps<P> = {
  /** Widget descriptor */
  descriptor: WidgetDescriptor;
  /** Custom widget properties */
  props: P;
  /** Default channel slot */
  slot: string | undefined;
  /** Named channel slots */
  slots: Record<string, string> | undefined;
  /** Callback updating custom widget properties */
  onPropsChange: (v: P) => void;
  /** Callback updating default channel slot */
  onSlotChange: (v: string | undefined) => void;
  /** Callback updating named channel slots */
  onSlotsChange: (v: Record<string, string> | undefined) => void;
  /** Indicates that editor is disabled */
  disabled?: boolean;
};

export type WidgetQuickMenuProps<P> = Omit<WidgetEditorProps<P>, "slot" | "slots" | "onSlotChange" | "onSlotsChange">;

export type WidgetDescriptorSlot<P = unknown> = Readonly<{
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
}>;

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
  /** Default data slot definition */
  slot?: WidgetDescriptorSlot<P> &
    Readonly<{
      /** Default lookback period in seconds */
      lookback?: number;
      /** Default channel binding */
      defaultChannel?: string;
      /** Ignored (used with multi-channel widgets) */
      ignored?: boolean;
    }>;
  /** Named data slots definitions */
  slots?: Record<string, WidgetDescriptorSlot<P>>;
  /** Custom properties specification */
  props?: Readonly<{
    /** Properties schema */
    schema: z.ZodType<P>;
    /** Default value */
    defaultValue: P;
    /** Render function for custom properties editor */
    editor: (props: WidgetEditorProps<P>) => React.ReactNode;
    /** Render function for custom properties quick menu */
    menu?: (props: WidgetQuickMenuProps<P>) => React.ReactNode;
  }>;
  /** Spotlight background */
  spotlight?: boolean;
  /** Season-specific widget. */
  season?: number;
}>;

export type WidgetPropsWithMultipleChannels = {
  channels: Array<{
    label?: string;
    slot?: string;
  }>;
};
