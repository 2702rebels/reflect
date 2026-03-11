import { useCallback } from "react";
import { z } from "zod";

import { Input } from "@ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { TruncateText } from "@ui/truncate-text";

import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorSwitchBlock } from "./parts/EditorSwitchBlock";
import { Slot } from "./slot";
import { withPreview } from "./utils";

import type { DataChannelRecord, DataType, StructuredTypeDescriptor } from "@2702rebels/wpidata/abstractions";
import type { StringChooserSendable } from "@2702rebels/wpidata/types/sendable";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const previewData: ReturnType<typeof transform> = {
  options: ["Option"],
  active: "Option",
  selected: "Option",
};

const propsSchema = z.object({
  title: z.string().optional(),
  interactive: z.boolean().default(true),
});

const pathSelected = ["selected"];

type PropsType = z.infer<typeof propsSchema>;

const transform = (
  dataType: DataType,
  records: ReadonlyArray<DataChannelRecord>,
  structuredType: StructuredTypeDescriptor | undefined
) => {
  if (records.length == 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;
  try {
    if (
      value != null &&
      typeof value === "object" &&
      structuredType &&
      structuredType.format === "composite" &&
      structuredType.name === "String Chooser"
    ) {
      const v = value as unknown as StringChooserSendable;
      return {
        options: [...v.options].sort(),
        active: v.active,
        selected: v.selected,
      } as const;
    }
  } catch {
    // swallow invalid data
  }

  return undefined;
};

const Component = ({ mode, slot, data, props, publish }: WidgetComponentProps<PropsType>) => {
  const interactive = props.interactive;
  const handleChange = useCallback(
    (v: string) => {
      if (interactive && publish) {
        publish(v, pathSelected);
      }
    },
    [interactive, publish]
  );

  const [d, preview] = withPreview(mode, data as ReturnType<typeof transform>, previewData);
  return (
    <div className="flex h-full w-full flex-col py-2 select-none">
      <div className="mb-1 flex px-3">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {mode === "template" ? "Preview" : props.title || Slot.formatAsTitle(slot)}
        </TruncateText>
      </div>
      <div className="relative grid flex-1 place-items-center px-3">
        {d != null && (
          <Select
            value={d.selected}
            disabled={!interactive}
            onValueChange={handleChange}>
            <SelectTrigger className={preview ? "opacity-25" : undefined}>
              <SelectValue placeholder={d.active} />
            </SelectTrigger>
            <SelectContent>
              {d.options.map((_) => (
                <SelectItem
                  key={_}
                  value={_}>
                  {_}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
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
    </EditorContainer>
  );
};

export const WidgetChooserDescriptor: WidgetDescriptor<PropsType> = {
  type: "chooser",
  name: "Chooser",
  icon: "square-chooser",
  description: "Value chooser from a set of options",
  width: 10,
  height: 5,
  constraints: {
    width: { min: 6 },
    height: { min: 4 },
  },
  slot: {
    transform: transform,
    accepts: {
      composite: ["String Chooser"],
    },
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {
      interactive: propsSchema.shape.interactive.def.defaultValue,
    },
    editor: (props) => <Editor {...props} />,
  },
};
