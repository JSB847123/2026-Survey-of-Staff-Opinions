import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import { StaffLoginForm } from "@/components/staff/staff-login-form";

export const metadata: Metadata = { title: "운영자 로그인" };

export default function StaffLoginPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-end px-6 py-4">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <StaffLoginForm />
      </div>
    </main>
  );
}
