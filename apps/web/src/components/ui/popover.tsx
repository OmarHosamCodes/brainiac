import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { LiquidGlassBackdrop, LiquidGlassBody, liquidGlassFrameClass } from "@/lib/utils/liquid-glass-ui";
import { cn } from "@/lib/utils";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(liquidGlassFrameClass, "w-72 p-1", className)}
        {...props}
      >
        <LiquidGlassBackdrop />
        <LiquidGlassBody>{children}</LiquidGlassBody>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
