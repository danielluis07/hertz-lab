import {
  FolderTree,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Star,
  Tag,
  TicketPercent,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The admin nav (ADR-0015). A module gets on it when someone adds a line here;
 * a module built and not listed is reachable by URL and invisible in the
 * sidebar. `label` is pt-BR, `segment` is English (ADR-0005).
 */
export type AdminNavEntry = {
  /**
   * The route segment below `/admin`. `null` is the Dashboard at `/admin`
   * itself, which is what lets the sidebar compare one segment and no more.
   */
  segment: string | null;
  label: string;
  icon: LucideIcon;
};

/** Wayfinding, not architecture: nine links read as three short lists. */
export type AdminNavGroup = {
  /** `null` renders the group without a heading. */
  label: string | null;
  entries: AdminNavEntry[];
};

export const adminNav: AdminNavGroup[] = [
  {
    label: null,
    entries: [{ segment: null, label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catálogo",
    entries: [
      { segment: "products", label: "Produtos", icon: Package },
      { segment: "brands", label: "Marcas", icon: Tag },
      { segment: "categories", label: "Categorias", icon: FolderTree },
    ],
  },
  {
    label: "Vendas",
    entries: [
      { segment: "orders", label: "Pedidos", icon: ShoppingCart },
      { segment: "coupons", label: "Cupons", icon: TicketPercent },
      { segment: "shipping-methods", label: "Métodos de envio", icon: Truck },
    ],
  },
  {
    label: "Pessoas",
    entries: [
      { segment: "customers", label: "Clientes", icon: Users },
      { segment: "reviews", label: "Avaliações", icon: Star },
    ],
  },
];

/**
 * Destination is derived from identity, so the two cannot drift: no entry
 * hard-codes a path (ADR-0015).
 */
export const adminNavHref = (segment: string | null) =>
  segment === null ? "/admin" : `/admin/${segment}`;
