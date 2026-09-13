import type { OrderStatus } from "@/modules/orders/status";

const ORDER_STATUS_LABELS = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em processamento",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
} as const satisfies Record<OrderStatus, string>;

/** Shopper-facing label shared by the Order list and detail surfaces. */
export function formatOrderStatus(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}
