import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { StaffShell } from "@/components/staff/staff-shell";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const session = await getSession();
  if (!session || session.kind !== "staff") {
    redirect("/staff/login");
  }
  return <StaffShell role={session.role}>{children}</StaffShell>;
}
