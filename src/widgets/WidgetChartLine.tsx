import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { useId, useRef } from "react";
import { z } from "zod";

import { Format } from "@2702rebels/shared/format";
import { Input } from "@ui/input";
import { InputNumber } from "@ui/input-number";
import { TruncateText } from "@ui/truncate-text";

import { useElementSize } from "../hooks/useElementSize";
import { cn } from "../lib/utils";
import { ChartGridLine } from "./parts/ChartGridLine";
import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorSectionHeader } from "./parts/EditorSectionHeader";
import { EditorSwitchBlock } from "./parts/EditorSwitchBlock";
import { Slot } from "./slot";
import { numericFormat, numericTransform } from "./types";
import { applyNumericTransform, isIdentityTransform, withPreview } from "./utils";

import type { DataChannelRecord, DataType } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const tickCount = (height: number) => (height <= 100 ? 2 : Math.min(10, Math.round(height / 40)));

const propsSchema = z.object({
  title: z.string().optional(),
  valueFormat: numericFormat.optional(),
  valueTransform: numericTransform.optional(),
  axisFormat: numericFormat.optional(),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (dataType: DataType, records: ReadonlyArray<DataChannelRecord>) => {
  if (records.length == 0) {
    return undefined;
  }

  const series: Array<{ x: number; y: number }> = [];
  let currentValue: number | undefined;
  let timestampMin: number | undefined;
  let timestampMax: number | undefined;
  let minY = 0; // use zero baseline
  let maxY: number | undefined;

  for (let i = records.length - 1; i >= 0; --i) {
    const { value, timestamp } = records[i]!;
    if (typeof value === "number" && Number.isFinite(value)) {
      if (currentValue == null) {
        currentValue = value;
      }

      series.unshift({ x: timestamp, y: value });

      if (minY == null || minY > value) {
        minY = value;
      }

      if (maxY == null || maxY < value) {
        maxY = value;
      }

      if (timestampMin == null || timestampMin > timestamp) {
        timestampMin = timestamp;
      }

      if (timestampMax == null || timestampMax < timestamp) {
        timestampMax = timestamp;
      }
    }
  }

  const scaleX = scaleLinear();
  const scaleY = scaleLinear();

  // [!] reverse Y domain since SVG Y axis is flipped
  scaleX.domain([timestampMin!, timestampMax!]);
  scaleY.domain([maxY ?? 0, minY]).nice();

  return series.length === 0
    ? undefined
    : ({
        series,
        value: currentValue,
        scaleX,
        scaleY,
      } as const);
};

function applyTransform(d: ReturnType<typeof transform>, valueTransform: PropsType["valueTransform"]) {
  if (d == null || isIdentityTransform(valueTransform)) {
    return d;
  }

  let value = d.value;
  let series = d.series;
  let scaleY = d.scaleY;

  if (value != null) {
    value = applyNumericTransform(value, valueTransform);
  }

  if (series != null) {
    let minY = 0; // use zero baseline
    let maxY: number | undefined;

    series = series.map((v) => {
      const y = applyNumericTransform(v.y, valueTransform);
      if (minY == null || minY > y) {
        minY = y;
      }

      if (maxY == null || maxY < y) {
        maxY = y;
      }

      return {
        ...v,
        y,
      };
    });

    // rescale
    scaleY = scaleLinear()
      .domain([maxY ?? 0, minY])
      .nice();
  }

  return {
    ...d,
    value,
    series,
    scaleY,
  };
}

// custom data to use during preview
const previewData = transform(
  "number",
  [2, 2, 2, 2, 2, 1.9, 1.3, 0.8, 0.7, 0.8, 1.3, 2.2, 3.1, 3.4, 3.5, 3.4, 3.1, 2.4, 2.1, 2.02, 2, 2, 2, 2, 2].map(
    (v, i) => ({
      value: v,
      timestamp: (5 - i * 0.2) * 1e6,
    })
  )
);

const WidgetChartLineContent = ({
  data,
  props,
  padding,
  preview,
}: WidgetComponentProps<PropsType> & {
  data: NonNullable<ReturnType<typeof transform>>;
  padding: number;
  preview?: boolean;
}) => {
  const componentId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);

  const w = width;
  const h = Math.min(height, width * 0.8);

  const { scaleX, scaleY, series } = data;

  scaleX.rangeRound([0, w]);
  scaleY.rangeRound([0, h - 2 * padding]);

  const lineGenerator = line<{ x: number; y: number }>()
    .x((d) => scaleX(d.x))
    .y((d) => scaleY(d.y))
    .curve(curveMonotoneX);

  const areaGenerator = area<{ x: number; y: number }>()
    .x((d) => scaleX(d.x))
    .y1((d) => scaleY(d.y))
    .y0(() => scaleY.range()[1]!)
    .curve(curveMonotoneX);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-end overflow-hidden"
      ref={containerRef}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${w} ${h}`}
        className="stroke-1 text-sky-800">
        <defs>
          <linearGradient
            id={`${componentId}-gradient`}
            x1={0}
            x2={0}
            y1={0}
            y2={1}>
            <stop
              offset="0%"
              stopColor="currentColor"
              stopOpacity="0.8"
            />
            <stop
              offset="100%"
              stopColor="currentColor"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <g transform={`translate(0, ${padding})`}>
          <g
            className="fill-foreground stroke-slate-500"
            fontSize={10}>
            {scaleY.ticks(tickCount(h - 2 * padding)).map((tickValue, index) => (
              <ChartGridLine
                key={`_${index}`}
                value={tickValue}
                scale={scaleY}
                width={w}
                maximumFractionDigits={props.axisFormat?.maximumFractionDigits}
              />
            ))}
          </g>
          <path
            d={areaGenerator(series) ?? ""}
            fill={`url(#${componentId}-gradient)`}
            className={preview ? "opacity-25" : undefined}
          />
          <path
            d={lineGenerator(series) ?? ""}
            className={cn("fill-none stroke-sky-200", preview && "opacity-25 [stroke-dasharray:5]")}
          />
        </g>
      </svg>
    </div>
  );
};

const Component = ({ mode, slot, data, props }: WidgetComponentProps<PropsType>) => {
  const [d, preview] = withPreview(
    mode,
    applyTransform(data as ReturnType<typeof transform>, props.valueTransform),
    previewData
  );

  return (
    <div className="flex h-full w-full flex-col py-2 select-none">
      <div className="mb-1 flex items-center justify-between gap-2 px-3">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {mode === "template" ? "Preview" : props.title || Slot.formatAsTitle(slot)}
        </TruncateText>
        <div className="font-mono text-sm font-bold">
          {Format.default.number(d?.value, {
            maximumFractionDigits: props.valueFormat?.maximumFractionDigits,
          })}
        </div>
      </div>
      {d != null && (
        <WidgetChartLineContent
          preview={preview}
          data={d}
          props={props}
          padding={10}
        />
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
      <EditorSectionHeader>Numeric formatting options</EditorSectionHeader>
      <EditorBlock label="Current value maximum fraction digits">
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
      <EditorBlock label="Axis label maximum fraction digits">
        <InputNumber
          aria-label="Maximum fraction digits"
          value={props.axisFormat?.maximumFractionDigits ?? 0}
          onChange={(v) =>
            onPropsChange({
              ...props,
              axisFormat: {
                ...props.axisFormat,
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
    </EditorContainer>
  );
};

export const WidgetChartLineDescriptor: WidgetDescriptor<PropsType> = {
  type: "chart.line",
  name: "Line Chart",
  icon: "square-pulse",
  description: "Numeric data as a line chart over time",
  width: 10,
  height: 11,
  constraints: {
    width: { min: 4 },
    height: { min: 4 },
  },
  slot: {
    lookback: 5,
    transform: transform,
    accepts: {
      primitive: ["number"],
    },
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {
      valueFormat: {
        maximumFractionDigits: 1,
      },
      axisFormat: {
        maximumFractionDigits: 2,
      },
    },
    editor: (props) => <Editor {...props} />,
  },
};
