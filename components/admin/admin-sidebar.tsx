"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { AudioLines } from "lucide-react";

import { adminNav, adminNavHref } from "@/components/admin/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AdminSidebar() {
  // Rendered from app/(admin)/layout.tsx, so the segments start below it:
  // ["admin", "products", "123"] for /admin/products/123, and ["admin"] for
  // /admin itself. Index 1 is the module segment — comparing only that one
  // lights Produtos for /admin/products/new and /admin/products/[id] alike,
  // and leaves Dashboard as the entry whose segment is null (ADR-0015).
  const segments = useSelectedLayoutSegments();
  const activeSegment = segments[1] ?? null;

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
              <span className="font-semibold">Hertz Lab</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {adminNav.map((group) => (
          <SidebarGroup key={group.label ?? "inicio"}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.entries.map((entry) => (
                  <SidebarMenuItem key={entry.segment ?? "dashboard"}>
                    <SidebarMenuButton
                      isActive={entry.segment === activeSegment}
                      tooltip={entry.label}
                      render={<Link href={adminNavHref(entry.segment)} />}>
                      <entry.icon />
                      <span>{entry.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
