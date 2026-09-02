export default function InstitutionalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 prose prose-neutral">
      {children}
    </div>
  );
}
