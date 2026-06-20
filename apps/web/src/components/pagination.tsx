import { Pagination as PaginationRoot, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export function Pagination({ currentPage, totalPages, hrefForPage }: { currentPage: number; totalPages: number; hrefForPage: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = Array.from(new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  return <PaginationRoot className="mt-8"><PaginationContent><PaginationItem><PaginationPrevious href={hrefForPage(Math.max(1, currentPage - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} /></PaginationItem>{pages.map((page, index) => <PaginationItem key={page} className="contents">{index > 0 && page - pages[index - 1] > 1 ? <PaginationEllipsis /> : null}<PaginationLink href={hrefForPage(page)} isActive={page === currentPage}>{page}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href={hrefForPage(Math.min(totalPages, currentPage + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} /></PaginationItem></PaginationContent></PaginationRoot>;
}
