import { Badge } from "./Badge";
import type { AutoSubmission, ManualSubmission } from "../../types/api";

type Status = ManualSubmission["status"] | AutoSubmission["status"];

const config: Record<Status, { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
  pending_review: { label: "Pending review", variant: "yellow" },
  processing: { label: "Processing…", variant: "yellow" },
  needs_review: { label: "Needs review", variant: "yellow" },
  approved: { label: "Approved", variant: "green" },
  published: { label: "Published", variant: "green" },
  rejected: { label: "Rejected", variant: "red" },
  failed: { label: "Failed", variant: "red" },
};

export function SubmissionStatusBadge({ status }: { status: Status }) {
  const { label, variant } = config[status] ?? { label: status, variant: "gray" };
  return <Badge label={label} variant={variant} />;
}
