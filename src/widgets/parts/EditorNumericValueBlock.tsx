import { InputNumber } from "@ui/input-number";

import { EditorBlock } from "./EditorBlock";
import { EditorSectionHeader } from "./EditorSectionHeader";
import { EditorSwitchBlock } from "./EditorSwitchBlock";

import type { WidgetEditorProps, WidgetPropsWithNumericValue } from "../types";

export const EditorNumericValueBlock = <P extends WidgetPropsWithNumericValue>({
  props,
  onPropsChange,
}: Pick<WidgetEditorProps<P>, "props" | "onPropsChange">) => {
  return (
    <>
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
      <EditorSectionHeader>Numeric transformation options</EditorSectionHeader>
      <EditorBlock label="Scaling factor">
        <InputNumber
          aria-label="Scaling factor"
          value={props.valueTransform?.scale ?? 1}
          onChange={(v) =>
            onPropsChange({
              ...props,
              valueTransform: {
                ...props.valueTransform,
                scale: Number.isFinite(v) ? v : undefined,
              },
            })
          }
        />
      </EditorBlock>
      <EditorSwitchBlock
        label="Use absolute value"
        checked={props.valueTransform?.absolute}
        onCheckedChange={(v) =>
          onPropsChange({
            ...props,
            valueTransform: {
              ...props.valueTransform,
              absolute: v,
            },
          })
        }
      />
    </>
  );
};
