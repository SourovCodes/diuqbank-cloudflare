"use client";

import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
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
import { type AdminUser, usersClient } from "@/lib/api/admin-client";
import { cn } from "@/lib/utils";

export type PickedUser = Pick<AdminUser, "id" | "name" | "username" | "image">;

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Type-to-search picker for a user (a submission's contributor). Server-side search
 * via `usersClient.list` with cmdk's own filtering off (`shouldFilter={false}`), so the
 * list always reflects the query the API saw. Built on Popover + Command rather than the
 * fragile `@base-ui/react` Combobox.
 */
export function UserPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: PickedUser | null;
  onChange: (user: PickedUser | null) => void;
  disabled?: boolean;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setLoading(true);
    });
    const id = setTimeout(() => {
      usersClient
        .list(token, { search: query || undefined, perPage: 20 })
        .then((res) => {
          if (active) setResults(res.data);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [open, query, token]);

  const pick = (user: PickedUser | null) => {
    onChange(user);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Avatar className="size-5">
                {selected.image ? (
                  <AvatarImage src={selected.image} alt={selected.name} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Anonymous</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search users…"
          />
          <CommandList>
            <CommandGroup>
              <CommandItem value="__anonymous" onSelect={() => pick(null)}>
                <UserRound />
                <span>Anonymous (no contributor)</span>
                {selected === null ? <Check className="ml-auto size-4" /> : null}
              </CommandItem>
            </CommandGroup>
            {loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Searching…
              </p>
            ) : results.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No users found
              </p>
            ) : (
              <CommandGroup heading="Users">
                {results.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={String(user.id)}
                    onSelect={() => pick(user)}
                  >
                    <Avatar className="size-6">
                      {user.image ? (
                        <AvatarImage src={user.image} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex flex-col leading-tight">
                      <span className="truncate">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        @{user.username}
                      </span>
                    </span>
                    <Check
                      className={cn(
                        "ml-auto size-4",
                        selected?.id === user.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
