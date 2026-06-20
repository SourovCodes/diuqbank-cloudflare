"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  FileSearch,
  Minimize2,
  School,
} from "lucide-react";
import type { PublicSubmission, QuestionDetail } from "@diuqbank/api-client";

import { EmptyState } from "@/components/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function QuestionReader({ question, submissions }: { question: QuestionDetail; submissions: PublicSubmission[] }) {
  const [selectedId, setSelectedId] = useState(submissions[0]?.id ?? null);
  const [fullscreen, setFullscreen] = useState(false);
  const viewer = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => submissions.find((submission) => submission.id === selectedId) ?? submissions[0] ?? null,
    [selectedId, submissions],
  );
  const selectedIndex = selected ? submissions.findIndex((item) => item.id === selected.id) : -1;

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === viewer.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const select = (submission: PublicSubmission) => {
    setSelectedId(submission.id);
    const hash = submission.id === submissions[0]?.id ? "" : `#submission=${submission.id}`;
    window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
  };

  const selectAt = (index: number) => {
    const submission = submissions[index];
    if (submission) select(submission);
  };

  const toggleFullscreen = async () => {
    if (!viewer.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewer.current.requestFullscreen();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/questions"><ArrowLeft />Questions</Link>
      </Button>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{question.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{question.course.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {question.submissionCount} {question.submissionCount === 1 ? "submission" : "submissions"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <School className="size-3.5" />{question.department.shortName}
          </span>
          <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {question.examType.name}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <Calendar className="size-3" />{question.semester.name}
          </span>
        </div>
      </header>

      {!submissions.length ? (
        <div className="mt-8">
          <EmptyState icon={FileSearch} title="No submissions yet" description="This question exists, but no PDF has been added for it yet." />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* PDF viewer — always first, hero element */}
          <section ref={viewer} className="order-1 min-w-0 overflow-hidden rounded-xl border bg-background fullscreen:rounded-none">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b bg-card px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  Submission {selectedIndex + 1} of {submissions.length}
                </p>
                <p className="text-xs text-muted-foreground">{selected ? formatDate(selected.createdAt) : ""}</p>
              </div>
              <div className="flex items-center gap-1">
                <IconButton label="Previous submission" disabled={selectedIndex <= 0} onClick={() => selectAt(selectedIndex - 1)}>
                  <ChevronLeft className="size-4" />
                </IconButton>
                <IconButton label="Next submission" disabled={selectedIndex >= submissions.length - 1} onClick={() => selectAt(selectedIndex + 1)}>
                  <ChevronRight className="size-4" />
                </IconButton>
                <Separator orientation="vertical" className="mx-1 h-5" />
                <IconButton label={fullscreen ? "Exit fullscreen" : "Open fullscreen"} onClick={() => void toggleFullscreen()}>
                  {fullscreen ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
                </IconButton>
                {selected?.pdfUrl ? (
                  <Button asChild variant="ghost" size="icon">
                    <a href={selected.pdfUrl} target="_blank" rel="noreferrer" aria-label="Download PDF"><Download /></a>
                  </Button>
                ) : null}
              </div>
            </div>
            {selected?.pdfUrl ? (
              <iframe
                title={`${question.title} PDF`}
                src={`${selected.pdfUrl}#toolbar=1&navpanes=0`}
                className={cn("h-[75vh] min-h-[600px] w-full bg-muted", fullscreen && "h-[calc(100vh-3.5rem)]")}
              />
            ) : (
              <div className="flex h-[75vh] min-h-[600px] items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">
                This PDF is not available yet. Watermark status: {selected?.watermarkStatus ?? "unknown"}.
              </div>
            )}
          </section>

          {/* Unified side panel */}
          <aside className="order-2 flex flex-col gap-4">
            <div className="rounded-xl border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Submissions</h2>
              </div>
              <ScrollArea className="xl:max-h-72">
                <div className="space-y-2 p-3">
                  {submissions.map((submission, index) => (
                    <button
                      key={submission.id}
                      type="button"
                      onClick={() => select(submission)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-all duration-150",
                        submission.id === selected?.id
                          ? "border-primary/40 bg-primary/8 text-foreground"
                          : "border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={submission.contributor?.image ?? undefined} />
                          <AvatarFallback className="text-[10px]">{initials(submission.contributor?.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">Submission {index + 1}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(submission.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs">
                            {[submission.batch, submission.section].filter(Boolean).join(" / ") || "General"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold">Details</h2>
              <div className="mt-4 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selected?.contributor?.image ?? undefined} />
                  <AvatarFallback>{initials(selected?.contributor?.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selected?.contributor?.name ?? "Anonymous"}</p>
                  {selected?.contributor?.username ? (
                    <p className="truncate text-xs text-muted-foreground">@{selected.contributor.username}</p>
                  ) : null}
                </div>
              </div>

              <dl className="mt-5 grid gap-4 text-sm">
                <Detail label="Batch / section" value={[selected?.batch, selected?.section].filter(Boolean).join(" / ") || "Not provided"} icon={<CalendarDays className="size-3.5" />} />
                <Detail label="File size" value={formatSize(selected?.fileSize ?? 0)} />
                <Detail label="Uploaded" value={selected ? formatDate(selected.createdAt) : "Unknown"} />
              </dl>

              {selected?.pdfUrl ? (
                <>
                  <Separator className="mt-6 mb-4" />
                  <Button className="w-full" asChild>
                    <a href={selected.pdfUrl} target="_blank" rel="noreferrer"><Download />Download PDF</a>
                  </Button>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function IconButton({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick}>{children}</Button>;
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{icon}{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function initials(name?: string) {
  return (name ?? "A").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp * 1000));
}

function formatSize(bytes: number) {
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
