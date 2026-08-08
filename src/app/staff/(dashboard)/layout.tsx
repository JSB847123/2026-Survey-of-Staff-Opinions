import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/session";
import { StaffShell } from "@/components/staff/staff-shell";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const session = await getStaffSession();
  if (!session) {
    redirect("/staff/login");
  }
  return <StaffShell role={session.role}>{children}</StaffShell>;
}
