"use client";

import { Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { UserPicker } from "@/components/admin/user-picker";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  type AdminSubmission,
  submissionsClient,
} from "@/lib/api/admin-client";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Create/edit form for a question's PDF submission — its own page rather than a dialog,
 * to give the file upload and the contributor picker room to breathe. Seeds state from
 * `submission` at mount (fresh per navigation, so no reset effect needed).
 */
export function SubmissionForm({
  submission,
  questionId,
  backHref,
}: {
  submission: AdminSubmission | null;
  questionId: number;
  backHref: string;
}) {
  const { token } = useAuth();
  const router = useRouter();
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
      router.push(backHref);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-5">
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
      <div className="flex justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href={backHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
