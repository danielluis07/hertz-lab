export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
