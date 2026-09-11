import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { AccountMenu } from "@/components/shop/account-menu";
import { getRootCategories } from "@/modules/categories/shop";
import { SiteSearch } from "@/components/shop/site-search";
import { buttonVariants } from "@/components/ui/button";
import { STORE } from "@/lib/store";
import { CartBadge } from "@/modules/cart/components/cart-badge";

/**
 * The Storefront header, mounted by the `(shop)` and `(account)` layouts
 * (ADR-0034). A server component: its own markup ships no JavaScript, and the
 * three leaves that need the browser — search, the Cart count, the account
 * menu — cross the boundary on their own (ADR-0015, ADR-0042).
 *
 * Two rows. The top one is the instrument's face: wordmark, search, and the
 * two per-visitor controls, whose slots are fixed so nothing shifts when a
 * session resolves. On a phone the search drops to a full-width line of its
 * own. The second row is the catalogue's nav — `Produtos`, then every root
 * Category flat, in the order the read returns them. It scrolls sideways
 * rather than wrapping when the roots outgrow the width.
 *
 * **No dropdown and no active state**, both declined rather than deferred
 * (`docs/STOREFRONT.md`). Children are found on their root's own page. There
 * is no cap on the count either: roots that outgrow the header are fixed by
 * having fewer of them (ADR-0042).
 */
export async function SiteHeader() {
  const categories = await getRootCategories();

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3 md:h-16 md:flex-nowrap md:py-0">
        <Link
          href="/"
          className="text-xl font-medium tracking-tight whitespace-nowrap">
          {STORE.name}
        </Link>

        <SiteSearch className="order-last w-full md:order-none md:ml-auto md:w-72 lg:w-96" />

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {/* Static for everyone, the same size for everyone: only the badge
              inside it resolves per visitor (ADR-0034). A plain link dressed
              as a button, not a `Button` rendering one, which would announce
              it with `role="button"`. */}
          <Link
            href="/carrinho"
            className={buttonVariants({
              variant: "ghost",
              size: "icon-lg",
              className: "relative",
            })}>
            <ShoppingBagIcon />
            <span className="sr-only">Carrinho</span>
            <CartBadge />
          </Link>

          <AccountMenu />
        </div>
      </div>

      <nav aria-label="Categorias" className="border-t">
        <ul className="mx-auto flex h-11 w-full max-w-7xl items-center gap-6 overflow-x-auto px-6 text-sm whitespace-nowrap [scrollbar-width:none]">
          <li className="flex items-center gap-6">
            <Link
              href="/produtos"
              className="font-medium decoration-1 underline-offset-4 hover:underline">
              Produtos
            </Link>
            {categories.length > 0 && (
              <span aria-hidden className="bg-border h-4 w-px" />
            )}
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/produtos/${category.slug}`}
                className="text-muted-foreground hover:text-foreground focus-visible:text-foreground transition-colors duration-150 ease-out motion-reduce:transition-none">
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
