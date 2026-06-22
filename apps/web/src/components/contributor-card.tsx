import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { Contributor } from "@diuqbank/api-client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  return (name || "A")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ContributorCard({ contributor }: { contributor: Contributor }) {
  return (
    <Link href={`/contributors/${contributor.username}`} className="group block">
      <article className="relative h-full overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 shrink-0">
            {contributor.image ? <AvatarImage src={contributor.image} alt={contributor.name} /> : null}
            <AvatarFallback>{initials(contributor.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold transition-colors group-hover:text-primary">{contributor.name}</h2>
            <p className="truncate text-sm text-muted-foreground">@{contributor.username}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <FileText className="mr-1.5 size-3.5" />
          {contributor.submissionCount} {contributor.submissionCount === 1 ? "submission" : "submissions"}
        </div>
        <span className="absolute top-4 right-4 flex size-6 items-center justify-center rounded-full bg-primary/10 opacity-0 transition group-hover:opacity-100">
          <ArrowRight className="size-3 text-primary" />
        </span>
      </article>
    </Link>
  );
}
