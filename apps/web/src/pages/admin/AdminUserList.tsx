import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AdminUser } from "../../types/api";
import { useAdminUsers } from "../../hooks/adminQueries";
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Badge } from "../../components/ui/Badge";
import { inputClass } from "../../components/ui/form";
import { formatDate } from "../../lib/format";
import {
  AdminHeader,
  ErrorBox,
  SearchInput,
  useDebouncedValue,
  usePageParam,
} from "./shared";

export default function AdminUserList() {
  const navigate = useNavigate();
  const { page, setPage } = usePageParam();
  const [searchInput, setSearchInput] = useState("");
  const [role, setRole] = useState("");
  const search = useDebouncedValue(searchInput);

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
            onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
