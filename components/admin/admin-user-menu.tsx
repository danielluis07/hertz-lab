"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useConfirm } from "@/providers/confirm-provider";

export function AdminUserMenu() {
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

  if (isPending) {
    return <Skeleton className="h-7 w-32" />;
  }

  if (!session) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <User data-icon="inline-start" />
        <span className="max-w-32 truncate">{session.user.name}</span>
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-1.5 py-1">
          <p className="truncate text-sm font-medium">{session.user.name}</p>
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
  );
}
