"use client";

import type { LucideIcon } from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";

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

export type Column<Item> = {
  header: React.ReactNode;
  cell: (item: Item) => React.ReactNode;
  className?: string;
};

/** Page title + optional description, shared across admin resource pages. */
export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
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
  rowKey,
  actions,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  columns: Column<Item>[];
  items: Item[];
  loading: boolean;
  error: string | null;
  meta: { page: number; totalPages: number } | null;
  rowKey: (item: Item) => string | number;
  actions?: (item: Item) => React.ReactNode;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const colSpan = columns.length + (actions ? 1 : 0);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <Card className="overflow-hidden py-0">
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
                {loading
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
                      <TableRow key={rowKey(item)}>
                        {columns.map((column, index) => (
                          <TableCell key={index} className={column.className}>
                            {column.cell(item)}
                          </TableCell>
                        ))}
                        {actions ? (
                          <TableCell className="text-right">
                            {actions(item)}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {meta ? (
        <CustomPagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
        />
      ) : null}
    </div>
  );
}
