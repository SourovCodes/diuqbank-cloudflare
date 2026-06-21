"use client";

import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Search + filters + "New" row above an admin table. The search input keeps local
 * state and writes to the URL (via `onSearchChange`) 350ms after typing stops; filter
 * controls are passed as `children`.
 */
export function AdminToolbar({
  search,
  onSearchChange,
  placeholder = "Search…",
  onNew,
  newLabel = "New",
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  onNew?: () => void;
  newLabel?: string;
  children?: React.ReactNode;
}) {
  const [value, setValue] = useState(search);

  useEffect(() => {
    const id = setTimeout(() => {
      if (value !== search) onSearchChange(value);
    }, 350);
    return () => clearTimeout(id);
  }, [value, search, onSearchChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="pl-8"
          />
        </div>
        {children}
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
