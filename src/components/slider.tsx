import * as SliderPrimitive from "@radix-ui/react-slider";
import { memo } from "react";

import { cn } from "../lib/utils";

export const Slider = memo(({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) => {
  const vertical = props.orientation === "vertical";

  const rootClass = cn(
    vertical
      ? "relative flex h-full touch-none select-none flex-col items-center"
      : "relative flex w-full touch-none items-center select-none",
    className
  );

  const trackClass = cn(
    vertical
      ? "relative w-2 h-full grow overflow-hidden rounded-full bg-slate-700"
      : "relative h-2 w-full grow overflow-hidden rounded-full bg-slate-700"
  );

  const rangeClass = vertical ? "absolute w-full bg-primary bottom-0" : "absolute h-full bg-primary";

  return (
    <SliderPrimitive.Root className={rootClass} {...props}>
      <SliderPrimitive.Track className={trackClass}>
        <SliderPrimitive.Range className={rangeClass} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
});

Slider.displayName = "Slider";
