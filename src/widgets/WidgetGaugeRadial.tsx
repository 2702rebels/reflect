import { useCallback } from "react";
import { z } from "zod";

import { Format } from "@2702rebels/shared/format";
import { Input } from "@ui/input";
import { InputNumber } from "@ui/input-number";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { TruncateText } from "@ui/truncate-text";

import { cn } from "../lib/utils";
import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorNumericValueBlock } from "./parts/EditorNumericValueBlock";
import { EditorSectionHeader } from "./parts/EditorSectionHeader";
import { GaugeRadial } from "./parts/GaugeRadial";
import { Slot } from "./slot";
import { numericFormat, numericTransform } from "./types";
import { applyNumericTransform, withPreview } from "./utils";

import type { DataChannelRecord, DataType } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const propsSchema = z.object({
  title: z.string().optional(),
  valueFormat: numericFormat.optional(),
  valueTransform: numericTransform.optional(),
  size: z.enum(["lg", "xl", "2xl", "3xl", "4xl", "5xl"]).default("lg"),
  min: z.number().default(3),
  max: z.number().default(13),
  start: z.number().nonnegative().default(60),
  stop: z.number().nonnegative().default(300),
  minor: z.number().nonnegative().default(1.5),
  major: z.number().nonnegative().default(30),
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

const Component = ({ mode, slot, data, props }: WidgetComponentProps<PropsType>) => {
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
      </div>
      {d != null && (
        <div className={cn("relative mt-3 aspect-square h-auto w-full", preview && "opacity-25")}>
          <GaugeRadial
            className={cn(
              "absolute inset-0 fill-accent stroke-accent stroke-1 text-[6px]",
              ((props.thresholdLo != null && d < props.thresholdLo) ||
                (props.thresholdHi != null && d > props.thresholdHi)) &&
                "stroke-destructive"
            )}
            start={props.start}
            stop={props.stop}
            minor={props.minor}
            major={props.major}
            min={props.min}
            max={props.max}
            value={applyNumericTransform(d, props.valueTransform)}
            format={formatNumeric}
          />
          <div
            className={cn(
              "absolute inset-0 flex flex-auto flex-col items-center justify-center overflow-hidden font-mono text-lg font-semibold",
              props.size === "xl" && "text-xl",
              props.size === "2xl" && "text-2xl",
              props.size === "3xl" && "text-3xl",
              props.size === "4xl" && "text-4xl",
              props.size === "5xl" && "text-5xl"
            )}>
            <TruncateText>{formatNumeric(applyNumericTransform(d, props.valueTransform))}</TruncateText>
          </div>
        </div>
      )}
    </div>
  );
};

const Editor = ({ props, onPropsChange }: WidgetEditorProps<PropsType>) => {
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
      <div className="grid grid-cols-2 gap-4 px-4">
        <EditorBlock
          label="Start angle °"
          className="px-0">
          <InputNumber
            aria-label="Start angle"
            value={props.start}
            onChange={(v) =>
              onPropsChange({
                ...props,
                start: Number.isFinite(v) ? v : propsSchema.shape.start.def.defaultValue,
              })
            }
          />
        </EditorBlock>
        <EditorBlock
          label="Stop angle °"
          className="px-0">
          <InputNumber
            aria-label="Stop angle"
            value={props.stop}
            onChange={(v) =>
              onPropsChange({
                ...props,
                stop: Number.isFinite(v) ? v : propsSchema.shape.stop.def.defaultValue,
              })
            }
          />
        </EditorBlock>
      </div>
      <div className="grid grid-cols-2 gap-4 px-4">
        <EditorBlock
          label="Major tick °"
          className="px-0">
          <InputNumber
            aria-label="Major tick>"
            value={props.major}
            onChange={(v) =>
              onPropsChange({
                ...props,
                major: Number.isFinite(v) ? v : propsSchema.shape.major.def.defaultValue,
              })
            }
          />
        </EditorBlock>
        <EditorBlock
          label="Minor tick °"
          className="px-0">
          <InputNumber
            aria-label="Minor tick"
            value={props.minor}
            onChange={(v) =>
              onPropsChange({
                ...props,
                minor: Number.isFinite(v) ? v : propsSchema.shape.minor.def.defaultValue,
              })
            }
          />
        </EditorBlock>
      </div>
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
      <EditorBlock label="Content size">
        <Select
          value={props.size}
          onValueChange={(v) =>
            onPropsChange({
              ...props,
              size: v as PropsType["size"],
            })
          }>
          <SelectTrigger>
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lg">Large</SelectItem>
            <SelectItem value="xl">XL</SelectItem>
            <SelectItem value="2xl">2 XL</SelectItem>
            <SelectItem value="3xl">3 XL</SelectItem>
            <SelectItem value="4xl">4 XL</SelectItem>
            <SelectItem value="5xl">5 XL</SelectItem>
          </SelectContent>
        </Select>
      </EditorBlock>
      <EditorNumericValueBlock
        props={props}
        onPropsChange={onPropsChange}
      />
    </EditorContainer>
  );
};

export const WidgetGaugeRadialDescriptor: WidgetDescriptor<PropsType> = {
  type: "gauge.radial",
  name: "Radial Gauge",
  icon: "square-gauge-radial",
  description: "Radial gauge",
  width: 10,
  height: 9,
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
      size: propsSchema.shape.size.def.defaultValue,
      valueFormat: {
        maximumFractionDigits: 1,
      },
      min: propsSchema.shape.min.def.defaultValue,
      max: propsSchema.shape.max.def.defaultValue,
      start: propsSchema.shape.start.def.defaultValue,
      stop: propsSchema.shape.stop.def.defaultValue,
      minor: propsSchema.shape.minor.def.defaultValue,
      major: propsSchema.shape.major.def.defaultValue,
    },
    editor: (props) => <Editor {...props} />,
  },
  spotlight: false,
};
