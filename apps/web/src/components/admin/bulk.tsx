import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Field, inputClass } from "../ui/form";
import { Modal } from "../ui/Modal";

export type BulkFailure = { id: number; message: string };
export type BulkResult = { action: string; succeeded: number; failed: BulkFailure[] };

// Runs sequentially on purpose: parallel writes can race on D1 unique
// constraints (e.g. taxonomy find-or-create while approving several
// submissions of the same course at once).
async function runBulk(
  action: string,
  ids: number[],
  fn: (id: number) => Promise<unknown>
): Promise<BulkResult> {
  const failed: BulkFailure[] = [];
  let succeeded = 0;
  for (const id of ids) {
    try {
      await fn(id);
      succeeded += 1;
    } catch (err) {
      failed.push({
        id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { action, succeeded, failed };
}

/**
 * Selection state + a runner that fans an action out over the selected ids.
 * After a run, only the failed rows stay selected so a retry targets just
 * them; the listed query keys are invalidated either way.
 */
// eslint-disable-next-line react/only-export-components -- hook co-located with BulkBar, which consumes its return value
export function useBulkActions(queryKeys: unknown[][]) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  async function run(action: string, fn: (id: number) => Promise<unknown>) {
    if (running || selected.size === 0) return;
    setRunning(action);
    setResult(null);
    const res = await runBulk(action, [...selected], fn);
    for (const key of queryKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    setSelected(new Set(res.failed.map((f) => f.id)));
    setRunning(null);
    setResult(res);
  }

  function onSelectionChange(next: Set<number>) {
    setSelected(next);
    if (result) setResult(null);
  }

  function clear() {
    setSelected(new Set());
    setResult(null);
  }

  return { selected, onSelectionChange, run, running, result, clear };
}

type BulkBarProps = {
  bulk: ReturnType<typeof useBulkActions>;
  /** Action buttons; render <BulkButton> children. */
  children: ReactNode;
};

/** Toolbar shown above a selectable table while rows are selected. */
export function BulkBar({ bulk, children }: BulkBarProps) {
  const { selected, running, result, clear } = bulk;
  if (selected.size === 0 && !result) return null;

  return (
    <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 dark:border-blue-500/30 dark:bg-blue-500/10">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-semibold text-blue-800 dark:text-blue-200">
            {selected.size} selected
          </span>
          {children}
          <button
            type="button"
            onClick={clear}
            disabled={!!running}
            className="ml-auto text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-60 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear selection
          </button>
        </div>
      )}
      {result && (
        <div className={selected.size > 0 ? "mt-2" : undefined}>
          {result.succeeded > 0 && (
            <p className="text-sm text-green-700 dark:text-green-300">
              {result.action}: {result.succeeded} succeeded.
            </p>
          )}
          {result.failed.length > 0 && (
            <div className="text-sm text-red-700 dark:text-red-300">
              <p>
                {result.action}: {result.failed.length} failed (still selected
                for retry):
              </p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {result.failed.map((f) => (
                  <li key={f.id}>
                    #{f.id} — {f.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Collects one rejection reason to apply to every selected submission. */
export function BulkRejectModal({
  open,
  count,
  onClose,
  onSubmit,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reject ${count} submission${count === 1 ? "" : "s"}`}
      description="Every selected submission gets this reason; the submitters will see it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!reason.trim()}
            onClick={() => {
              onSubmit(reason.trim());
              setReason("");
            }}
          >
            Reject
          </Button>
        </>
      }
    >
      <Field label="Reason">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="e.g. Not a question paper, duplicate…"
        />
      </Field>
    </Modal>
  );
}

type BulkButtonProps = {
  label: string;
  bulk: ReturnType<typeof useBulkActions>;
  onClick: () => void;
  variant?: "default" | "danger";
};

export function BulkButton({
  label,
  bulk,
  onClick,
  variant = "default",
}: BulkButtonProps) {
  const isRunning = bulk.running === label;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!bulk.running}
      className={
        variant === "danger"
          ? "rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
          : "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      }
    >
      {isRunning ? "Working…" : label}
    </button>
  );
}
