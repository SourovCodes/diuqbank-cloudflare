import { useEffect, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  downloadBackupDatabase,
  downloadBackupManifest,
  runBackup,
} from "../../api";
import type { BackupArtifact, BackupMeta } from "../../types/api";
import { useBackupMeta } from "../../hooks/adminQueries";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/form";
import { formatBytes } from "../../lib/format";
import {
  DatabaseIcon,
  DownloadIcon,
  FileTextIcon,
  type Icon,
} from "../../components/icons";
import { AdminHeader, ErrorBox } from "./shared";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

/** One backup artifact (files manifest or DB dump) with status + download. */
function ArtifactRow({
  icon: RowIcon,
  title,
  subtitle,
  artifact,
  onDownload,
  downloading,
  downloadError,
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  artifact: BackupArtifact;
  onDownload: () => void;
  downloading: boolean;
  downloadError: unknown;
}) {
  const ok = artifact.status === "ok";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <RowIcon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
        <Badge label={ok ? "OK" : "Failed"} variant={ok ? "green" : "red"} />
        <span className="w-16 text-right text-sm tabular-nums text-gray-500 dark:text-gray-400">
          {formatBytes(artifact.size)}
        </span>
        <Button
          variant="secondary"
          onClick={onDownload}
          loading={downloading}
          disabled={!ok}
          className="!px-3"
        >
          <DownloadIcon className="mr-1.5 h-4 w-4" />
          Download
        </Button>
      </div>
      {artifact.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {artifact.error}
        </p>
      )}
      {downloadError != null && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">
          Download failed: {errText(downloadError)}
        </p>
      )}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {children}
    </div>
  );
}

export default function AdminBackups() {
  useEffect(() => {
    document.title = "Backups | Admin";
  }, []);

  const qc = useQueryClient();
  const { data: meta, isPending, isError, error } = useBackupMeta();

  const run = useMutation({
    mutationFn: runBackup,
    onSuccess: (fresh: BackupMeta) =>
      qc.setQueryData(["admin", "backups"], fresh),
  });
  const dlManifest = useMutation({ mutationFn: downloadBackupManifest });
  const dlDatabase = useMutation({ mutationFn: downloadBackupDatabase });

  const runButton = (
    <Button onClick={() => run.mutate()} loading={run.isPending}>
      Run backup now
    </Button>
  );

  return (
    <div>
      <AdminHeader
        title="Backups"
        description="A snapshot is generated automatically every 6 hours. Each run rewrites a manifest of every referenced file and a full database SQL dump into a private bucket — downloadable only here."
        actions={runButton}
      />

      {run.isError && <ErrorBox message={errText(run.error)} />}

      {isPending ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Loading…
        </div>
      ) : isError ? (
        <ErrorBox message={errText(error)} />
      ) : meta === null ? (
        <Panel>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No backup has been generated yet. It will run automatically within
            the next 6 hours, or you can{" "}
            <button
              type="button"
              onClick={() => run.mutate()}
              disabled={run.isPending}
              className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60 dark:text-blue-400"
            >
              run it now
            </button>
            .
          </p>
        </Panel>
      ) : (
        <div className="space-y-6">
          <Panel>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Last generated
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {formatWhen(meta.generatedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Referenced files
                </dt>
                <dd className="mt-1 text-sm tabular-nums text-gray-900 dark:text-gray-100">
                  {meta.fileCount.toLocaleString()}
                </dd>
              </div>
            </dl>
          </Panel>

          <ArtifactRow
            icon={FileTextIcon}
            title="Files manifest"
            subtitle="JSON: download URL, folder, and name of every referenced R2 object."
            artifact={meta.manifest}
            onDownload={() => dlManifest.mutate()}
            downloading={dlManifest.isPending}
            downloadError={dlManifest.error}
          />
          <ArtifactRow
            icon={DatabaseIcon}
            title="Database backup"
            subtitle="Full D1 SQL dump (schema + data)."
            artifact={meta.database}
            onDownload={() => dlDatabase.mutate()}
            downloading={dlDatabase.isPending}
            downloadError={dlDatabase.error}
          />
        </div>
      )}
    </div>
  );
}
