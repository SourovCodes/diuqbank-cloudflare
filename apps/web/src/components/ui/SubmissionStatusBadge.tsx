import { Badge } from "./Badge";
import type { ManualSubmission } from "../../types/api";

type Status = ManualSubmission["status"];

const config: Record<Status, { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
  pending: { label: "Pending review", variant: "yellow" },
  published: { label: "Published", variant: "green" },
  rejected: { label: "Rejected", variant: "red" },
};

export function SubmissionStatusBadge({ status }: { status: Status }) {
  const { label, variant } = config[status] ?? { label: status, variant: "gray" };
  return <Badge label={label} variant={variant} />;
}
