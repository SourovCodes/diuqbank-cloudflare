"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Type-to-search single-select for a small, already-loaded lookup set (departments,
 * courses, …). Built on Popover + cmdk `Command` — the same proven pattern as
 * `UserPicker`, deliberately not the fragile `@base-ui/react` Combobox. Unlike
 * `UserPicker` it filters client-side (cmdk's default), since the options are in hand.
 *
 * `value` / `onChange` speak strings (`""` = nothing selected) to line up with the URL
 * filter state and the form state, both of which stringify ids.
 */
export function EntityPicker<T>({
  items,
  value,
  onChange,
  getId,
  getLabel,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  clearLabel,
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
}: {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  getId: (item: T) => string | number;
  getLabel: (item: T) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** When set, a leading option that resets the selection (e.g. "All departments"). */
  clearLabel?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = items.find((item) => String(getId(item)) === value);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? getLabel(selected) : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {clearLabel ? (
                <CommandItem value="__clear__" onSelect={() => pick("")}>
                  <span className="text-muted-foreground">{clearLabel}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      value === "" ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ) : null}
              {items.map((item) => {
                const itemId = String(getId(item));
                return (
                  <CommandItem
                    key={itemId}
                    value={itemId}
                    keywords={[getLabel(item)]}
                    onSelect={() => pick(itemId)}
                  >
                    <span className="truncate">{getLabel(item)}</span>
                    <Check
                      className={cn(
                        "ml-auto size-4",
                        value === itemId ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
