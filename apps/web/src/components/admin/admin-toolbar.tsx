"use client";

import { Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Search + filters + "New" row above an admin table. The search input keeps local
 * state and writes to the URL (via `onSearchChange`) 350ms after typing stops; filter
 * controls are passed as `children`. When `activeFilterCount` is positive and
 * `onClearFilters` is supplied, a "Clear" button appears to reset them all at once.
 */
export function AdminToolbar({
  search = "",
  onSearchChange,
  placeholder = "Search…",
  onNew,
  newLabel = "New",
  activeFilterCount = 0,
  onClearFilters,
  children,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  onNew?: () => void;
  newLabel?: string;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  children?: React.ReactNode;
}) {
  const [value, setValue] = useState(search);

  useEffect(() => {
    if (!onSearchChange) return;
    const id = setTimeout(() => {
      if (value !== search) onSearchChange(value);
    }, 350);
    return () => clearTimeout(id);
  }, [value, search, onSearchChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearchChange ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              className="pl-8"
            />
          </div>
        ) : null}
        {children}
        {onClearFilters && activeFilterCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground"
          >
            <X className="size-4" />
            Clear filters ({activeFilterCount})
          </Button>
        ) : null}
      </div>
      {onNew ? (
        <Button onClick={onNew}>
          <Plus className="size-4" />
          {newLabel}
        </Button>
      ) : null}
    </div>
  );
}
