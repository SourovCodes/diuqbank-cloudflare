"use client";

import type { Course, FilterOptions } from "@diuqbank/api-client";
import { GraduationCap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { EntityPicker } from "@/components/admin/entity-picker";
import { FormSheet } from "@/components/admin/form-sheet";
import {
  PageHeader,
  ResourceTable,
  RowActions,
} from "@/components/admin/resource-table";
import { useAdminList } from "@/components/admin/use-admin-list";
import { useAdminQueryState } from "@/components/admin/use-admin-query-state";
import { useFilterOptions } from "@/components/admin/use-filter-options";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { coursesClient } from "@/lib/api/admin-client";

type DepartmentOption = FilterOptions["departments"][number];

export default function CoursesPage() {
  const { token } = useAuth();
  const { page, search, setSearch, getFilter, setFilter } =
    useAdminQueryState();
  const departmentId = getFilter("departmentId");
  const options = useFilterOptions();

  const departments = useMemo(() => options?.departments ?? [], [options]);
  const departmentName = useMemo(() => {
    const map = new Map<number, string>();
    for (const dept of departments) map.set(dept.id, dept.shortName);
    return map;
  }, [departments]);

  const { items, meta, loading, error, refetch } = useAdminList(coursesClient, {
    page,
    search,
    departmentId: departmentId || undefined,
  });

  const [editing, setEditing] = useState<Course | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Courses"
        description="Courses offered by each department."
      />
      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search courses…"
        onNew={() => {
          setEditing(null);
          setOpen(true);
        }}
        newLabel="New course"
        activeFilterCount={departmentId ? 1 : 0}
        onClearFilters={() => setFilter("departmentId", null)}
      >
        <EntityPicker
          items={departments}
          value={departmentId}
          onChange={(next) => setFilter("departmentId", next || null)}
          getId={(item) => item.id}
          getLabel={(item) => item.shortName}
          placeholder="All departments"
          clearLabel="All departments"
          searchPlaceholder="Search departments…"
          aria-label="Filter by department"
          className="w-full sm:w-48"
        />
      </AdminToolbar>
      <ResourceTable<Course>
        items={items}
        loading={loading}
        error={error}
        meta={meta}
        currentPage={page}
        rowKey={(item) => item.id}
        onRowClick={(item) => {
          setEditing(item);
          setOpen(true);
        }}
        columns={[
          {
            header: "Course",
            cell: (item) => <span className="font-medium">{item.name}</span>,
          },
          {
            header: "Department",
            cell: (item) => departmentName.get(item.departmentId) ?? "—",
          },
        ]}
        actions={(item) => (
          <RowActions
            onEdit={() => {
              setEditing(item);
              setOpen(true);
            }}
            onDelete={() => coursesClient.remove(token!, item.id)}
            onDeleted={refetch}
            deleteTitle={`Delete "${item.name}"?`}
            deleteDescription="Courses referenced by questions cannot be deleted."
          />
        )}
        emptyIcon={GraduationCap}
        emptyTitle="No courses"
        emptyDescription="Create your first course to get started."
      />
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit course" : "New course"}
      >
        <CourseForm
          course={editing}
          departments={departments}
          onDone={() => {
            setOpen(false);
            refetch();
          }}
        />
      </FormSheet>
    </>
  );
}

function CourseForm({
  course,
  departments,
  onDone,
}: {
  course: Course | null;
  departments: DepartmentOption[];
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [departmentId, setDepartmentId] = useState(
    course ? String(course.departmentId) : "",
  );
  const [name, setName] = useState(course?.name ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!departmentId) {
      toast.error("Select a department");
      return;
    }
    setBusy(true);
    try {
      const payload = { departmentId: Number(departmentId), name: name.trim() };
      if (course) {
        await coursesClient.update(token, course.id, payload);
        toast.success("Course updated");
      } else {
        await coursesClient.create(token, payload);
        toast.success("Course created");
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
        <Label htmlFor="department">Department</Label>
        <EntityPicker
          id="department"
          items={departments}
          value={departmentId}
          onChange={setDepartmentId}
          getId={(item) => item.id}
          getLabel={(item) => item.name}
          placeholder="Select a department"
          searchPlaceholder="Search departments…"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Course name</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Data Structures"
          maxLength={150}
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
