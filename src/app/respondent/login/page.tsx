import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { RespondentAuthForm } from "@/components/survey/respondent-auth-form";

export const metadata: Metadata = { title: "응답자 로그인" };

export default function RespondentLoginPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/respondent" className="text-sm font-semibold tracking-tight">
          설문 응답
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Suspense>
          <RespondentAuthForm mode="login" />
        </Suspense>
      </div>
    </main>
  );
}
