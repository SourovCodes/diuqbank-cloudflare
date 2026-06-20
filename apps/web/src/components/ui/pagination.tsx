import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />;
}
export function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex items-center gap-1", className)} {...props} />;
}
export function PaginationItem(props: React.ComponentProps<"li">) { return <li {...props} />; }
export function PaginationLink({ className, isActive, ...props }: React.ComponentProps<"a"> & { isActive?: boolean }) {
  return <Button asChild variant={isActive ? "outline" : "ghost"} size="icon"><a aria-current={isActive ? "page" : undefined} className={className} {...props} /></Button>;
}
export function PaginationPrevious(props: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Previous page" {...props}><ChevronLeft /><span className="hidden sm:inline">Previous</span></PaginationLink>;
}
export function PaginationNext(props: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Next page" {...props}><span className="hidden sm:inline">Next</span><ChevronRight /></PaginationLink>;
}
export function PaginationEllipsis() { return <span className="flex size-9 items-center justify-center"><MoreHorizontal className="size-4" /><span className="sr-only">More pages</span></span>; }
