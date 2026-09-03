import Link from "next/link";
import { Store } from "lucide-react";

import { AdminUserMenu } from "@/components/admin/admin-user-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// A server component: the header fetches nothing (ADR-0006) and needs no hook
// of its own. The user menu does — it reads the session — so it is the one leaf
// below here marked "use client".
export function AdminHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="my-2" />

      <div className="ml-auto flex items-center gap-2">
        {/* nativeButton={false}: the rendered element is an anchor, and Base UI
            keeps native button semantics only when told it has a real button. */}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/" />}>
          <Store data-icon="inline-start" />
          Ver loja
        </Button>

        <AdminUserMenu />
      </div>
    </header>
  );
}
