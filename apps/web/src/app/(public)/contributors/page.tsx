import type { Metadata } from "next";
import { Users } from "lucide-react";

import { ContributorCard } from "@/components/contributor-card";
import { CustomPagination } from "@/components/custom-pagination";
import { EmptyState } from "@/components/empty-state";
import { getContributors } from "@/lib/api/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contributors",
  description: "The people who have shared question papers with the DIU Question Bank.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const positiveInt = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export default async function ContributorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const page = positiveInt(raw.page) ?? 1;

  const contributors = await getContributors({ page, perPage: 12 });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Contributors</h1>
        <p className="mt-2 text-muted-foreground">The people who have shared question papers, most prolific first.</p>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>{contributors.meta.total} contributor{contributors.meta.total === 1 ? "" : "s"}</p>
        <p>Page {contributors.meta.page} of {contributors.meta.totalPages}</p>
      </div>

      {contributors.data.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contributors.data.map((contributor) => <ContributorCard key={contributor.id} contributor={contributor} />)}
        </div>
      ) : (
        <div className="mt-5"><EmptyState icon={Users} title="No contributors yet" description="Once someone submits a question paper, they'll show up here." /></div>
      )}

      <CustomPagination currentPage={contributors.meta.page} totalPages={contributors.meta.totalPages} />
    </div>
  );
}
