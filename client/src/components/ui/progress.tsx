import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    barColor?: string // Accepts any CSS color value
  }
>(({ className, value, barColor, style, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      // bg-[color-mix(in_srgb,var(--bar-color),#1e293b_80%)] gives a "darker" remainder
      "relative h-4 w-full overflow-hidden rounded-full",
      className
    )}
    style={{
      "--bar-color": barColor ?? "var(--primary)", // fallback to theme
      background: "color-mix(in srgb, var(--bar-color), #1e293b 80%)",
      ...style,
    } as React.CSSProperties}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full flex-1 transition-all"
      style={{
        width: "100%",
        background: "var(--bar-color)",
        transform: `translateX(-${100 - (value || 0)}%)`,
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }