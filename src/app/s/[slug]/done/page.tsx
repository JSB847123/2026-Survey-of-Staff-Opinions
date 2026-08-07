import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "제출 완료" };

export default function SurveyDonePage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-end px-4 py-3 sm:px-6">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <CheckCircle2
              className="size-14 text-emerald-500"
              aria-hidden
            />
            <CardTitle className="text-xl">
              응답이 정상적으로 제출되었습니다.
            </CardTitle>
            <CardDescription className="text-base">
              설문에 참여해 주셔서 감사합니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
