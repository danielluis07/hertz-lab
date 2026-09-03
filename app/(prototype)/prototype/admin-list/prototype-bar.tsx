"use client";

/**
 * PROTOTYPE — the switch. Drives the 2x2: two shapes x two surfaces.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

const SHAPES = [
  { value: "primitives", label: "(b) Primitives" },
  { value: "kit", label: "(a) Config kit" },
] as const;

const SURFACES = [
  { value: "brands", label: "Marcas (fácil)" },
  { value: "products", label: "Produtos (difícil)" },
] as const;

export function PrototypeBar({
  shape,
  surface,
}: {
  shape: string;
  surface: string;
}) {
  const href = (next: { shape?: string; surface?: string }) => {
    const params = new URLSearchParams({
      shape: next.shape ?? shape,
      surface: next.surface ?? surface,
    });
    return `/prototype/admin-list?${params.toString()}`;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-6 border-t bg-background/95 p-3 backdrop-blur">
      <Group label="Shape">
        {SHAPES.map((option) => (
          <Pill
            key={option.value}
            href={href({ shape: option.value })}
            active={shape === option.value}>
            {option.label}
          </Pill>
        ))}
      </Group>
      <Group label="Surface">
        {SURFACES.map((option) => (
          <Pill
            key={option.value}
            href={href({ surface: option.value })}
            active={surface === option.value}>
            {option.label}
          </Pill>
        ))}
      </Group>
      <span className="text-xs text-muted-foreground">
        PROTOTYPE — issue #11, throwaway
      </span>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "hover:bg-muted",
      )}>
      {children}
    </Link>
  );
}
