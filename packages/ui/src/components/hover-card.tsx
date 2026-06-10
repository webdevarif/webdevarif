"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "../lib/utils";

/**
 * shadcn-style HoverCard. Radix handles the heavy lifting:
 *   - smart positioning (auto-flip on edges)
 *   - delay timing (openDelay / closeDelay props)
 *   - hover-out grace so cursor can travel from trigger to content
 *   - focus-visible on keyboard nav
 *   - rendered in a portal so it can't be clipped by overflow:hidden
 *
 * Drop-in pattern:
 *   <HoverCard openDelay={100} closeDelay={100}>
 *     <HoverCardTrigger asChild>
 *       <button>hover me</button>
 *     </HoverCardTrigger>
 *     <HoverCardContent side="top">Tooltip content</HoverCardContent>
 *   </HoverCard>
 */

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ComponentRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 6, ...props }, ref) => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </HoverCardPrimitive.Portal>
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
