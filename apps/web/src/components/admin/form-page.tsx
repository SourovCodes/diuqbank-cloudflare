"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/admin/resource-table";
import { Button } from "@/components/ui/button";

/**
 * Shared shell for the dedicated create/edit pages (questions, submissions): a back
 * link, the page heading, and a card that frames the form. Keeps the form pages thin
 * and visually consistent with the list pages.
 */
export function FormPage({
  backHref,
  backLabel,
  title,
  description,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      </Button>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border bg-card p-6">{children}</div>
    </>
  );
}
