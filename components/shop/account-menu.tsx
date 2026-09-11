"use client";

import Link from "next/link";
import { LayoutDashboardIcon, LogOutIcon, UserIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { ROLE_HOME } from "@/modules/auth/redirects";

/**
 * The header's account affordance: an `Entrar` link for a visitor, a menu
 * carrying the name and `Sair` for a signed-in User. Frame furniture rather
 * than a module's component, on the `admin-user-menu.tsx` precedent — no
 * module owns the session; Better Auth does (ADR-0042).
 *
 * Read on the client, because the `(shop)` layout never reads a session and
 * nothing in a cached shop route varies per visitor on the server (ADR-0034).
 * The slot is a fixed width and renders empty until the session resolves, so
 * neither answer shifts the header when it arrives. The labels collapse to
 * their icons on a phone, where the slot is one icon wide.
 *
 * An Admin browsing the shop is offered the panel instead of `/minha-conta`,
 * which would only bounce them back to `/` (`requireUser()`).
 */
export function AccountMenu() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <div className="flex w-9 justify-end sm:w-36">
      {isPending ? null : !session ? (
        <Link
          href="/login"
          className={buttonVariants({ variant: "ghost", size: "lg" })}>
          <UserIcon />
          <span className="max-sm:sr-only">Entrar</span>
        </Link>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="lg" className="max-w-full" />}>
            <UserIcon />
            <span className="min-w-0 truncate max-sm:sr-only">
              {session.user.name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-1.5 py-1">
              <p className="truncate text-sm font-medium">
                {session.user.name}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {session.user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            {session.user.role === "admin" ? (
              <DropdownMenuItem render={<Link href="/admin" />}>
                <LayoutDashboardIcon />
                Painel
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem render={<Link href="/minha-conta" />}>
                <UserIcon />
                Minha conta
              </DropdownMenuItem>
            )}
            {/* No confirmation: a shopper signing out loses nothing, because
                a Cart is a permanent row waiting on the next sign-in
                (ADR-0042). A document navigation rather than `router.push`,
                so nothing this session put in the client — the Cart the
                badge cached, the session atom — survives for whoever uses
                this browser next. */}
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut();
                window.location.assign(ROLE_HOME.user);
              }}>
              <LogOutIcon />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
