export default function AccountLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-8">
      {/* <AccountSidebar /> */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
