import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAdminUser } from "../../api";
import type { AdminUser, UpdateUser } from "../../types/api";
import { useAdminUsers } from "../../hooks/adminQueries";
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Badge } from "../../components/ui/Badge";
import { Button, Field, inputClass } from "../../components/ui/form";
import { Modal } from "../../components/ui/Modal";
import { formatDate } from "../../lib/format";
import {
  AdminHeader,
  ErrorBox,
  SearchInput,
  useDebouncedValue,
  usePageParam,
} from "./shared";

export default function AdminUserList() {
  const { page, setPage } = usePageParam();
  const [searchInput, setSearchInput] = useState("");
  const [role, setRole] = useState("");
  const search = useDebouncedValue(searchInput);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  useEffect(() => {
    document.title = "Users | Admin";
  }, []);

  const { data, isPending, isError, error, isFetching } = useAdminUsers({
    page,
    perPage: 20,
    search: search || undefined,
    role: role ? (role as AdminUser["role"]) : undefined,
  });

  const columns: Column<AdminUser>[] = [
    {
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-3">
          {u.image ? (
            <img
              src={u.image}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white">
              {u.name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {u.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              @{u.username}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Email",
      cell: (u) => (
        <span className="text-gray-600 dark:text-gray-300">{u.email}</span>
      ),
    },
    {
      header: "Role",
      cell: (u) => (
        <Badge
          label={u.role}
          variant={u.role === "admin" ? "blue" : "gray"}
        />
      ),
    },
    {
      header: "Submissions",
      cell: (u) => <span className="tabular-nums">{u.submissionCount}</span>,
      className: "text-right",
    },
    {
      header: "Joined",
      cell: (u) => (
        <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
          {formatDate(u.createdAt)}
        </span>
      ),
    },
    {
      header: "",
      cell: (u) => (
        <button
          type="button"
          onClick={() => setEditing(u)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Edit
        </button>
      ),
      className: "text-right",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Users"
        description={data?.meta.total ? `${data.meta.total} users.` : undefined}
        actions={
          <>
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Name, email, or username…"
            />
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className={`${inputClass} w-auto`}
            >
              <option value="">All roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
          </>
        }
      />

      {isError ? (
        <ErrorBox message={`Failed to load users: ${error.message}`} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(u) => u.id}
            isLoading={isPending}
            isFetching={isFetching}
            emptyMessage="No users match this filter."
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      {editing && (
        <EditUserModal user={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateUser>({
    name: user.name,
    username: user.username,
    role: user.role,
  });

  const save = useMutation({
    mutationFn: () => updateAdminUser(user.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${user.name}`}
      description={user.email}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name" htmlFor="user-name">
          <input
            id="user-name"
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field label="Username" htmlFor="user-username">
          <input
            id="user-username"
            value={form.username ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, username: e.target.value }))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Role" htmlFor="user-role">
          <select
            id="user-role"
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({ ...f, role: e.target.value as UpdateUser["role"] }))
            }
            className={inputClass}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </Field>
        {save.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {(save.error as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}
