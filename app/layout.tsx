import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { geistSans, inter } from "@/fonts";
import { TRPCReactProvider } from "@/trpc/client";
import { TooltipProvider } from "@/components/ui/tooltip";

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
        geistSans.variable,
        inter.variable,
      )}>
      <body className="min-h-full flex flex-col">
        <TRPCReactProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
