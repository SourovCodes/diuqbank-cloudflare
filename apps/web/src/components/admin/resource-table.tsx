"use client";

import type { LucideIcon } from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { CustomPagination } from "@/components/custom-pagination";
import { EmptyState } from "@/components/empty-state";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<Item> = {
  header: React.ReactNode;
  cell: (item: Item) => React.ReactNode;
  className?: string;
};

/** Page title + optional description and right-aligned actions, shared across pages. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** Edit + delete buttons for a table row. */
export function RowActions({
  onEdit,
  onDelete,
  onDeleted,
  deleteTitle,
  deleteDescription,
}: {
  onEdit: () => void;
  onDelete: () => Promise<unknown>;
  onDeleted: () => void;
  deleteTitle?: string;
  deleteDescription?: string;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-sm" onClick={onEdit}>
        <Pencil className="size-4" />
        <span className="sr-only">Edit</span>
      </Button>
      <DeleteConfirm
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Delete</span>
          </Button>
        }
        title={deleteTitle}
        description={deleteDescription}
        onConfirm={onDelete}
        onDeleted={onDeleted}
      />
    </div>
  );
}

/**
 * Card-wrapped table with built-in loading / empty / error states and URL-driven
 * pagination. Keeps the resource pages thin — they supply columns, rows, and a
 * per-row actions cell.
 */
export function ResourceTable<Item>({
  columns,
  items,
  loading,
  error,
  meta,
  currentPage,
  rowKey,
  actions,
  onRowClick,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  columns: Column<Item>[];
  items: Item[];
  loading: boolean;
  error: string | null;
  meta: { page: number; perPage: number; total: number; totalPages: number } | null;
  currentPage: number;
  rowKey: (item: Item) => string | number;
  actions?: (item: Item) => React.ReactNode;
  /** Click anywhere on a row (except on a link/button/control) to act on it. */
  onRowClick?: (item: Item) => void;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const colSpan = columns.length + (actions ? 1 : 0);
  // `meta` is set only by a successful response, so `meta === null` means nothing has
  // loaded yet → show skeletons. Once data exists, a `loading` pass is a refetch
  // (pagination / search / reload): keep the old rows and just dim them, so the page
  // doesn't flash back to skeletons every time.
  const firstLoad = loading && meta === null;
  const refetching = loading && meta !== null;
  const showEmpty = !loading && items.length === 0;

  // If the current page falls past the last page — e.g. you deleted the last row on a
  // page, or landed on a stale `?page=` — snap back to the last valid page instead of
  // showing a misleading empty state. `replace` so it doesn't add history.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!meta || currentPage <= meta.totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(meta.totalPages));
    router.replace(`${pathname}?${params}`, { scroll: false });
  }, [meta, currentPage, router, pathname, searchParams]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <Card
          aria-busy={refetching}
          className={cn(
            "overflow-hidden py-0 transition-opacity",
            refetching && "pointer-events-none opacity-60",
          )}
        >
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column, index) => (
                    <TableHead key={index} className={column.className}>
                      {column.header}
                    </TableHead>
                  ))}
                  {actions ? (
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {firstLoad
                  ? Array.from({ length: 5 }).map((_, rowIndex) => (
                      <TableRow key={`skeleton-${rowIndex}`}>
                        {Array.from({ length: colSpan }).map((__, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton className="h-5 w-full max-w-[180px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : items.map((item) => (
                      <TableRow
                        key={rowKey(item)}
                        className={cn(
                          "group",
                          onRowClick && "cursor-pointer",
                        )}
                        onClick={
                          onRowClick
                            ? (event) => {
                                // Don't hijack clicks meant for a link, button or
                                // control inside the row.
                                if (
                                  (event.target as HTMLElement).closest(
                                    "a, button, input, select, label, [role='button']",
                                  )
                                ) {
                                  return;
                                }
                                onRowClick(item);
                              }
                            : undefined
                        }
                      >
                        {columns.map((column, index) => (
                          <TableCell key={index} className={column.className}>
                            {column.cell(item)}
                          </TableCell>
                        ))}
                        {actions ? (
                          <TableCell className="text-right">
                            <div className="flex justify-end opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                              {actions(item)}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {meta && !showEmpty ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.perPage + 1}–
            {Math.min(meta.page * meta.perPage, meta.total)} of {meta.total}
          </p>
          {meta.totalPages > 1 ? (
            <CustomPagination
              currentPage={currentPage}
              totalPages={meta.totalPages}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
