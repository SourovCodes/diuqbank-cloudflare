"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;
function ComboboxValue(props: ComboboxPrimitive.Value.Props) { return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />; }
function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) { return <ComboboxPrimitive.Trigger data-slot="combobox-trigger" className={cn("[&_svg:not([class*='size-'])]:size-4", className)} {...props}>{children}<ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" /></ComboboxPrimitive.Trigger>; }
function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) { return <ComboboxPrimitive.Clear data-slot="combobox-clear" render={<InputGroupButton variant="ghost" size="icon-xs" />} className={className} {...props}><XIcon /></ComboboxPrimitive.Clear>; }
function ComboboxInput({ className, children, disabled = false, showTrigger = true, showClear = false, ...props }: ComboboxPrimitive.Input.Props & { showTrigger?: boolean; showClear?: boolean }) { return <InputGroup className={cn("w-auto", className)}><ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} /><InputGroupAddon align="inline-end">{showTrigger ? <InputGroupButton size="icon-xs" variant="ghost" asChild disabled={disabled}><ComboboxTrigger /></InputGroupButton> : null}{showClear ? <ComboboxClear disabled={disabled} /> : null}</InputGroupAddon>{children}</InputGroup>; }
function ComboboxContent({ className, side = "bottom", sideOffset = 6, align = "start", alignOffset = 0, anchor, ...props }: ComboboxPrimitive.Popup.Props & Pick<ComboboxPrimitive.Positioner.Props, "side" | "align" | "sideOffset" | "alignOffset" | "anchor">) { return <ComboboxPrimitive.Portal><ComboboxPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset} anchor={anchor} className="isolate z-50"><ComboboxPrimitive.Popup data-slot="combobox-content" className={cn("relative max-h-(--available-height) w-(--anchor-width) min-w-[calc(var(--anchor-width)+--spacing(7))] overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10", className)} {...props} /></ComboboxPrimitive.Positioner></ComboboxPrimitive.Portal>; }
function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) { return <ComboboxPrimitive.List data-slot="combobox-list" className={cn("max-h-72 scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0", className)} {...props} />; }
function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) { return <ComboboxPrimitive.Item data-slot="combobox-item" className={cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50", className)} {...props}>{children}<ComboboxPrimitive.ItemIndicator render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}><CheckIcon /></ComboboxPrimitive.ItemIndicator></ComboboxPrimitive.Item>; }
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) { return <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn("w-full py-6 text-center text-sm text-muted-foreground", className)} {...props} />; }
function ComboboxGroup(props: ComboboxPrimitive.Group.Props) { return <ComboboxPrimitive.Group data-slot="combobox-group" {...props} />; }
function ComboboxCollection(props: ComboboxPrimitive.Collection.Props) { return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />; }
function useComboboxAnchor() { return React.useRef<HTMLDivElement | null>(null); }

export { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxGroup, ComboboxCollection, ComboboxEmpty, ComboboxTrigger, ComboboxValue, useComboboxAnchor };
