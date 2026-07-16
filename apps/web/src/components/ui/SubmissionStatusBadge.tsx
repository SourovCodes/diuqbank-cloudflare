import { Badge } from "./Badge";
import type { AutoSubmission, ManualSubmission } from "../../types/api";

// Union of both pipelines' statuses: AI auto-submissions
// (processing/needs_review/failed) and manual submissions (pending).
type Status = AutoSubmission["status"] | ManualSubmission["status"];

const config: Record<Status, { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
  processing: { label: "Processing…", variant: "yellow" },
  needs_review: { label: "Needs review", variant: "yellow" },
  pending: { label: "Pending review", variant: "yellow" },
  published: { label: "Published", variant: "green" },
  rejected: { label: "Rejected", variant: "red" },
  failed: { label: "Failed", variant: "red" },
};

export function SubmissionStatusBadge({ status }: { status: Status }) {
  const { label, variant } = config[status] ?? { label: status, variant: "gray" };
  return <Badge label={label} variant={variant} />;
}
