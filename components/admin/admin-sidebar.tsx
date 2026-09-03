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
            {/* The lg size drops the button's padding when collapsed, where
                every other size keeps the p-2 that centres a size-4 icon in the
                32px rail on its own. So the label is hidden outright — its first
                letters would otherwise show past the icon — and what is left is
                centred explicitly. */}
            <SidebarMenuButton
              size="lg"
              tooltip="Hertz Lab"
              className="group-data-[collapsible=icon]:justify-center"
              render={<Link href="/admin" />}>
              <AudioLines />
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
