import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ConfirmProvider } from "@/providers/confirm-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// No authorisation check and no data fetching here: every admin page calls
// requireAdmin() in its own body (ADR-0006). No defaultOpen either, so the
// sidebar opens expanded after every reload (ADR-0015).
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <ConfirmProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <AdminHeader />
          <main className="flex-1 p-4">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </ConfirmProvider>
  );
}
