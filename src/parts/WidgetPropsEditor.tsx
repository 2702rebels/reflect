import { Settings2 } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@ui/button";
import { InputNumber } from "@ui/input-number";
import { ScrollArea } from "@ui/scroll-area";

import { useWidget, workspaceActions } from "../stores/Workspace";
import { EditorBlock } from "../widgets/parts/EditorBlock";
import { ModalTemplate } from "./ModalTemplate";
import { WidgetSlotSelect } from "./WidgetSlotSelect";

import type { ModalProps } from "./ModalTemplate";

const { updateWidgetLookback, updateWidgetProps, updateWidgetSlot } = workspaceActions;

type WidgetPropsEditorPanelProps = {
  widgetId: string;
};

const WidgetPropsEditorPanel = ({ disabled, widgetId }: ModalProps & WidgetPropsEditorPanelProps) => {
  const { descriptor, props, lookback, slot } = useWidget(widgetId)!;
  const handleSlotChange = useCallback((v: string | undefined) => updateWidgetSlot(widgetId, v), [widgetId]);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-b-border/40 bg-secondary/40 p-4">
        <Settings2 className="text-secondary-foreground/80" />
        <h1 className="text-lg font-semibold text-secondary-foreground/80 select-none">{descriptor.name}</h1>
      </div>
      <div className="flex flex-col gap-1 border-b bg-secondary/20 px-4 py-4 select-none">
        <p className="flex gap-2 text-sm text-muted-foreground">{descriptor.description}</p>
      </div>
      <ScrollArea className="flex-1">
        <EditorBlock
          label={
            <div className="flex items-center justify-between">
              Slot binding
              {slot && (
                <Button
                  onClick={() => handleSlotChange(undefined)}
                  className="-my-3"
                  variant="link"
                  size="sm">
                  Reset
                </Button>
              )}
            </div>
          }
          className="pt-4">
          <WidgetSlotSelect
            descriptor={descriptor}
            value={slot}
            onChange={handleSlotChange}
          />
        </EditorBlock>
        <EditorBlock
          label="Lookback period (seconds)"
          className="pt-4">
          <InputNumber
            aria-label="Lookback period (seconds)"
            value={lookback ?? 0}
            minValue={0}
            maxValue={180}
            step={1}
            onChange={(v) => updateWidgetLookback(widgetId, v)}
            isDisabled={disabled}
          />
        </EditorBlock>
        {descriptor.props?.editor({
          onPropsChange: (v) => updateWidgetProps(widgetId, v),
          props,
          disabled,
          slot,
        })}
      </ScrollArea>
    </>
  );
};

export const WidgetPropsEditorModal = () => (
  <ModalTemplate<WidgetPropsEditorPanelProps>
    id="widget-props-editor"
    closeButtonVisible
    render={(props) => <WidgetPropsEditorPanel {...props} />}
  />
);
