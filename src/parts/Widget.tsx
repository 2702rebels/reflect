import { useCallback, useState } from "react";

import { useImmer } from "../hooks/useImmer";
import { useDataChannel, useNamedDataChannels } from "../stores/Data";
import { useSettingsStore } from "../stores/Settings";
import { WidgetNoSlotOverlay } from "../widgets/parts/WidgetNoSlotOverlay";
import { useAnimationLoop } from "./AnimationLoop";

import type { WidgetDescriptorSlot } from "src/widgets/types";
import type { DataChannel, DataChannelPublisherOptions, DataChannelRecord } from "@2702rebels/wpidata/abstractions";
import type { RuntimeWidget } from "../stores/Workspace";

type TimestampedData = {
  timestamp: number;
  value: unknown;
};

const noData = {
  timestamp: -1,
  value: undefined,
} satisfies TimestampedData;

function getRecentRecords(records: ReadonlyArray<DataChannelRecord>, lookback: number) {
  const result = [];
  let timestamp: number | undefined;

  // TODO: should we use global recent timestamp for consistent lookback behavior across data channels?

  for (let i = records.length - 1; i >= 0; --i) {
    const record = records[i];
    if (record == null) {
      continue;
    }

    if (timestamp == null) {
      timestamp = record.timestamp;
    }

    if (timestamp - record.timestamp > lookback) {
      break;
    }

    result.unshift(record);
  }

  return result;
}

function processDataFromChannel<P>(
  channel: DataChannel | undefined,
  prevData: TimestampedData | undefined,
  options: {
    lookback?: number;
    transform?: WidgetDescriptorSlot["transform"];
    props: P;
  }
) {
  if (channel?.records && channel.records.length > 0) {
    const records =
      options.lookback == null || options.lookback <= 0
        ? [channel.records.at(-1)!]
        : getRecentRecords(channel.records, options.lookback * 1e6);

    if (records.length === 0) {
      return noData;
    }

    const timestamp = records.at(-1)!.timestamp;
    if (prevData == null || prevData.timestamp < timestamp || prevData.timestamp === -1) {
      return {
        timestamp,
        value: options.transform
          ? options.transform(channel.dataType, records, channel.structuredType, options.props)
          : records,
      };
    } else {
      return prevData;
    }
  } else {
    return noData;
  }
}

export type WidgetProps = React.ComponentProps<"div"> & {
  widget: RuntimeWidget;
  mode?: "template" | "design";
};

export const Widget = ({ widget, mode, ...props }: WidgetProps) => {
  const { descriptor, slot, slots, lookback, props: widgetProps } = widget;

  const channel = useDataChannel(slot);
  const namedChannels = useNamedDataChannels(slots);

  // publishing is supported on the main (default) channel only,
  // named channels can only be subscribed for data retrieval
  const publish = useCallback(
    (value: unknown, path?: ReadonlyArray<string>, options?: DataChannelPublisherOptions) => {
      if (channel && channel.publish) {
        switch (channel.dataType) {
          case "boolean":
            if (typeof value === "boolean") {
              channel.publish(value);
            }
            break;
          case "number":
            if (typeof value === "number") {
              channel.publish(value);
            }
            break;
          case "string":
            if (typeof value === "string") {
              channel.publish(value);
            }
            break;
          case "booleanArray":
            if (Array.isArray(value)) {
              channel.publish(value.map(Boolean));
            }
            break;
          case "numberArray":
            if (Array.isArray(value)) {
              channel.publish(value.map(Number));
            }
            break;
          case "stringArray":
            if (Array.isArray(value)) {
              channel.publish(value.map(String));
            }
            break;
          case "json":
            if (value != null && typeof value === "object") {
              channel.publish(value as Record<string, unknown>);
            }
            break;
          case "binary":
            channel.publish(value);
            break;
          case "composite":
            channel.publish(value, path, options);
            break;
        }
      }
    },
    [channel]
  );

  const [data, setData] = useState<TimestampedData>(noData);
  const [namedData, setNamedData] = useImmer<Record<string, TimestampedData>>({});

  const update = useCallback(() => {
    setData((prevData) =>
      processDataFromChannel(channel, prevData, {
        lookback,
        transform: descriptor.slot?.transform,
        props: widgetProps,
      })
    );

    if (namedChannels) {
      setNamedData((draft) => {
        for (const [name, channel] of Object.entries(namedChannels)) {
          draft[name] = processDataFromChannel(channel, draft[name], {
            lookback,
            transform: descriptor.slots?.[name]?.transform ?? descriptor.slot?.transform,
            props: widgetProps,
          });
        }
      });
    }
  }, [channel, namedChannels, descriptor.slot, descriptor.slots, lookback, widgetProps, setNamedData]);

  const animationFps = useSettingsStore.use.animationFps();
  useAnimationLoop(update, animationFps);

  const slotBindingRequired = descriptor.slot?.accepts != null;
  const slotBindingPresent = slot || (slots != null && Object.values(slots).some((_) => !!_));
  return (
    <div
      {...props}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-muted-foreground/20 bg-muted">
      {descriptor.spotlight !== false && <div className="absolute inset-0 bg-spotlight" />}
      {descriptor.component({ mode, slot, data: data.value, namedData, props: widgetProps, publish })}
      {!mode && !slotBindingPresent && slotBindingRequired && <WidgetNoSlotOverlay />}
    </div>
  );
};

Widget.displayName = "Widget";
