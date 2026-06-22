"use client";

import { ArrowLeft, Pencil, Trash2, Upload, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { PageHeader, ResourceTable } from "@/components/admin/resource-table";
import { useAdminList } from "@/components/admin/use-admin-list";
import { useAdminQueryState } from "@/components/admin/use-admin-query-state";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
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
        onNew={() =>
          router.push(`/admin/questions/${params.id}/submissions/new`)
        }
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
              onClick={() =>
                router.push(
                  `/admin/questions/${params.id}/submissions/${item.id}/edit`,
                )
              }
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
