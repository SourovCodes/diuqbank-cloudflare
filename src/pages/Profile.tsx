import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateProfile, uploadProfileImage } from "../api";
import { useAuth } from "../auth";
import { Button, Field, inputClass } from "../components/ui/form";
import { Card, CardTitle } from "../components/ui/Card";
import { formatDate } from "../lib/format";

export default function Profile() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.title = "Your profile | DIUQBank";
  }, []);

  const save = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), username: username.trim() }),
    onSuccess: (updated) => {
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadProfileImage(file),
    onSuccess: (updated) => setUser(updated),
  });

  if (!user) return null; // RequireAuth guarantees a user; keeps types happy

  const dirty = name.trim() !== user.name || username.trim() !== user.username;

  return (
    <div>
      <div className="mb-7 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Manage how you appear across your submissions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        {/* Account sidebar */}
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-3xl font-bold text-white">
                {user.name[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <p className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
              {user.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              @{user.username}
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              loading={upload.isPending}
              className="mt-5"
              onClick={() => fileRef.current?.click()}
            >
              Change photo
            </Button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              PNG, JPEG, GIF, or WebP — max 5 MB.
            </p>
            {upload.isError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {(upload.error as Error).message}
              </p>
            )}
          </div>

          <dl className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-sm dark:border-gray-800">
            <AccountFact label="Email" value={user.email} />
            <AccountFact label="Role" value={user.role} capitalize />
            <AccountFact label="Joined" value={formatDate(user.createdAt)} />
          </dl>
        </Card>

        {/* Edit form */}
        <Card className="p-6">
          <CardTitle>Edit details</CardTitle>
          <form
            className="mt-5 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Name" htmlFor="name">
              <input
                id="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </Field>

            <Field label="Username" htmlFor="username" hint="Shown publicly on your submissions.">
              <input
                id="username"
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={50}
              />
            </Field>

            <div className="flex items-center gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <Button type="submit" loading={save.isPending} disabled={!dirty}>
                Save changes
              </Button>
              {saved && (
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Saved
                </span>
              )}
              {save.isError && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {(save.error as Error).message}
                </span>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function AccountFact({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd
        className={`min-w-0 truncate font-medium text-gray-800 dark:text-gray-200 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
