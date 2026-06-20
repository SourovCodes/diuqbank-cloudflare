"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export function CustomPagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const changePage = useCallback((page: number) => { const params = new URLSearchParams(searchParams.toString()); params.set("page", String(page)); router.push(`${pathname}?${params}`, { scroll: false }); }, [pathname, router, searchParams]);
  if (totalPages <= 1) return null;

  const pages: React.ReactNode[] = [];
  pages.push(<PaginationItem key="first"><PaginationLink href="#" isActive={currentPage === 1} onClick={(event) => { event.preventDefault(); changePage(1); }}>1</PaginationLink></PaginationItem>);
  if (currentPage > 3) pages.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);
  if (currentPage <= 3) end = Math.min(totalPages - 1, 4);
  if (currentPage >= totalPages - 2) start = Math.max(2, totalPages - 3);
  const middlePages = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  for (const pageNumber of middlePages) pages.push(<PaginationItem key={pageNumber}><PaginationLink href="#" isActive={currentPage === pageNumber} onClick={(event) => { event.preventDefault(); changePage(pageNumber); }}>{pageNumber}</PaginationLink></PaginationItem>);
  if (currentPage < totalPages - 2) pages.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
  if (totalPages > 1) pages.push(<PaginationItem key="last"><PaginationLink href="#" isActive={currentPage === totalPages} onClick={(event) => { event.preventDefault(); changePage(totalPages); }}>{totalPages}</PaginationLink></PaginationItem>);

  return <Pagination className="mt-8"><PaginationContent><PaginationItem><PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); if (currentPage > 1) changePage(currentPage - 1); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} /></PaginationItem>{pages}<PaginationItem><PaginationNext href="#" onClick={(event) => { event.preventDefault(); if (currentPage < totalPages) changePage(currentPage + 1); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} /></PaginationItem></PaginationContent></Pagination>;
}
