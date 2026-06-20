"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClearFiltersButton({ count }: { count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const clearFilters = useCallback(() => router.push(`${pathname}?page=1`, { scroll: false }), [pathname, router]);
  return <Button variant="outline" size="sm" onClick={clearFilters} className="h-7"><FilterX />Clear{count > 1 ? ` (${count})` : ""}</Button>;
}
