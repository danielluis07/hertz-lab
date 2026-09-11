import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";

// Reads nothing and passes nothing: the header and footer each read the root
// Categories through one memoised call (ADR-0042). No `headers()`, `cookies()`
// or session here — a Request-time read would make every route in the group
// dynamic, and the frame resolves the visitor on the client instead
// (ADR-0034, ADR-0035).
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
