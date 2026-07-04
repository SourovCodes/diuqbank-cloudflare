import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAdminUser, updateAdminUser } from "../../api";
import type { AdminUser, UpdateUser } from "../../types/api";
import { useAdminUser } from "../../hooks/adminQueries";
import { Badge } from "../../components/ui/Badge";
import { Button, Field, inputClass } from "../../components/ui/form";
import { DetailRow } from "../../components/submissions/SubmissionParts";
import { formatDate } from "../../lib/format";
import { ErrorBox } from "./shared";
import { SubmissionsTable } from "./SubmissionsTable";

export default function AdminUserDetail() {
  const { id } = useParams();
  const { data: user, isPending, isError } = useAdminUser(id);

  useEffect(() => {
    document.title = user ? `${user.name} | Admin` : "User | Admin";
  }, [user]);

  if (isPending) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Loading user…
      </div>
    );
  }

  if (isError || !user) {
    return <ErrorBox message="User not found — the account may have been deleted." />;
  }

  return (
    <div>
      <Link
        to="/admin/users"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        ← Back to users
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xl font-bold text-white">
              {user.name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {user.name}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              <Link
                to={`/contributors/${encodeURIComponent(user.username)}`}
                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                @{user.username}
              </Link>{" "}
              · {user.email}
            </p>
          </div>
        </div>
        <Badge label={user.role} variant={user.role === "admin" ? "blue" : "gray"} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Published submissions
          </h2>
          <SubmissionsTable userId={user.id} showQuestion />
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Account
            </h2>
            <dl className="space-y-1.5 text-sm">
              <DetailRow
                label="Submissions"
                value={String(user.submissionCount)}
              />
              <DetailRow label="Joined" value={formatDate(user.createdAt)} />
            </dl>
          </div>

          <EditCard key={user.id} user={user} />
        </aside>
      </div>
    </div>
  );
}

function EditCard({ user }: { user: AdminUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateUser>({
    name: user.name,
    username: user.username,
    role: user.role,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "user", String(user.id)],
    });
  }

  const save = useMutation({
    mutationFn: () => updateAdminUser(user.id, form),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => deleteAdminUser(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      navigate("/admin/users");
    },
  });

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Edit account
      </h2>
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
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
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
      <div className="flex items-center gap-2">
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          Save changes
        </Button>
        {save.isSuccess && !save.isPending && (
          <span className="text-xs text-green-600 dark:text-green-400">
            Saved.
          </span>
        )}
      </div>
      {save.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {(save.error as Error).message}
        </p>
      )}

      <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
        <Button
          variant="danger"
          className="w-full"
          loading={remove.isPending}
          onClick={() => {
            if (
              confirm(
                `Delete ${user.name}'s account? Accounts with submissions cannot be deleted.`
              )
            ) {
              remove.mutate();
            }
          }}
        >
          Delete account
        </Button>
        {remove.isError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {(remove.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
