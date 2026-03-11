import { Trash2 } from "lucide-react";
import { Fragment, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Label } from "@ui/label";

import { WidgetSlotSelect } from "../../parts/WidgetSlotSelect";

import type { WidgetEditorProps, WidgetPropsWithMultipleChannels } from "../types";

function replaceAt<T>(array: ReadonlyArray<T>, index: number, value: T): Array<T> {
  return [...array.slice(0, index), value, ...array.slice(index + 1)];
}

function removeAt<T>(array: ReadonlyArray<T>, index: number): Array<T> {
  return [...array.slice(0, index), ...array.slice(index + 1)];
}

export const EditorMultiChannels = <P extends WidgetPropsWithMultipleChannels>({
  props,
  onPropsChange,
  onSlotsChange,
  slots,
  descriptor,
  generateSlotId = uuidv4,
}: WidgetEditorProps<P> & {
  generateSlotId?: () => string;
}) => {
  // NOTE: channels.slot must match the corresponding key in the namedSlots
  const onAddChannel = useCallback(() => {
    onPropsChange({
      ...props,
      channels: [...props.channels, { label: "", slot: generateSlotId() }],
    });
  }, [props, generateSlotId, onPropsChange]);

  return (
    <>
      {props.channels.length > 0 && (
        <div className="grid grid-cols-[155px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4">
          <Label>Label</Label>
          <Label>Slot</Label>
          <div />
          {props.channels.map((channel, index) => (
            <Fragment key={`_${index}`}>
              <Input
                value={channel.label ?? ""}
                onChange={(ev) =>
                  onPropsChange({
                    ...props,
                    channels: replaceAt(props.channels, index, {
                      ...channel,
                      label: ev.currentTarget.value,
                    }),
                  })
                }
                placeholder="Optional widget title"
              />
              <WidgetSlotSelect
                slot={descriptor.slot}
                value={channel.slot ? slots?.[channel.slot] : undefined}
                onChange={(v) => {
                  // should always be defined if the settings are properly constructed
                  if (channel.slot != null) {
                    const newSlots = { ...slots };
                    if (v == null) {
                      delete newSlots[channel.slot];
                    } else {
                      newSlots[channel.slot] = v;
                    }

                    onSlotsChange(newSlots);
                  }
                }}
              />
              <Button
                variant="ghost"
                className="size-8"
                onClick={() =>
                  onPropsChange({
                    ...props,
                    channels: removeAt(props.channels, index),
                  })
                }>
                <Trash2 className="size-4 shrink-0" />
              </Button>
            </Fragment>
          ))}
        </div>
      )}
      <Button
        className="mx-4 w-fit"
        variant="secondary"
        size="sm"
        onClick={onAddChannel}>
        Add channel
      </Button>
    </>
  );
};
