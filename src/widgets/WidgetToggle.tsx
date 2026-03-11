import { useCallback } from "react";
import { z } from "zod";

import { Input } from "@ui/input";
import { Toggle } from "@ui/toggle";
import { TruncateText } from "@ui/truncate-text";

import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorSwitchBlock } from "./parts/EditorSwitchBlock";
import { Slot } from "./slot";
import { withPreview } from "./utils";

import type { DataChannelRecord, DataType } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const propsSchema = z.object({
  title: z.string().optional(),
  interactive: z.boolean().default(true),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (dataType: DataType, records: ReadonlyArray<DataChannelRecord>) => {
  if (records.length == 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;
  return typeof value === "boolean" ? value : undefined;
};

const Component = ({ mode, slot, data, props, publish }: WidgetComponentProps<PropsType>) => {
  const interactive = props.interactive;
  const handleChange = useCallback(
    (v: boolean) => {
      if (interactive && publish) {
        publish(v);
      }
    },
    [interactive, publish]
  );

  const [d, preview] = withPreview(mode, data as ReturnType<typeof transform>, false);
  return (
    <div className="flex h-full w-full flex-col py-2 select-none">
      <div className="mb-1 flex px-3">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {mode === "template" ? "Preview" : props.title || Slot.formatAsTitle(slot)}
        </TruncateText>
      </div>
      <div className="relative grid flex-1 place-items-center">
        {d != null && (
          <Toggle
            className={preview ? "opacity-25" : undefined}
            checked={d}
            disabled={!interactive}
            onCheckedChange={handleChange}
          />
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

export const WidgetToggleDescriptor: WidgetDescriptor<PropsType> = {
  type: "toggle",
  name: "Toggle",
  icon: "square-tick",
  description: "Boolean value as a toggle",
  width: 6,
  height: 6,
  constraints: {
    width: { min: 6 },
    height: { min: 5 },
  },
  slot: {
    transform: transform,
    accepts: {
      primitive: ["boolean"],
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
