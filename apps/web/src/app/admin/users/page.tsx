"use client";

import { Users } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { type AdminUser, usersClient } from "@/lib/api/admin-client";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function UsersPage() {
  const { token } = useAuth();
  const { page, search, setSearch, getFilter, setFilter } = useAdminQueryState();
  const role = getFilter("role");
  const { items, meta, loading, error, refetch } = useAdminList(usersClient, {
    page,
    search,
    role: role || undefined,
  });

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who has signed in with their DIU Google account."
      />
      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search name, email or username…"
      >
        <NativeSelect
          value={role}
          onChange={(event) => setFilter("role", event.target.value || null)}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </NativeSelect>
      </AdminToolbar>
      <ResourceTable<AdminUser>
        items={items}
        loading={loading}
        error={error}
        meta={meta}
        currentPage={page}
        rowKey={(item) => item.id}
        columns={[
          {
            header: "User",
            cell: (item) => (
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  {item.image ? (
                    <AvatarImage src={item.image} alt={item.name} />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {initials(item.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.email}
                  </span>
                </div>
              </div>
            ),
          },
          {
            header: "Username",
            cell: (item) => (
              <span className="text-muted-foreground">@{item.username}</span>
            ),
          },
          {
            header: "Role",
            cell: (item) => (
              <Badge variant={item.role === "admin" ? "default" : "secondary"}>
                {item.role === "admin" ? "Admin" : "User"}
              </Badge>
            ),
          },
          { header: "Submissions", cell: (item) => item.submissionCount },
          {
            header: "Joined",
            cell: (item) =>
              new Date(item.createdAt * 1000).toLocaleDateString(),
          },
        ]}
        actions={(item) => (
          <RowActions
            onEdit={() => {
              setEditing(item);
              setOpen(true);
            }}
            onDelete={() => usersClient.remove(token!, item.id)}
            onDeleted={refetch}
            deleteTitle={`Delete "${item.name}"?`}
            deleteDescription="Their submissions are kept but become anonymous."
          />
        )}
        emptyIcon={Users}
        emptyTitle="No users"
        emptyDescription="No one matches these filters."
      />
      <FormDialog open={open} onOpenChange={setOpen} title="Edit user">
        <UserForm
          user={editing}
          onDone={() => {
            setOpen(false);
            refetch();
          }}
        />
      </FormDialog>
    </>
  );
}

function UserForm({
  user,
  onDone,
}: {
  user: AdminUser | null;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [role, setRole] = useState<AdminUser["role"]>(user?.role ?? "user");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      await usersClient.update(token, user.id, {
        name: name.trim(),
        username: username.trim(),
        role,
      });
      toast.success("User updated");
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
          maxLength={100}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          maxLength={50}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Role</Label>
        <NativeSelect
          id="role"
          value={role}
          onChange={(event) =>
            setRole(event.target.value as AdminUser["role"])
          }
          className="w-full"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </NativeSelect>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
