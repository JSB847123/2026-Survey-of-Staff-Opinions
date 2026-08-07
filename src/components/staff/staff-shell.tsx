"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ClipboardList,
  FileUp,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/staff", label: "설문 목록", icon: ClipboardList },
  { href: "/staff/surveys/new", label: "설문 업로드", icon: FileUp },
  { href: "/staff/respondents", label: "응답자 계정", icon: UsersRound },
  { href: "/staff/audit", label: "감사 로그", icon: ScrollText, adminOnly: true },
  { href: "/staff/settings", label: "시스템 설정", icon: Settings, adminOnly: true },
];

export function StaffShell({
  role,
  children,
}: {
  role: "reviewer" | "admin";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  const logout = async () => {
    try {
      await apiFetch("/api/staff/logout", { method: "POST" });
      router.push("/staff/login");
      router.refresh();
    } catch {
      toast.error("로그아웃에 실패했습니다.");
    }
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="주 메뉴">
      {items.map((item) => {
        const active =
          item.href === "/staff"
            ? pathname === "/staff"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="text-sm font-semibold">설문 운영 센터</span>
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {role === "admin" ? "관리자" : "확인자"}
          </Badge>
        </div>
        <Separator />
        {nav}
        <Separator />
        <div className="flex items-center justify-between p-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="size-4" /> 로그아웃
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <span className="text-sm font-semibold">설문 운영 센터</span>
            <Badge variant={role === "admin" ? "default" : "secondary"}>
              {role === "admin" ? "관리자" : "확인자"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="로그아웃" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        {mobileOpen && (
          <div className="border-b bg-sidebar md:hidden">{nav}</div>
        )}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
