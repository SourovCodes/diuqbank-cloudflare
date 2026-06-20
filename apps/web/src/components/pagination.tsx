import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  currentPage,
  totalPages,
  hrefForPage,
}: {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from(
    new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]),
  ).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);

  return (
    <nav aria-label="Question pages" className="mt-8 flex items-center justify-center gap-1.5">
      <PageLink href={hrefForPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} label="Previous page">
        <ChevronLeft className="size-4" />
      </PageLink>
      {pages.map((page, index) => (
        <span key={page} className="contents">
          {index > 0 && page - pages[index - 1] > 1 ? <span className="px-1 text-slate-400">…</span> : null}
          <Link
            href={hrefForPage(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`flex size-10 items-center justify-center rounded-xl text-sm font-semibold transition ${page === currentPage ? "bg-primary text-white" : "border bg-white text-slate-600 hover:border-blue-200 hover:text-primary"}`}
          >
            {page}
          </Link>
        </span>
      ))}
      <PageLink href={hrefForPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} label="Next page">
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <span aria-disabled="true" className="flex size-10 items-center justify-center rounded-xl border bg-slate-50 text-slate-300">{children}</span>;
  return <Link href={href} aria-label={label} className="flex size-10 items-center justify-center rounded-xl border bg-white text-slate-600 transition hover:border-blue-200 hover:text-primary">{children}</Link>;
}
