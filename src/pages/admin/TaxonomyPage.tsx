import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { TaxonomyApi } from "../../api";
import type { SelectOption } from "../../types/api";
import { useTaxonomy } from "../../hooks/adminQueries";
import { useFilterOptions } from "../../hooks/queries";
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Button, Field, inputClass, labelClass } from "../../components/ui/form";
import { Modal } from "../../components/ui/Modal";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import {
  AdminHeader,
  ErrorBox,
  SearchInput,
  useDebouncedValue,
  usePageParam,
} from "./shared";

export type TaxonomyRow = {
  id: number;
  name: string;
  shortName?: string;
  departmentId?: number;
};

type TaxonomyField =
  | { kind: "text"; key: "name" | "shortName"; label: string }
  | { kind: "department"; key: "departmentId"; label: string };

export type TaxonomyConfig = {
  resource: string;
  api: TaxonomyApi;
  title: string;
  /** Lowercase singular noun, e.g. "department". */
  singular: string;
  description?: string;
  fields: TaxonomyField[];
  /** Courses filter/scope by department. */
  scopedByDepartment?: boolean;
};

function useDepartmentNames() {
  const { data } = useFilterOptions();
  return useMemo(() => {
    const map = new Map<number, string>();
    for (const d of data?.departments ?? []) map.set(d.id, d.shortName);
    return map;
  }, [data]);
}

