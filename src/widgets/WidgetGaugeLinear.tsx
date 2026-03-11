import { Fragment, useCallback } from "react";
import { z } from "zod";

import { Format } from "@2702rebels/shared/format";
import { AdaptiveContainer } from "@ui/adaptive-container";
import { Input } from "@ui/input";
import { InputNumber } from "@ui/input-number";
import { TruncateText } from "@ui/truncate-text";

import { cn } from "../lib/utils";
import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorMultiChannels } from "./parts/EditorMultiChannels";
import { EditorSectionHeader } from "./parts/EditorSectionHeader";
import { EditorSwitchBlock } from "./parts/EditorSwitchBlock";
import { GaugeLinear } from "./parts/GaugeLinear";
import { Slot } from "./slot";
import { withPreview } from "./utils";

import type { DataChannelRecord, DataType } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const defaultSize = 40;
const narrowSize = 20;

const numericFormat = z.object({
  maximumFractionDigits: z.number().nonnegative().optional(),
});

const propsSchema = z.object({
  title: z.string().optional(),
  vertical: z.boolean().default(false),
  multiple: z.boolean().default(false),
  channels: z.array(
    z.object({
      label: z.string().optional(),
      slot: z.string().optional(),
    })
  ),
  labelVisible: z.boolean().default(false),
  valueVisible: z.boolean().default(true),
  axisVisible: z.boolean().default(true),
  valueFormat: numericFormat.optional(),
  mono: z.boolean().default(true),
  min: z.number().default(3),
  max: z.number().default(13),
  thresholdLo: z.number().optional(),
  thresholdHi: z.number().optional(),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (dataType: DataType, records: ReadonlyArray<DataChannelRecord>) => {
  if (records.length == 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;
  return typeof value === "number" ? value : undefined;
};

const Component = ({ mode, slot, data, namedData, props }: WidgetComponentProps<PropsType>) => {
  const [d, preview] = withPreview(mode, data as ReturnType<typeof transform>, 123);

  const formatNumeric = useCallback(
    (v: number) =>
      Format.default.number(v, {
        maximumFractionDigits: props.valueFormat?.maximumFractionDigits,
      }),
    [props.valueFormat?.maximumFractionDigits]
  );

  return (
    <div className="flex h-full w-full flex-col px-3 py-2 select-none">
      <div className="mb-1 flex items-center justify-between gap-2">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {mode === "template" ? "Preview" : props.title || Slot.formatAsTitle(slot)}
        </TruncateText>
        {!props.multiple && (
          <div className="font-mono text-sm font-bold">
            {Format.default.number(d, {
              maximumFractionDigits: 1,
            })}
          </div>
        )}
      </div>
      {!props.multiple ? (
        d != null && (
          <AdaptiveContainer
            className={cn("mt-3", props.vertical ? "h-full w-auto" : "h-auto w-full", preview && "opacity-25")}>
            {({ width, height }) => (
              <GaugeLinear
                className={cn(
                  "fill-accent stroke-accent stroke-1 text-[10px]",
                  props.vertical && "overflow-visible",
                  ((props.thresholdLo != null && d < props.thresholdLo) ||
                    (props.thresholdHi != null && d > props.thresholdHi)) &&
                    "stroke-destructive"
                )}
                width={props.vertical ? (props.axisVisible ? defaultSize : narrowSize) + 12 : width}
                height={props.vertical ? height : props.axisVisible ? defaultSize : narrowSize}
                labelSize={props.vertical ? 24 : 14}
                min={props.min}
                max={props.max}
                value={d}
                format={formatNumeric}
                majorTicksVisible={props.axisVisible}
                majorLabelsVisible={props.axisVisible}
                orientation={props.vertical ? "vertical" : "horizontal"}
              />
            )}
          </AdaptiveContainer>
        )
      ) : props.vertical ? (
        <div className={cn("mt-3 flex h-full w-auto justify-center gap-x-4", preview && "opacity-25")}>
          {props.channels?.map((channel, index) => {
            const v = channel.slot ? (namedData?.[channel.slot]?.value as ReturnType<typeof transform>) : undefined;
            const isLast = index === props.channels.length - 1;

            return (
              <div
                className="flex flex-col items-start"
                key={`_${index}`}>
                {props.labelVisible && <div className="flex-none pb-2 text-sm">{channel.label ?? ""}</div>}
                <AdaptiveContainer className="flex flex-auto">
                  {({ height }) => (
                    <GaugeLinear
                      className={cn(
                        "overflow-visible fill-accent stroke-accent stroke-1 text-[10px]",
                        v != null &&
                          ((props.thresholdLo != null && v < props.thresholdLo) ||
                            (props.thresholdHi != null && v > props.thresholdHi)) &&
                          "stroke-destructive"
                      )}
                      width={isLast && props.axisVisible ? defaultSize + 12 : narrowSize}
                      height={height}
                      labelSize={24}
                      min={props.min}
                      max={props.max}
                      value={v}
                      format={formatNumeric}
                      majorTicksVisible={isLast && props.axisVisible}
                      majorLabelsVisible={isLast && props.axisVisible}
                      orientation="vertical"
                    />
                  )}
                </AdaptiveContainer>
                {props.valueVisible && (
                  <div className="flex-none overflow-hidden pt-1 text-end font-mono text-sm font-semibold">
                    {v != null && <TruncateText>{formatNumeric(v)}</TruncateText>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            "mt-3 grid h-auto w-full items-center gap-x-3 gap-y-4",
            preview && "opacity-25",
            props.labelVisible && props.valueVisible
              ? "grid-cols-[auto_minmax(0,1fr)_minmax(40px,auto)]"
              : props.labelVisible
                ? "grid-cols-[auto_minmax(0,1fr)]"
                : props.valueVisible
                  ? "grid-cols-[minmax(0,1fr)_minmax(40px,auto)]"
                  : "grid-cols-1"
          )}>
          {props.channels?.map((channel, index) => {
            const v = channel.slot ? (namedData?.[channel.slot]?.value as ReturnType<typeof transform>) : undefined;
            const isLast = index === props.channels.length - 1;

            return (
              <Fragment key={`_${index}`}>
                {props.labelVisible && (
                  <div className={cn("text-sm", isLast && props.axisVisible && "mb-5")}>{channel.label ?? ""}</div>
                )}
                <AdaptiveContainer>
                  {({ width }) => (
                    <GaugeLinear
                      className={cn(
                        "fill-accent stroke-accent stroke-1 text-[10px]",
                        v != null &&
                          ((props.thresholdLo != null && v < props.thresholdLo) ||
                            (props.thresholdHi != null && v > props.thresholdHi)) &&
                          "stroke-destructive"
                      )}
                      width={width}
                      height={isLast && props.axisVisible ? defaultSize : narrowSize}
                      min={props.min}
                      max={props.max}
                      value={v}
                      format={formatNumeric}
                      majorTicksVisible={isLast && props.axisVisible}
                      majorLabelsVisible={isLast && props.axisVisible}
                    />
                  )}
                </AdaptiveContainer>
                {props.valueVisible && (
                  <div
                    className={cn(
                      "overflow-hidden text-end font-mono text-sm font-semibold",
                      isLast && props.axisVisible && "mb-5"
                    )}>
                    {v != null && <TruncateText>{formatNumeric(v)}</TruncateText>}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Editor = ({ props, onPropsChange, ...other }: WidgetEditorProps<PropsType>) => {
  return (
    <EditorContainer>
      <EditorBlock label="Title">
        <Input
          value={props.title ?? ""}
          onChange={(ev) =>
            onPropsChange({
              ...props,
              title: ev.currentTarget.value,
            })
          }
          placeholder="Optional widget title"
        />
      </EditorBlock>
      <EditorSwitchBlock
        label="Vertical orientation"
        checked={props.vertical}
        onCheckedChange={(v) =>
          onPropsChange({
            ...props,
            vertical: v,
          })
        }
      />
      <EditorSwitchBlock
        label="Show gauge numeric axis"
        checked={props.axisVisible}
        onCheckedChange={(v) =>
          onPropsChange({
            ...props,
            axisVisible: v,
          })
        }
      />
      <EditorSectionHeader>
        Multiple channels — slots each individually bound to a gauge, the default slot binding is ignored
      </EditorSectionHeader>
      <EditorSwitchBlock
        label="Enable multiple channels mode"
        checked={props.multiple}
        onCheckedChange={(v) =>
          onPropsChange({
            ...props,
            multiple: v,
          })
        }
      />
      {props.multiple && (
        <>
          <EditorMultiChannels
            props={props}
            onPropsChange={onPropsChange}
            {...other}
          />
          <EditorSwitchBlock
            label="Show individual channel label"
            checked={props.labelVisible}
            onCheckedChange={(v) =>
              onPropsChange({
                ...props,
                labelVisible: v,
              })
            }
          />
          <EditorSwitchBlock
            label="Show individual channel value"
            checked={props.valueVisible}
            onCheckedChange={(v) =>
              onPropsChange({
                ...props,
                valueVisible: v,
              })
            }
          />
        </>
      )}
      <EditorSectionHeader>Use different color when value is below or above thresholds</EditorSectionHeader>
      <div className="grid grid-cols-2 gap-4 px-4">
        <EditorBlock
          label="Low-value threshold"
          className="px-0">
          <InputNumber
            aria-label="Low-value threshold"
            value={props.thresholdLo}
            onChange={(v) =>
              onPropsChange({
                ...props,
                thresholdLo: Number.isFinite(v) ? v : undefined,
              })
            }
          />
        </EditorBlock>
        <EditorBlock
          label="High-value threshold"
          className="px-0">
          <InputNumber
            aria-label="High-value threshold"
            value={props.thresholdHi}
            onChange={(v) =>
              onPropsChange({
                ...props,
                thresholdHi: Number.isFinite(v) ? v : undefined,
              })
            }
          />
        </EditorBlock>
      </div>
      <EditorSectionHeader>Numeric range options</EditorSectionHeader>
      <div className="grid grid-cols-2 gap-4 px-4">
        <EditorBlock
          label="Minimum value"
          className="px-0">
          <InputNumber
            aria-label="Minimum value"
            value={props.min}
            onChange={(v) =>
              onPropsChange({
                ...props,
                min: Number.isFinite(v) ? v : propsSchema.shape.min.def.defaultValue,
              })
            }
          />
        </EditorBlock>
        <EditorBlock
          label="Maximum value"
          className="px-0">
          <InputNumber
            aria-label="Maximum value"
            value={props.max}
            onChange={(v) =>
              onPropsChange({
                ...props,
                max: Number.isFinite(v) ? v : propsSchema.shape.max.def.defaultValue,
              })
            }
          />
        </EditorBlock>
      </div>
      <EditorSectionHeader>Numeric formatting options</EditorSectionHeader>
      <EditorBlock label="Maximum fraction digits">
        <InputNumber
          aria-label="Maximum fraction digits"
          value={props.valueFormat?.maximumFractionDigits ?? 0}
          onChange={(v) =>
            onPropsChange({
              ...props,
              valueFormat: {
                ...props.valueFormat,
                maximumFractionDigits: Number.isFinite(v) ? v : 0,
              },
            })
          }
          minValue={0}
          maxValue={3}
          step={1}
        />
      </EditorBlock>
    </EditorContainer>
  );
};

export const WidgetGaugeLinearDescriptor: WidgetDescriptor<PropsType> = {
  type: "gauge.linear",
  name: "Linear Gauge",
  icon: "square-gauge-linear",
  description: "Horizontal or vertical gauge",
  width: 10,
  height: 4,
  constraints: {
    width: { min: 4 },
    height: { min: 4 },
  },
  slot: {
    transform: transform,
    accepts: {
      primitive: ["number"],
    },
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {
      vertical: propsSchema.shape.vertical.def.defaultValue,
      multiple: propsSchema.shape.multiple.def.defaultValue,
      channels: [],
      labelVisible: propsSchema.shape.labelVisible.def.defaultValue,
      valueVisible: propsSchema.shape.valueVisible.def.defaultValue,
      axisVisible: propsSchema.shape.axisVisible.def.defaultValue,
      mono: propsSchema.shape.mono.def.defaultValue,
      valueFormat: {
        maximumFractionDigits: 1,
      },
      min: propsSchema.shape.min.def.defaultValue,
      max: propsSchema.shape.max.def.defaultValue,
    },
    editor: (props) => <Editor {...props} />,
  },
  spotlight: false,
};
