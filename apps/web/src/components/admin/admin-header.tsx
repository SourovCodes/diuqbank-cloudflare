"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const labels: Record<string, string> = {
  questions: "Questions",
  departments: "Departments",
  courses: "Courses",
  semesters: "Semesters",
  "exam-types": "Exam Types",
  users: "Users",
};

export function AdminHeader() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const parts = pathname.split("/").filter(Boolean); // e.g. ["admin","questions","5","submissions"]
  const segment = parts[1];
  const current = segment ? (labels[segment] ?? segment) : null;
  // Nested submissions live under a question: /admin/questions/[id]/submissions.
  const nestedSubmissions = segment === "questions" && parts[3] === "submissions";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:block">
            <BreadcrumbLink asChild>
              <Link href="/admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {current ? (
            <>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                {nestedSubmissions ? (
                  <BreadcrumbLink asChild>
                    <Link href="/admin/questions">{current}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{current}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          ) : null}
          {nestedSubmissions ? (
            <>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Submissions</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
