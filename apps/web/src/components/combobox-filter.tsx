"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function ComboboxFilter({ label, icon, param, value, options, clearCourse }: { label: string; icon: React.ReactNode; param: string; value?: number; options: Array<{ id: number; name: string }>; clearCourse?: boolean }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = options.find((option) => option.id === value);

  const choose = (next?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(param, String(next)); else params.delete(param);
    if (clearCourse) params.delete("courseId");
    params.set("page", "1");
    setOpen(false);
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between", value && "ring-1 ring-ring")}><span className="flex min-w-0 items-center gap-2 truncate">{icon}<span className="truncate">{selected?.name ?? `All ${label}s`}</span></span><ChevronsUpDown className="ml-2 size-4 opacity-50" /></Button></PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-60 p-0" align="start">
        <Command><CommandInput placeholder={`Search ${label}...`} /><CommandList><CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty><CommandGroup>
          <CommandItem value={`all ${label}s`} onSelect={() => choose()}><Check className={cn("mr-2 size-4", value ? "opacity-0" : "opacity-100")} />All {label}s</CommandItem>
          {options.map((option) => <CommandItem key={option.id} value={option.name} onSelect={() => choose(option.id)}><Check className={cn("mr-2 size-4", value === option.id ? "opacity-100" : "opacity-0")} />{option.name}</CommandItem>)}
        </CommandGroup></CommandList></Command>
      </PopoverContent>
    </Popover>
  );
}
