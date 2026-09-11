import Link from "next/link";
import { STORE } from "@/lib/store";
import { getRootCategories } from "@/modules/categories/shop";

/**
 * The Storefront footer, mounted beside the header by the `(shop)` and
 * `(account)` layouts. A server component with no client leaf at all.
 *
 * Three columns and a signature line (`docs/STOREFRONT.md`): _Loja_, from the
 * same root Categories the header links — the same memoised read, so one
 * query serves both — the five institucional pages, the store's contact
 * facts from `lib/store.ts`, then the wordmark and copyright. Nothing else:
 * no newsletter, no payment-method list, no social links.
 *
 * The year is the one rendered when the route was, which on a static route is
 * its last revalidation.
 */
export async function SiteFooter() {
  const categories = await getRootCategories();

  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-16 sm:grid-cols-3 md:py-20">
        <nav aria-labelledby="site-footer-loja" className="flex flex-col gap-4">
          <h2
            id="site-footer-loja"
            className="text-muted-foreground text-xs tracking-wide uppercase">
            Loja
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li>
              <FooterLink href="/produtos">Todos os produtos</FooterLink>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <FooterLink href={`/produtos/${category.slug}`}>
                  {category.name}
                </FooterLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav
          aria-labelledby="site-footer-institucional"
          className="flex flex-col gap-4">
          <h2
            id="site-footer-institucional"
            className="text-muted-foreground text-xs tracking-wide uppercase">
            Institucional
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li>
              <FooterLink href="/sobre">Sobre a {STORE.name}</FooterLink>
            </li>
            <li>
              <FooterLink href="/contato">Contato</FooterLink>
            </li>
            <li>
              <FooterLink href="/trocas-e-devolucoes">
                Trocas e devoluções
              </FooterLink>
            </li>
            <li>
              <FooterLink href="/termos-de-uso">Termos de uso</FooterLink>
            </li>
            <li>
              <FooterLink href="/politica-de-privacidade">
                Política de privacidade
              </FooterLink>
            </li>
          </ul>
        </nav>

        <section
          aria-labelledby="site-footer-contato"
          className="flex flex-col gap-4">
          <h2
            id="site-footer-contato"
            className="text-muted-foreground text-xs tracking-wide uppercase">
            Contato
          </h2>
          <div className="flex flex-col gap-2.5 text-sm">
            <a
              href={`mailto:${STORE.email}`}
              className="self-start decoration-1 underline-offset-4 hover:underline">
              {STORE.email}
            </a>
            <p className="text-muted-foreground">{STORE.serviceHours}</p>
          </div>
        </section>
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 py-6">
          <Link href="/" className="text-base font-medium">
            {STORE.name}
          </Link>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} {STORE.name}. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** A column link: ink at rest, underlined under the pointer. */
function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="decoration-1 underline-offset-4 hover:underline focus-visible:underline">
      {children}
    </Link>
  );
}
