"use client";

import type { Department } from "@diuqbank/api-client";
import { Building2 } from "lucide-react";
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
import { departmentsClient } from "@/lib/api/admin-client";

export default function DepartmentsPage() {
  const { token } = useAuth();
  const { page, search, setSearch } = useAdminQueryState();
  const { items, meta, loading, error, refetch } = useAdminList(
    departmentsClient,
    { page, search },
  );

  const [editing, setEditing] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Departments"
        description="Academic departments that courses and questions belong to."
      />
      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search departments…"
        onNew={() => {
          setEditing(null);
          setOpen(true);
        }}
        newLabel="New department"
      />
      <ResourceTable<Department>
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
          { header: "Short name", cell: (item) => item.shortName },
        ]}
        actions={(item) => (
          <RowActions
            onEdit={() => {
              setEditing(item);
              setOpen(true);
            }}
            onDelete={() => departmentsClient.remove(token!, item.id)}
            onDeleted={refetch}
            deleteTitle={`Delete "${item.name}"?`}
            deleteDescription="Departments with courses or questions cannot be deleted."
          />
        )}
        emptyIcon={Building2}
        emptyTitle="No departments"
        emptyDescription="Create your first department to get started."
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit department" : "New department"}
      >
        <DepartmentForm
          department={editing}
          onDone={() => {
            setOpen(false);
            refetch();
          }}
        />
      </FormDialog>
    </>
  );
}

function DepartmentForm({
  department,
  onDone,
}: {
  department: Department | null;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(department?.name ?? "");
  const [shortName, setShortName] = useState(department?.shortName ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), shortName: shortName.trim() };
      if (department) {
        await departmentsClient.update(token, department.id, payload);
        toast.success("Department updated");
      } else {
        await departmentsClient.create(token, payload);
        toast.success("Department created");
      }
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
          placeholder="Computer Science & Engineering"
          maxLength={100}
          required
          autoFocus
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="shortName">Short name</Label>
        <Input
          id="shortName"
          value={shortName}
          onChange={(event) => setShortName(event.target.value)}
          placeholder="CSE"
          maxLength={20}
          required
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
