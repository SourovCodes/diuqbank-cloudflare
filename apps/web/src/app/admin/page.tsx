"use client";

import {
  Building2,
  CalendarDays,
  FileQuestion,
  Files,
  FileText,
  GraduationCap,
  Plus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/admin/resource-table";
import { type AdminCounts, useAdminCounts } from "@/components/admin/use-admin-counts";
import { useAdminList } from "@/components/admin/use-admin-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type AdminSubmission, submissionsClient } from "@/lib/api/admin-client";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const statCards: {
  key: keyof AdminCounts;
  label: string;
  icon: LucideIcon;
  href?: string;
}[] = [
  { key: "questions", label: "Questions", icon: FileQuestion, href: "/admin/questions" },
  { key: "submissions", label: "Submissions", icon: Files },
  { key: "users", label: "Users", icon: Users, href: "/admin/users" },
  { key: "departments", label: "Departments", icon: Building2, href: "/admin/departments" },
  { key: "courses", label: "Courses", icon: GraduationCap, href: "/admin/courses" },
  { key: "semesters", label: "Semesters", icon: CalendarDays, href: "/admin/semesters" },
  { key: "examTypes", label: "Exam types", icon: FileText, href: "/admin/exam-types" },
];

function StatCard({
  label,
  icon: Icon,
  value,
  href,
}: {
  label: string;
  icon: LucideIcon;
  value: number | null | undefined;
  href?: string;
}) {
  const body = (
    <Card
      className={href ? "transition-colors hover:bg-muted/50" : undefined}
      size="sm"
    >
      <CardContent className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          {value === undefined ? (
            <Skeleton className="mt-1 h-6 w-10" />
          ) : (
            <span className="text-2xl font-semibold tracking-tight">
              {value === null ? "—" : value.toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function WatermarkBadge({
  status,
}: {
  status: AdminSubmission["watermarkStatus"];
}) {
  if (status === "completed")
    return (
      <Badge className="border-transparent bg-green-600/15 text-green-700 dark:text-green-400">
        Completed
      </Badge>
    );
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">Awaiting</Badge>;
}

export default function AdminDashboardPage() {
  const { counts, loading: countsLoading } = useAdminCounts();
  const { items: recent, loading: recentLoading } = useAdminList(
    submissionsClient,
    { perPage: 5 },
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of the question bank."
        actions={
          <Button asChild>
            <Link href="/admin/questions/new">
              <Plus className="size-4" />
              New question
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            icon={card.icon}
            href={card.href}
            value={countsLoading ? undefined : (counts?.[card.key] ?? null)}
          />
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h2 className="mb-2 text-sm font-semibold">Recent submissions</h2>
          {recentLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No submissions yet.
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((submission) => (
                <li key={submission.id}>
                  <Link
                    href={`/admin/questions/${submission.question.id}/submissions`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="size-8">
                      {submission.contributor?.image ? (
                        <AvatarImage
                          src={submission.contributor.image}
                          alt={submission.contributor.name}
                        />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {submission.contributor
                          ? initials(submission.contributor.name)
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-sm font-medium">
                        {submission.question.title}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {submission.contributor?.name ?? "Anonymous"} ·{" "}
                        {new Date(
                          submission.createdAt * 1000,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <WatermarkBadge status={submission.watermarkStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
