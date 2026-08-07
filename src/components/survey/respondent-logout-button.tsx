"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client-api";

export function RespondentLogoutButton() {
  const router = useRouter();

  const logout = async () => {
    try {
      await apiFetch("/api/respondent/logout", { method: "POST" });
      router.push("/respondent");
      router.refresh();
    } catch {
      toast.error("로그아웃에 실패했습니다.");
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={logout}>
      <LogOut className="size-4" /> 로그아웃
    </Button>
  );
}
