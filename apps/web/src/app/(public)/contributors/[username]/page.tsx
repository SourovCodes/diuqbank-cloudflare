import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, FileSearch, FileText } from "lucide-react";

import { ContributorSubmissionCard } from "@/components/contributor-submission-card";
import { CustomPagination } from "@/components/custom-pagination";
import { EmptyState } from "@/components/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getContributor, getContributorSubmissions } from "@/lib/api/server";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
};

const positiveInt = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const contributor = await getContributor(username);
  return contributor
    ? { title: contributor.name, description: `Question papers shared by ${contributor.name} (@${contributor.username}).` }
    : { title: "Contributor not found" };
}

export default async function ContributorPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const page = positiveInt((await searchParams).page) ?? 1;

  const [contributor, submissions] = await Promise.all([
    getContributor(username),
    getContributorSubmissions(username, { page, perPage: 12 }),
  ]);

  if (!contributor || !submissions) notFound();

  return (
    <div className="container mx-auto px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/contributors"><ArrowLeft />Contributors</Link>
      </Button>

      <header className="mb-8 flex items-center gap-4">
        <Avatar className="size-16">
          {contributor.image ? <AvatarImage src={contributor.image} alt={contributor.name} /> : null}
          <AvatarFallback className="text-lg">{initials(contributor.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{contributor.name}</h1>
          <p className="text-sm text-muted-foreground">@{contributor.username}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" />
              {contributor.submissionCount} {contributor.submissionCount === 1 ? "submission" : "submissions"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              Joined {formatDate(contributor.createdAt)}
            </span>
          </div>
        </div>
      </header>

      {submissions.data.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.data.map((submission) => <ContributorSubmissionCard key={submission.id} submission={submission} />)}
        </div>
      ) : (
        <div className="mt-5"><EmptyState icon={FileSearch} title="No submissions yet" description="This contributor hasn't shared any question papers." /></div>
      )}

      <CustomPagination currentPage={submissions.meta.page} totalPages={submissions.meta.totalPages} />
    </div>
  );
}

function initials(name: string) {
  return (name || "A").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp * 1000));
}
