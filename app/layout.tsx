import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { inter, plexMono, plexSans } from "@/fonts";
import { TRPCReactProvider } from "@/trpc/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Hertz Lab",
    template: "%s | Hertz Lab",
  },
  description:
    "Áudio e eletrônicos com curadoria: fones, caixas de som e acessórios.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full antialiased font-sans",
        plexSans.variable,
        plexMono.variable,
        inter.variable,
      )}>
      <body className="min-h-full flex flex-col">
        <TRPCReactProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TRPCReactProvider>
        {/* The one renderer for the one global mutation handler
            (`trpc/query-client.ts`, ADR-0013), which already speaks for
            every route — so it is mounted where every route renders. */}
        <Toaster />
      </body>
    </html>
  );
}