export function TaxonomyPage({ config }: { config: TaxonomyConfig }) {
  const { page, setPage } = usePageParam();
  const [searchInput, setSearchInput] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const search = useDebouncedValue(searchInput);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [merging, setMerging] = useState<TaxonomyRow | null>(null);
  const deptNames = useDepartmentNames();
  const { data: options } = useFilterOptions();

  useEffect(() => {
    document.title = `${config.title} | Admin`;
  }, [config.title]);

  const { data, isPending, isError, error, isFetching } = useTaxonomy(
    config.resource,
    config.api,
    {
      page,
      perPage: 20,
      search: search || undefined,
      departmentId:
        config.scopedByDepartment && departmentId
          ? Number(departmentId)
          : undefined,
    }
  );

  const departmentOptions: SelectOption[] = (options?.departments ?? []).map(
    (d) => ({ value: String(d.id), label: `${d.name} (${d.shortName})` })
  );

  const columns: Column<TaxonomyRow>[] = [
    {
      header: "Name",
      cell: (r) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {r.name}
        </span>
      ),
    },
    ...(config.fields.some((f) => f.key === "shortName")
      ? [
          {
            header: "Short name",
            cell: (r: TaxonomyRow) => (
              <span className="text-gray-600 dark:text-gray-300">
                {r.shortName}
              </span>
            ),
          },
        ]
      : []),
    ...(config.scopedByDepartment
      ? [
          {
            header: "Department",
            cell: (r: TaxonomyRow) => (
              <span className="text-gray-600 dark:text-gray-300">
                {r.departmentId ? deptNames.get(r.departmentId) ?? "—" : "—"}
              </span>
            ),
          },
        ]
      : []),
    {
      header: "",
      cell: (r) => (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditing(r)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMerging(r)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Merge
          </button>
        </div>
      ),
      className: "text-right",
    },
  ];

  const rows = (data?.data ?? []) as TaxonomyRow[];

  return (
    <div>
      <AdminHeader
        title={config.title}
        description={
          config.description ??
          (data?.meta.total ? `${data.meta.total} ${config.resource}.` : undefined)
        }
        actions={
          <>
            <SearchInput value={searchInput} onChange={setSearchInput} />
            {config.scopedByDepartment && (
              <div className="w-48">
                <SearchableSelect
                  id={`${config.resource}-dept-filter`}
                  label="Department"
                  options={departmentOptions}
                  value={departmentId}
                  onChange={(v) => {
                    setDepartmentId(v);
                    setPage(1);
                  }}
                  placeholder="All departments"
                />
              </div>
            )}
            <Button onClick={() => setCreating(true)}>New</Button>
          </>
        }
      />

      {isError ? (
        <ErrorBox message={`Failed to load: ${error.message}`} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            isLoading={isPending}
            isFetching={isFetching}
            emptyMessage={`No ${config.resource} found.`}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      {creating && (
        <TaxonomyFormModal
          config={config}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <TaxonomyFormModal
          config={config}
          row={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {merging && (
        <MergeModal
          config={config}
          row={merging}
          onClose={() => setMerging(null)}
        />
      )}
    </div>
  );
}

function TaxonomyFormModal({
  config,
  row,
  onClose,
}: {
  config: TaxonomyConfig;
  row?: TaxonomyRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: options } = useFilterOptions();
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of config.fields) {
      const v = row?.[f.key];
      init[f.key] = v === undefined || v === null ? "" : String(v);
    }
    return init;
  });

  const departmentOptions: SelectOption[] = (options?.departments ?? []).map(
    (d) => ({ value: String(d.id), label: `${d.name} (${d.shortName})` })
  );

  const complete = config.fields.every((f) => form[f.key]?.trim());

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {};
      for (const f of config.fields) {
        payload[f.key] =
          f.kind === "department" ? Number(form[f.key]) : form[f.key].trim();
      }
      return row
        ? config.api.update(row.id, payload)
        : config.api.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", config.resource] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => config.api.remove(row!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", config.resource] });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={row ? `Edit ${config.singular}` : `New ${config.singular}`}
      footer={
        <>
          {row && (
            <Button
              variant="danger"
              className="mr-auto"
              loading={remove.isPending}
              onClick={() => {
                if (confirm(`Delete this ${config.singular}?`)) remove.mutate();
              }}
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            disabled={!complete}
            onClick={() => save.mutate()}
          >
            {row ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {config.fields.map((f) =>
          f.kind === "department" ? (
            <div key={f.key}>
              <span className={labelClass}>{f.label}</span>
              <SearchableSelect
                id={`tax-${f.key}`}
                label={f.label}
                options={departmentOptions}
                value={form[f.key]}
                onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
              />
            </div>
          ) : (
            <Field key={f.key} label={f.label} htmlFor={`tax-${f.key}`}>
              <input
                id={`tax-${f.key}`}
                value={form[f.key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                className={inputClass}
              />
            </Field>
          )
        )}
        {(save.isError || remove.isError) && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {((save.error || remove.error) as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}

function MergeModal({
  config,
  row,
  onClose,
}: {
  config: TaxonomyConfig;
  row: TaxonomyRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState("");

  // Load a large page to populate the merge-target picker.
  const { data } = useQuery({
    queryKey: ["admin", config.resource, "merge-options"],
    queryFn: () => config.api.list({ page: 1, perPage: 100 }),
  });

  const targetOptions: SelectOption[] = ((data?.data ?? []) as TaxonomyRow[])
    .filter((r) => r.id !== row.id)
    .map((r) => ({ value: String(r.id), label: r.name }));

  const merge = useMutation({
    mutationFn: () =>
      config.api.merge({
        keepId: Number(targetId),
        mergeIds: [row.id],
        dryRun: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", config.resource] });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Merge ${config.singular}`}
      description={`"${row.name}" will be merged into the ${config.singular} you pick, then removed. Its questions and submissions move over.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={merge.isPending}
            disabled={!targetId}
            onClick={() => merge.mutate()}
          >
            Merge
          </Button>
        </>
      }
    >
      <div>
        <span className={labelClass}>Keep this {config.singular}</span>
        <SearchableSelect
          id="merge-target"
          label={`Target ${config.singular}`}
          options={targetOptions}
          value={targetId}
          onChange={setTargetId}
          placeholder="Select target…"
        />
        {merge.isError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {(merge.error as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}
