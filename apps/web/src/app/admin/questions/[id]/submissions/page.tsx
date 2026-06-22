"use client";

import { ArrowLeft, Pencil, Trash2, Upload, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { FormDialog } from "@/components/admin/form-dialog";
import { PageHeader, ResourceTable } from "@/components/admin/resource-table";
import { useAdminList } from "@/components/admin/use-admin-list";
import { useAdminQueryState } from "@/components/admin/use-admin-query-state";
import { UserPicker } from "@/components/admin/user-picker";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  type AdminQuestion,
  type AdminSubmission,
  questionsClient,
  submissionsClient,
} from "@/lib/api/admin-client";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

export default function QuestionSubmissionsPage() {
  const params = useParams<{ id: string }>();
  const questionId = Number(params.id);
  const { token } = useAuth();
  const { page } = useAdminQueryState();
  const { items, meta, loading, error, refetch } = useAdminList(
    submissionsClient,
    { page, questionId },
  );

  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  useEffect(() => {
    if (!token || !Number.isFinite(questionId)) return;
    let active = true;
    questionsClient
      .get(token, questionId)
      .then((data) => {
        if (active) setQuestion(data);
      })
      .catch(() => {
        /* header just falls back to a generic title */
      });
    return () => {
      active = false;
    };
  }, [token, questionId]);

  const [editing, setEditing] = useState<AdminSubmission | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link href="/admin/questions">
          <ArrowLeft className="size-4" />
          Back to questions
        </Link>
      </Button>
      <PageHeader
        title={question ? question.title : "Submissions"}
        description="PDF submissions for this question."
      />
      <AdminToolbar
        onNew={() => {
          setEditing(null);
          setOpen(true);
        }}
        newLabel="New submission"
      />
      <ResourceTable<AdminSubmission>
        items={items}
        loading={loading}
        error={error}
        meta={meta}
        currentPage={page}
        rowKey={(item) => item.id}
        columns={[
          {
            header: "Contributor",
            cell: (item) =>
              item.contributor ? (
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    {item.contributor.image ? (
                      <AvatarImage
                        src={item.contributor.image}
                        alt={item.contributor.name}
                      />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {initials(item.contributor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium">{item.contributor.name}</span>
                    <span className="text-xs text-muted-foreground">
                      @{item.contributor.username}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">Anonymous</span>
              ),
          },
          { header: "Section", cell: (item) => item.section ?? "—" },
          { header: "Batch", cell: (item) => item.batch ?? "—" },
          {
            header: "Size",
            cell: (item) => formatBytes(item.fileSize),
          },
          {
            header: "Watermark",
            cell: (item) => <WatermarkBadge status={item.watermarkStatus} />,
          },
          {
            header: "PDF",
            cell: (item) => (
              <div className="flex flex-col gap-0.5 text-xs">
                {item.pdfUrl ? (
                  <a
                    href={item.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    View original
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                {item.watermarkedPdfUrl ? (
                  <a
                    href={item.watermarkedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Watermarked
                  </a>
                ) : null}
              </div>
            ),
          },
        ]}
        actions={(item) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(item);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <ReplacePdfButton submissionId={item.id} onReplaced={refetch} />
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
              title="Delete this submission?"
              description="The PDF will be removed permanently."
              onConfirm={() => submissionsClient.remove(token!, item.id)}
              onDeleted={refetch}
            />
          </div>
        )}
        emptyIcon={Users}
        emptyTitle="No submissions yet"
        emptyDescription="Upload the first PDF submission for this question."
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit submission" : "New submission"}
      >
        <SubmissionForm
          submission={editing}
          questionId={questionId}
          onDone={() => {
            setOpen(false);
            refetch();
          }}
        />
      </FormDialog>
    </>
  );
}

function ReplacePdfButton({
  submissionId,
  onReplaced,
}: {
  submissionId: number;
  onReplaced: () => void;
}) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const replace = async (file: File | undefined) => {
    if (!file || !token) return;
    if (file.type !== "application/pdf") {
      toast.error("Choose a PDF file");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error("PDFs must be 20 MB or smaller");
      return;
    }
    setBusy(true);
    try {
      await submissionsClient.replacePdf(token, submissionId, file);
      toast.success("PDF replaced — re-watermarking");
      onReplaced();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Replace failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(event) => void replace(event.target.files?.[0])}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title="Replace PDF"
      >
        {busy ? <Spinner className="size-4" /> : <Upload className="size-4" />}
        <span className="sr-only">Replace PDF</span>
      </Button>
    </>
  );
}

function SubmissionForm({
  submission,
  questionId,
  onDone,
}: {
  submission: AdminSubmission | null;
  questionId: number;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const isEdit = submission !== null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [contributor, setContributor] = useState(submission?.contributor ?? null);
  const [section, setSection] = useState(submission?.section ?? "");
  const [batch, setBatch] = useState(submission?.batch ?? "");
  const [watermarkStatus, setWatermarkStatus] = useState<
    AdminSubmission["watermarkStatus"]
  >(submission?.watermarkStatus ?? "awaiting");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!isEdit && !pdf) {
      toast.error("Choose a PDF file");
      return;
    }
    if (pdf && pdf.size > MAX_PDF_BYTES) {
      toast.error("PDFs must be 20 MB or smaller");
      return;
    }
    if (!contributor) {
      toast.error("Choose a contributor");
      return;
    }
    setBusy(true);
    try {
      if (submission) {
        await submissionsClient.update(token, submission.id, {
          userId: contributor.id,
          section: section.trim() || null,
          batch: batch.trim() || null,
          watermarkStatus,
        });
        toast.success("Submission updated");
      } else {
        await submissionsClient.create(token, {
          pdf: pdf!,
          questionId,
          userId: contributor.id,
          section: section.trim() || undefined,
          batch: batch.trim() || undefined,
        });
        toast.success("Submission added");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      {!isEdit ? (
        <div className="grid gap-2">
          <Label>PDF file</Label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(event) => setPdf(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            className="justify-start font-normal"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            <span className="truncate">{pdf ? pdf.name : "Choose a PDF…"}</span>
          </Button>
          <p className="text-xs text-muted-foreground">PDF only, up to 20 MB.</p>
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label>Contributor</Label>
        <UserPicker selected={contributor} onChange={setContributor} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="section">Section</Label>
        <Input
          id="section"
          value={section}
          onChange={(event) => setSection(event.target.value)}
          maxLength={100}
          placeholder="e.g. A"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="batch">Batch</Label>
        <Input
          id="batch"
          value={batch}
          onChange={(event) => setBatch(event.target.value)}
          maxLength={100}
          placeholder="e.g. 61"
        />
      </div>
      {isEdit ? (
        <div className="grid gap-2">
          <Label htmlFor="watermarkStatus">Watermark status</Label>
          <NativeSelect
            id="watermarkStatus"
            value={watermarkStatus}
            onChange={(event) =>
              setWatermarkStatus(
                event.target.value as AdminSubmission["watermarkStatus"],
              )
            }
            className="w-full"
          >
            <option value="awaiting">Awaiting</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </NativeSelect>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
