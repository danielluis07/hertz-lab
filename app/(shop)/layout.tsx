export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* <SiteHeader /> */}
      <main className="flex-1">{children}</main>
      {/* <SiteFooter /> */}
    </>
  );
}
