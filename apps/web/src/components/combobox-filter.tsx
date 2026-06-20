"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

type ComboboxFilterProps = {
  id: string;
  urlParam: string;
  label: string;
  icon: React.ReactNode;
  options: Array<{ id: number; name: string }>;
  value: string;
  className?: string;
  isActive?: boolean;
  clearParam?: string;
};

export function ComboboxFilter({ urlParam, label, icon, options, value, className, isActive, clearParam }: ComboboxFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = [{ value: "all", label: `All ${label}s` }, ...options.map((option) => ({ value: String(option.id), label: option.name }))];

  const handleSelect = useCallback((selectedValue: string | null) => {
    const nextValue = selectedValue ?? "all";
    if (nextValue === value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextValue === "all") params.delete(urlParam); else params.set(urlParam, nextValue);
    if (clearParam) params.delete(clearParam);
    params.set("page", "1");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [clearParam, pathname, router, searchParams, urlParam, value]);

  return (
    <Combobox value={value} onValueChange={handleSelect} items={items}>
      <ComboboxTrigger render={<Button variant="outline" role="combobox" className={cn("w-full justify-between transition-all", isActive && "ring-1 ring-ring", className)} />}>
        <span className="flex min-w-0 items-center gap-2 truncate">{icon}<span className="truncate text-left"><ComboboxValue /></span></span>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxEmpty>No {label.toLowerCase()} found.</ComboboxEmpty>
        <ComboboxList>{items.map((item) => <ComboboxItem key={item.value} value={item.value}>{item.label}</ComboboxItem>)}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
