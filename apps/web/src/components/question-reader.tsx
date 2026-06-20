"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
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
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2"><Link href="/questions"><ArrowLeft />Questions</Link></Button>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{question.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{question.course.name}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <Chip icon={<School className="size-3.5" />}>{question.department.shortName}</Chip>
          <Chip>{question.examType.name}</Chip>
          <Chip icon={<CalendarDays className="size-3.5" />}>{question.semester.name}</Chip>
        </div>
      </header>

      {!submissions.length ? (
        <div className="mt-8"><EmptyState icon={FileSearch} title="No submissions yet" description="This question exists, but no PDF has been added for it yet." /></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="order-2 xl:order-none">
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Submissions</h2></div>
              <div className="flex gap-2 overflow-x-auto p-3 xl:block xl:max-h-[calc(100vh-220px)] xl:space-y-2 xl:overflow-y-auto">
                {submissions.map((submission, index) => (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => select(submission)}
                    className={cn(
                      "w-60 shrink-0 rounded-xl border p-3 text-left transition xl:w-full",
                      submission.id === selected?.id
                        ? "border-primary/40 bg-primary/8 text-foreground"
                        : "border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold">Submission {index + 1}</span>
                      <span className="text-xs text-slate-400">{formatDate(submission.createdAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs">{[submission.batch, submission.section].filter(Boolean).join(" / ") || "General"}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section ref={viewer} className="min-w-0 overflow-hidden rounded-lg border bg-background fullscreen:rounded-none">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Submission {selectedIndex + 1} of {submissions.length}</p>
                <p className="text-xs text-muted-foreground">{selected ? formatDate(selected.createdAt) : ""}</p>
              </div>
              <div className="flex items-center gap-1">
                <IconButton label="Previous submission" disabled={selectedIndex <= 0} onClick={() => selectAt(selectedIndex - 1)}><ChevronLeft className="size-4" /></IconButton>
                <IconButton label="Next submission" disabled={selectedIndex >= submissions.length - 1} onClick={() => selectAt(selectedIndex + 1)}><ChevronRight className="size-4" /></IconButton>
                <IconButton label={fullscreen ? "Exit fullscreen" : "Open fullscreen"} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}</IconButton>
                {selected?.pdfUrl ? (
                  <Button asChild variant="ghost" size="icon"><a href={selected.pdfUrl} target="_blank" rel="noreferrer" aria-label="Download PDF"><Download /></a></Button>
                ) : null}
              </div>
            </div>
            {selected?.pdfUrl ? (
              <iframe title={`${question.title} PDF`} src={`${selected.pdfUrl}#toolbar=1&navpanes=0`} className={cn("h-[70vh] min-h-[560px] w-full bg-muted", fullscreen && "h-[calc(100vh-3.5rem)]")} />
            ) : (
              <div className="flex h-[70vh] min-h-[560px] items-center justify-center bg-slate-50 px-6 text-center text-sm text-muted-foreground">
                This PDF is not available yet. Watermark status: {selected?.watermarkStatus ?? "unknown"}.
              </div>
            )}
          </section>

          <aside className="order-3">
            <div className="rounded-lg border bg-card p-5">
              <h2 className="text-sm font-semibold">Submission details</h2>
              <dl className="mt-5 grid gap-4 text-sm">
                <div className="flex items-center gap-3"><Avatar><AvatarImage src={selected?.contributor?.image ?? undefined} /><AvatarFallback>{initials(selected?.contributor?.name)}</AvatarFallback></Avatar><Detail label="Contributor" value={selected?.contributor?.name ?? "Anonymous"} /></div>
                <Detail label="Batch / section" value={[selected?.batch, selected?.section].filter(Boolean).join(" / ") || "Not provided"} />
                <Detail label="File size" value={formatSize(selected?.fileSize ?? 0)} />
                <Detail label="Uploaded" value={selected ? formatDate(selected.createdAt) : "Unknown"} />
              </dl>
              {selected?.pdfUrl ? (
                <Button className="mt-6 w-full" asChild><a href={selected.pdfUrl} target="_blank" rel="noreferrer"><Download />Download PDF</a></Button>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-muted-foreground">{icon}{children}</span>;
}

function IconButton({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick}>{children}</Button>;
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div><dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{icon}{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

function initials(name?: string) { return (name ?? "A").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }

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
