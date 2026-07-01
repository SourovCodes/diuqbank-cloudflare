import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateProfile, uploadProfileImage } from "../api";
import { useAuth } from "../auth";
import { Button, Field, inputClass } from "../components/ui/form";
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
    <main className="container mx-auto max-w-2xl flex-1 px-4 py-10 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
        Your profile
      </h1>

      <section className="mt-8 flex items-center gap-5">
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
            {user.name[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
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
      </section>

      <form
        className="mt-8 space-y-5"
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

        <dl className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-3 dark:border-gray-800 dark:bg-gray-900">
          <ReadOnly label="Email" value={user.email} />
          <ReadOnly label="Role" value={user.role} />
          <ReadOnly label="Joined" value={formatDate(user.createdAt)} />
        </dl>

        <div className="flex items-center gap-3">
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
    </main>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 truncate font-medium text-gray-800 capitalize dark:text-gray-200">
        {value}
      </dd>
    </div>
  );
}
