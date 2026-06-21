"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { useAuth } from "@/components/auth-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/sign-in");
    } else if (user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  // Render nothing but a spinner until we've confirmed an admin — avoids flashing the
  // panel to signed-out or non-admin visitors before the redirect lands.
  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="admin-theme">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AdminHeader />
          <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
