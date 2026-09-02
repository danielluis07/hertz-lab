import { ConfirmProvider } from "@/providers/confirm-provider";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfirmProvider>
      <SidebarProvider>
        {/* <AdminSidebar /> */}
        {/* <SidebarInset> */}
        {/* <AdminHeader /> */}
        <main className="p-4">{children}</main>
        {/* </SidebarInset> */}
      </SidebarProvider>
    </ConfirmProvider>
  );
}
