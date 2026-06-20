"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="input-group" role="group" className={cn("group/input-group relative flex h-9 w-full min-w-0 items-center rounded-md border border-input shadow-xs outline-none transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30", className)} {...props} />;
}

const addonVariants = cva("flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground", { variants: { align: { "inline-start": "order-first pl-2", "inline-end": "order-last pr-2", "block-start": "order-first w-full justify-start px-2.5 pt-2", "block-end": "order-last w-full justify-start px-2.5 pb-2" } }, defaultVariants: { align: "inline-start" } });
export function InputGroupAddon({ className, align = "inline-start", ...props }: React.ComponentProps<"div"> & VariantProps<typeof addonVariants>) {
  return <div role="group" data-slot="input-group-addon" data-align={align} className={cn(addonVariants({ align }), className)} onClick={(event) => { if (!(event.target as HTMLElement).closest("button")) event.currentTarget.parentElement?.querySelector("input")?.focus(); }} {...props} />;
}

export function InputGroupButton({ className, type = "button", variant = "ghost", size = "icon-xs", ...props }: React.ComponentProps<typeof Button>) {
  return <Button type={type} variant={variant} size={size} className={cn("shadow-none", className)} {...props} />;
}
export function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return <Input data-slot="input-group-control" className={cn("flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent", className)} {...props} />;
}
export function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <Textarea data-slot="input-group-control" className={cn("flex-1 resize-none rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent", className)} {...props} />;
}
