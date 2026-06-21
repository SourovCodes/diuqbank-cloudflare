"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Camera, Loader2, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import type { AuthUser } from "@/lib/api/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileEditor() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto w-full px-4 py-8">
        <Skeleton className="mb-3 h-9 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <Skeleton className="h-125 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-muted">
            <UserRound className="size-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to edit your profile</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Your profile name and photo appear alongside the question papers you contribute.
          </p>
          <Button className="mt-6" asChild><Link href="/sign-in">Go to sign in</Link></Button>
        </div>
      </div>
    );
  }

  return <ProfileForm key={`${user.id}:${user.name}:${user.username}:${user.image}`} user={user} />;
}

function ProfileForm({ user }: { user: AuthUser }) {
  const { updateProfile, updateImage } = useAuth();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, username });
      toast.success("Profile updated");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a PNG, JPEG, GIF, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile images must be 5 MB or smaller");
      return;
    }

    setUploading(true);
    try {
      await updateImage(file);
      toast.success("Profile photo updated");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container mx-auto w-full px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit profile</h1>
        <p className="mt-2 text-muted-foreground">Manage how you appear across DIU Question Bank.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Public profile</CardTitle>
            <CardDescription>Choose the name and username shown with your contributions.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-8 flex items-center gap-5">
              <Avatar className="size-20 text-lg">
                {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="sr-only"
                  onChange={(event) => void upload(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
                  {uploading ? "Uploading…" : "Change photo"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">PNG, JPEG, GIF or WebP. Up to 5 MB.</p>
              </div>
            </div>

            <form onSubmit={save} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} maxLength={100} required onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">@</span>
                  <Input
                    id="username"
                    value={username}
                    minLength={3}
                    maxLength={50}
                    pattern="[a-zA-Z0-9_.-]+"
                    required
                    className="pl-7"
                    onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Letters, numbers, dots, underscores and hyphens.</p>
              </div>

              <div className="flex justify-end border-t pt-5">
                <Button type="submit" disabled={saving || !name.trim() || !username.trim()}>
                  {saving ? <Loader2 className="animate-spin" /> : null}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your Google account details are private and read-only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="truncate text-sm">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Account role</p>
                <p className="text-sm capitalize">{user.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
