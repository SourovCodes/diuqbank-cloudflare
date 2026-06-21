"use client";

import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { FormDialog } from "@/components/admin/form-dialog";
import {
  PageHeader,
  ResourceTable,
  RowActions,
} from "@/components/admin/resource-table";
import { useAdminList } from "@/components/admin/use-admin-list";
import { useAdminQueryState } from "@/components/admin/use-admin-query-state";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResourceClient } from "@/lib/api/admin-client";

type NameItem = { id: number; name: string };

/**
 * Full CRUD page for a resource whose only editable field is `name` (semesters,
 * exam types). Courses/departments have extra fields and ship their own pages.
 */
export function NameResourcePage<Item extends NameItem>({
  client,
  title,
  description,
  singular,
  emptyIcon,
  placeholder,
  deleteDescription,
}: {
  client: ResourceClient<Item, { name: string }, { name?: string }>;
  title: string;
  description: string;
  singular: string;
  emptyIcon: LucideIcon;
  placeholder?: string;
  deleteDescription?: string;
}) {
  const { token } = useAuth();
  const { page, search, setSearch } = useAdminQueryState();
  const { items, meta, loading, error, refetch } = useAdminList(client, {
    page,
    search,
  });

  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader title={title} description={description} />
      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder={`Search ${title.toLowerCase()}…`}
        onNew={() => {
          setEditing(null);
          setOpen(true);
        }}
        newLabel={`New ${singular}`}
      />
      <ResourceTable<Item>
        items={items}
        loading={loading}
        error={error}
        meta={meta}
        currentPage={page}
        rowKey={(item) => item.id}
        columns={[
          {
            header: "Name",
            cell: (item) => <span className="font-medium">{item.name}</span>,
          },
        ]}
        actions={(item) => (
          <RowActions
            onEdit={() => {
              setEditing(item);
              setOpen(true);
            }}
            onDelete={() => client.remove(token!, item.id)}
            onDeleted={refetch}
            deleteTitle={`Delete "${item.name}"?`}
            deleteDescription={deleteDescription}
          />
        )}
        emptyIcon={emptyIcon}
        emptyTitle={`No ${title.toLowerCase()}`}
        emptyDescription={`Create your first ${singular} to get started.`}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${singular}` : `New ${singular}`}
      >
        <NameForm
          item={editing}
          singular={singular}
          placeholder={placeholder}
          onSubmit={async (name) => {
            if (!token) return;
            if (editing) await client.update(token, editing.id, { name });
            else await client.create(token, { name });
          }}
          onDone={() => {
            setOpen(false);
            refetch();
          }}
        />
      </FormDialog>
    </>
  );
}

function NameForm({
  item,
  singular,
  placeholder,
  onSubmit,
  onDone,
}: {
  item: NameItem | null;
  singular: string;
  placeholder?: string;
  onSubmit: (name: string) => Promise<void>;
  onDone: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [busy, setBusy] = useState(false);
  const noun = singular.charAt(0).toUpperCase() + singular.slice(1);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit(name.trim());
      toast.success(item ? `${noun} updated` : `${noun} created`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={placeholder}
          maxLength={100}
          required
          autoFocus
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
