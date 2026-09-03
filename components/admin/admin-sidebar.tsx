import Link from "next/link";
import { AudioLines } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// A server component: the frame itself needs no hook. The nav does — active
// state comes from useSelectedLayoutSegments() — so that is the one leaf below
// here marked "use client".
export function AdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Hertz Lab"
              render={<Link href="/admin" />}>
              <AudioLines />
              {/* The lg button drops its padding when collapsed, which would
                  leave the first letters showing past the icon rail. */}
              <span className="font-semibold group-data-[collapsible=icon]:hidden">
                Hertz Lab
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <AdminNav />
      </SidebarContent>
    </Sidebar>
  );
}
