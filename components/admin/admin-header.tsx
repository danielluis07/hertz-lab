"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Store, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useConfirm } from "@/providers/confirm-provider";

export function AdminHeader() {
  // Read on the client so no layout fetches anything and ADR-0006 stays
  // untouched. The accepted cost is a skeleton on first paint rather than a
  // name that pops in and shifts the header.
  const { data: session, isPending } = authClient.useSession();
  const { confirm } = useConfirm();
  const router = useRouter();

  const handleSignOut = () =>
    confirm({
      title: "Sair da conta",
      message: "Você precisará entrar novamente para acessar o painel.",
      action: async () => {
        await authClient.signOut();
        router.push("/login");
      },
    });

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="my-2" />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/" />}>
          <Store data-icon="inline-start" />
          Ver loja
        </Button>

        {isPending && <Skeleton className="h-7 w-32" />}

        {session && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" />}>
              <User data-icon="inline-start" />
              <span className="max-w-32 truncate">{session.user.name}</span>
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-1.5 py-1">
                <p className="truncate text-sm font-medium">
                  {session.user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                <LogOut />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
