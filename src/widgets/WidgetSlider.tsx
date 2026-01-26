import { useCallback } from "react";
import { z } from "zod";

import { Logger } from "@2702rebels/logger";
import { getErrorMessage } from "@2702rebels/shared/error";
import { Format } from "@2702rebels/shared/format";
import { Input } from "@ui/input";
import { InputNumber } from "@ui/input-number";
import { Slider } from "@ui/slider";
import { TruncateText } from "@ui/truncate-text";

import { cn } from "../lib/utils";
import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorSectionHeader } from "./parts/EditorSectionHeader";
import { EditorSwitchBlock } from "./parts/EditorSwitchBlock";
import { Slot } from "./slot";
import { withPreview } from "./utils";

import type { DataChannelRecord, DataType } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const numericFormat = z.object({
  maximumFractionDigits: z.number().nonnegative().optional(),
});

const propsSchema = z.object({
  title: z.string().optional(),
  interactive: z.boolean().optional(),
  valueFormat: numericFormat.optional(),
  min: z.number().default(-1),
  max: z.number().default(1),
  step: z.number().nonnegative().default(0.1),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (dataType: DataType, records: ReadonlyArray<DataChannelRecord>) => {
  if (records.length == 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;
  return typeof value === "number" ? value : undefined;
};

const Component = ({ mode, slot, data, props, publish }: WidgetComponentProps<PropsType>) => {
  const interactive = props.interactive;
  const handleChange = useCallback(
    (v: Array<number>) => {
      if (interactive && publish) {
        if (v != null && Number.isFinite(v[0])) {
          try {
            publish(v[0]);
          } catch (exception) {
            const message = getErrorMessage(exception);
            Logger.Default.error(`Failed to publish slider value [${message}]`);
          }
        }
      }
    },
    [interactive, publish]
  );

  const [d, preview] = withPreview(mode, data as ReturnType<typeof transform>, 0);
  return (
    <div className="flex h-full w-full flex-col py-2 select-none">
      <div className="mb-1 flex items-center justify-between gap-2 px-3">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {mode === "template" ? "Preview" : props.title || Slot.formatAsTitle(slot)}
        </TruncateText>
        <div className="font-mono text-sm font-bold">
          {Format.default.number(d, {
            maximumFractionDigits: props.valueFormat?.maximumFractionDigits,
          })}
        </div>
      </div>
      {d != null && (
        <div className={cn("mx-3 my-1 flex flex-auto flex-col justify-center gap-2", preview && "opacity-25")}>
          <Slider
            aria-label="Value"
            value={[d]}
            disabled={!interactive}
            onValueChange={interactive ? handleChange : undefined}
            min={props.min}
            max={props.max}
            step={props.step}
          />
          <div className="flex justify-between">
            <TruncateText className="font-mono text-xs">
              {Format.default.number(props.min, {
                maximumFractionDigits: props.valueFormat?.maximumFractionDigits,
              })}
            </TruncateText>
            <TruncateText className="font-mono text-xs">
              {Format.default.number(props.max, {
                maximumFractionDigits: props.valueFormat?.maximumFractionDigits,
              })}
            </TruncateText>
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
      <EditorSwitchBlock
        label="Interactive"
        checked={props.interactive}
        onCheckedChange={(v) =>
          onPropsChange({
            ...props,
            interactive: v,
          })
        }
      />
      <EditorSectionHeader>Numeric range options</EditorSectionHeader>
      <div className="grid grid-cols-3 gap-4 px-4">
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
        <EditorBlock
          label="Step"
          className="px-0">
          <InputNumber
            aria-label="Step"
            value={props.step}
            onChange={(v) =>
              onPropsChange({
                ...props,
                step: Number.isFinite(v) ? v : propsSchema.shape.step.def.defaultValue,
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

export const WidgetSliderDescriptor: WidgetDescriptor<PropsType> = {
  type: "slider",
  name: "Slider",
  icon: "square-slider",
  description: "Numeric value slider",
  width: 6,
  height: 6,
  constraints: {
    width: { min: 6 },
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
      interactive: false,
      min: propsSchema.shape.min.def.defaultValue,
      max: propsSchema.shape.max.def.defaultValue,
      step: propsSchema.shape.step.def.defaultValue,
      valueFormat: {
        maximumFractionDigits: 2,
      },
    },
    editor: (props) => <Editor {...props} />,
  },
  spotlight: false,
};
