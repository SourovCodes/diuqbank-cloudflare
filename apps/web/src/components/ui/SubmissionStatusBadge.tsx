import { Badge } from "./Badge";
import type { AutoSubmission } from "../../types/api";

type Status = AutoSubmission["status"];

const config: Record<Status, { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
  processing: { label: "Processing…", variant: "yellow" },
  needs_review: { label: "Needs review", variant: "yellow" },
  published: { label: "Published", variant: "green" },
  rejected: { label: "Rejected", variant: "red" },
  failed: { label: "Failed", variant: "red" },
};

export function SubmissionStatusBadge({ status }: { status: Status }) {
  const { label, variant } = config[status] ?? { label: status, variant: "gray" };
  return <Badge label={label} variant={variant} />;
}
