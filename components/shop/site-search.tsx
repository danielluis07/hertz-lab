"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buildFilterHref } from "@/lib/utils/filter";
import { CATALOG_PARAMS } from "@/modules/products/shop/constants";

/**
 * The header's search: a form that writes `/produtos?busca=<term>` and
 * nothing else (ADR-0042). It queries nothing, which is why it is frame
 * furniture and not a `products` component.
 *
 * **Uncontrolled and always empty.** It never reads the current query:
 * `useSearchParams()` here would fail the build on every prerendered route
 * this frame mounts on, or client-render them inside a boundary. So on
 * `/produtos?busca=fones` this box is blank and the catalogue bar's own box
 * shows the term — and the form resets after each submit, so it never holds
 * a stale one either.
 *
 * **`router.push`, not `<form action="/produtos">`.** A document navigation
 * would discard the prefetched `produtos/loading.tsx` boundary (ADR-0040).
 * An empty term lands on the unfiltered catalogue.
 */
export function SiteSearch({ className }: { className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const term = input.current?.value.trim() ?? "";

        event.currentTarget.reset();
        // Closes a phone's keyboard over the results it is about to show.
        input.current?.blur();

        router.push(
          buildFilterHref({
            pathname: "/produtos",
            searchParams: new URLSearchParams(),
            values: { [CATALOG_PARAMS.search]: term },
          }),
        );
      }}>
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        {/* `text` for the catalogue box's reason: the browser's own clear
            control differs per engine and cannot be styled. */}
        <Input
          ref={input}
          type="text"
          name={CATALOG_PARAMS.search}
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Buscar produtos"
          aria-label="Buscar produtos"
          className="h-9 pl-9"
        />
      </div>
    </form>
  );
}
