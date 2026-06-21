"use client";

import Link from "next/link";
import { BookOpen, LogOut, Menu, Moon, Settings, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/questions", label: "Questions" },
];

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpen className="size-5" /></span>
          <span className="text-xl font-bold">DIU QBank</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => <Button key={item.href} variant="ghost" size="sm" asChild><Link href={item.href}>{item.label}</Link></Button>)}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          {!loading && !user ? (
            <Button size="sm" asChild><Link href="/sign-in">Sign in</Link></Button>
          ) : null}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Open account menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block truncate font-medium text-foreground">{user.name}</span>
                  <span className="block truncate text-xs">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><Settings /> Edit profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => {
                  signOut();
                  toast.success("Signed out");
                }}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <Menu />}<span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      {open ? (
        <nav className="border-t px-4 py-3 md:hidden">
          {navigation.map((item) => (
            <Button key={item.href} variant="ghost" className="w-full justify-start" asChild>
              <Link href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>
            </Button>
          ))}
          {user ? (
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/profile" onClick={() => setOpen(false)}>Profile</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
