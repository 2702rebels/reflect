import { Circle, CircleCheck } from "lucide-react";
import { Fragment } from "react";
import { z } from "zod";

import { Input } from "@ui/input";
import { TruncateText } from "@ui/truncate-text";

import { cn } from "../lib/utils";
import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorMultiChannels } from "./parts/EditorMultiChannels";
import { Slot } from "./slot";

import type { DataChannelRecord, DataType } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const propsSchema = z.object({
  title: z.string().optional(),
  channels: z.array(
    z.object({
      label: z.string().optional(),
      slot: z.string().optional(),
    })
  ),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (dataType: DataType, records: ReadonlyArray<DataChannelRecord>) => {
  if (records.length == 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;
  return typeof value === "boolean" ? value : undefined;
};

const Component = ({ mode, slot, namedData, props }: WidgetComponentProps<PropsType>) => {
  const preview = mode === "template";
  return (
    <div className="flex h-full w-full flex-col py-2 select-none">
      <div className="mb-1 flex items-center justify-between gap-2 px-3">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {preview ? "Preview" : props.title || Slot.formatAsTitle(slot)}
        </TruncateText>
      </div>
      <div
        className={cn(
          "mt-2 mb-1 grid grid-cols-[24px_1fr] items-center gap-x-2 gap-y-1.5 px-3 text-sm",
          preview && "opacity-25"
        )}>
        {preview ? (
          <>
            <CircleCheck className="text-green-600" />
            <div>Telemetry</div>
            <CircleCheck className="text-green-600" />
            <div>Drivetrain</div>
            <Circle className="text-muted-foreground" />
            <div className="text-muted-foreground">Vision</div>
          </>
        ) : (
          props.channels?.map((channel, index) => {
            const v = channel.slot ? (namedData?.[channel.slot]?.value as ReturnType<typeof transform>) : undefined;
            return (
              <Fragment key={`_${index}`}>
                {v ? <CircleCheck className="text-green-600" /> : <Circle />}
                {channel.label}
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

const Editor = ({ props, onPropsChange, ...other }: WidgetEditorProps<PropsType>) => {
  return (
    <EditorContainer>
      <EditorMultiChannels
        props={props}
        onPropsChange={onPropsChange}
        {...other}
      />
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
    </EditorContainer>
  );
};

export const WidgetChecklistDescriptor: WidgetDescriptor<PropsType> = {
  type: "checklist",
  name: "Checklist",
  icon: "square-checks",
  description: "Boolean-based checklist",
  width: 10,
  height: 9,
  constraints: {
    width: { min: 5 },
    height: { min: 3 },
  },
  slot: {
    ignored: true,
    transform: transform,
    accepts: {
      primitive: ["boolean"],
    },
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {
      channels: [],
    },
    editor: (props) => <Editor {...props} />,
  },
  spotlight: false,
};
