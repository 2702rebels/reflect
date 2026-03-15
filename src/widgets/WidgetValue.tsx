import { z } from "zod";

import { Format } from "@2702rebels/shared/format";
import { Input } from "@ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { TruncateText } from "@ui/truncate-text";

import { cn } from "../lib/utils";
import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorNumericValueBlock } from "./parts/EditorNumericValueBlock";
import { EditorSwitchBlock } from "./parts/EditorSwitchBlock";
import { Slot } from "./slot";
import { numericFormat, numericTransform } from "./types";
import { applyNumericTransform, withPreview } from "./utils";

import type { DataChannelRecord, DataType } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const propsSchema = z.object({
  title: z.string().optional(),
  valueFormat: numericFormat.optional(),
  valueTransform: numericTransform.optional(),
  alignment: z.enum(["center", "start", "end"]).default("center"),
  size: z.enum(["lg", "xl", "2xl", "3xl", "4xl", "5xl"]).default("lg"),
  mono: z.boolean().default(false),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (dataType: DataType, records: ReadonlyArray<DataChannelRecord>) => {
  if (records.length == 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value;
  }

  return value?.toString();
};

const Component = ({ mode, slot, data, props }: WidgetComponentProps<PropsType>) => {
  const [d, preview] = withPreview(mode, data as ReturnType<typeof transform>, "Abc ... 123");
  return (
    <div className="flex h-full w-full flex-col py-2 select-none">
      <div className="mb-1 flex items-center justify-between gap-2 px-3">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {mode === "template" ? "Preview" : props.title || Slot.formatAsTitle(slot)}
        </TruncateText>
      </div>
      {d != null && (
        <div
          className={cn(
            "mx-3 my-1 flex flex-auto flex-col items-center justify-center overflow-hidden text-lg font-semibold",
            preview && "opacity-25",
            props.mono && "font-mono",
            props.alignment === "start" && "items-start",
            props.alignment === "end" && "items-end",
            props.size === "xl" && "text-xl",
            props.size === "2xl" && "text-2xl",
            props.size === "3xl" && "text-3xl",
            props.size === "4xl" && "text-4xl",
            props.size === "5xl" && "text-5xl"
          )}>
          <TruncateText>
            {typeof d === "number"
              ? Format.default.number(applyNumericTransform(d, props.valueTransform), {
                  maximumFractionDigits: props.valueFormat?.maximumFractionDigits,
                })
              : d}
          </TruncateText>
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
      <EditorBlock label="Content alignment">
        <Select
          value={props.alignment}
          onValueChange={(v) =>
            onPropsChange({
              ...props,
              alignment: v as PropsType["alignment"],
            })
          }>
          <SelectTrigger>
            <SelectValue placeholder="Select alignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="start">Start&hellip;</SelectItem>
            <SelectItem value="end">&hellip;End</SelectItem>
          </SelectContent>
        </Select>
      </EditorBlock>
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
      <EditorSwitchBlock
        label="Use monospace font"
        checked={props.mono}
        onCheckedChange={(v) =>
          onPropsChange({
            ...props,
            mono: v,
          })
        }
      />
      <EditorNumericValueBlock
        props={props}
        onPropsChange={onPropsChange}
      />
    </EditorContainer>
  );
};

export const WidgetValueDescriptor: WidgetDescriptor<PropsType> = {
  type: "value",
  name: "Value",
  icon: "square-value",
  description: "Single value",
  width: 6,
  height: 6,
  constraints: {
    width: { min: 4 },
    height: { min: 4 },
  },
  slot: {
    transform: transform,
    accepts: {
      primitive: ["number", "string"],
    },
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {
      alignment: propsSchema.shape.alignment.def.defaultValue,
      size: propsSchema.shape.size.def.defaultValue,
      mono: propsSchema.shape.mono.def.defaultValue,
      valueFormat: {
        maximumFractionDigits: 2,
      },
    },
    editor: (props) => <Editor {...props} />,
  },
  spotlight: false,
};
