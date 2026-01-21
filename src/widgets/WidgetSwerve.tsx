import { z } from "zod";

import { Input } from "@ui/input";
import { InputNumber } from "@ui/input-number";
import { TruncateText } from "@ui/truncate-text";

import { cn } from "../lib/utils";
import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorSectionHeader } from "./parts/EditorSectionHeader";
import { EditorSwitchBlock } from "./parts/EditorSwitchBlock";
import { RobotSwerve } from "./parts/RobotSwerve";
import { Slot } from "./slot";
import { toSwerveTelemetry } from "./swerve";
import { withPreview } from "./utils";

import type { DataChannelRecord, DataType, StructuredTypeDescriptor } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const previewData: ReturnType<typeof transform> = {
  currentStates: [
    {
      speed: 0.5,
      angle: -45,
    },
    {
      speed: 0.5,
      angle: -45,
    },
    {
      speed: 0.5,
      angle: -45,
    },
    {
      speed: 0.5,
      angle: -45,
    },
  ],
  currentSpeeds: {
    angle: -45,
    speed: 0.5,
    omega: 0,
  },
};

const propsSchema = z.object({
  title: z.string().optional(),
  chassisRotation: z.boolean().default(true),
  chassisSpeedsVisible: z.boolean().default(true),
  maxLinearSpeed: z.number().min(0).default(5),
  maxAngularSpeed: z.number().min(0).default(360),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (
  dataType: DataType,
  records: ReadonlyArray<DataChannelRecord>,
  structuredType: StructuredTypeDescriptor | undefined,
  props: PropsType
) => {
  if (records.length === 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;

  const normalizeLinearSpeed = (v: number) =>
    Math.sign(v) * Math.max(-1, Math.min(Math.abs(v) / props.maxLinearSpeed, 1));

  const normalizeAngularSpeed = (v: number) =>
    Math.sign(v) * Math.max(-359, Math.min((360 * Math.abs(v)) / props.maxAngularSpeed, 359));

  return structuredType
    ? toSwerveTelemetry(value, structuredType, normalizeLinearSpeed, normalizeAngularSpeed)
    : undefined;
};

const Component = ({ mode, slot, data, props }: WidgetComponentProps<PropsType>) => {
  const [d, preview] = withPreview(mode, data as ReturnType<typeof transform>, previewData);
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
        <div className="flex-auto p-[25%]">
          <div
            className="relative aspect-square h-auto w-full overflow-visible"
            style={
              props.chassisRotation && d.rotation != null ? { transform: `rotate(${-d.rotation}deg)` } : undefined
            }>
            <RobotSwerve
              className={cn(
                "absolute inset-0 m-auto overflow-visible fill-gray-800 stroke-muted-foreground",
                preview && "opacity-25 [stroke-dasharray:1]"
              )}
              currentStates={d.currentStates}
              desiredStates={d.desiredStates}
              currentSpeeds={props.chassisSpeedsVisible ? d.currentSpeeds : undefined}
              desiredSpeeds={props.chassisSpeedsVisible ? d.desiredSpeeds : undefined}
            />
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
        label="Rotate chassis per robot's pose"
        checked={props.chassisRotation}
        onCheckedChange={(v) =>
          onPropsChange({
            ...props,
            chassisRotation: v,
          })
        }
      />
      <EditorSwitchBlock
        label="Show chassis speeds"
        checked={props.chassisSpeedsVisible}
        onCheckedChange={(v) =>
          onPropsChange({
            ...props,
            chassisSpeedsVisible: v,
          })
        }
      />
      <EditorSectionHeader>Speed vector scaling options</EditorSectionHeader>
      <EditorBlock label="Maximum linear speed (m/s)">
        <InputNumber
          aria-label="Maximum linear speed"
          value={props.maxLinearSpeed ?? propsSchema.shape.maxLinearSpeed.def.defaultValue}
          onChange={(v) =>
            onPropsChange({
              ...props,
              maxLinearSpeed: Number.isFinite(v) ? v : propsSchema.shape.maxLinearSpeed.def.defaultValue,
            })
          }
          minValue={1}
          step={0.1}
        />
      </EditorBlock>
      <EditorBlock label="Maximum angular speed (deg/s)">
        <InputNumber
          aria-label="Maximum angular speed"
          value={props.maxAngularSpeed ?? propsSchema.shape.maxAngularSpeed.def.defaultValue}
          onChange={(v) =>
            onPropsChange({
              ...props,
              maxAngularSpeed: Number.isFinite(v) ? v : propsSchema.shape.maxAngularSpeed.def.defaultValue,
            })
          }
          minValue={1}
          step={1}
        />
      </EditorBlock>
    </EditorContainer>
  );
};

export const WidgetSwerveDescriptor: WidgetDescriptor<PropsType> = {
  type: "swerve",
  name: "Swerve",
  icon: "square-swerve",
  description: "Swerve drivetrain",
  width: 10,
  height: 11,
  constraints: {
    width: { min: 5 },
    height: { min: 6 },
  },
  slot: {
    transform: transform,
    accepts: {
      json: ["SwerveTelemetry", "SwerveModuleState"],
    },
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {
      chassisRotation: propsSchema.shape.chassisRotation.def.defaultValue,
      chassisSpeedsVisible: propsSchema.shape.chassisSpeedsVisible.def.defaultValue,
      maxLinearSpeed: propsSchema.shape.maxLinearSpeed.def.defaultValue,
      maxAngularSpeed: propsSchema.shape.maxAngularSpeed.def.defaultValue,
    },
    editor: (props) => <Editor {...props} />,
  },
};
