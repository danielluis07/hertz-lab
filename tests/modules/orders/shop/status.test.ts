import { describe, expect, test } from "bun:test";
import { formatOrderStatus } from "@/modules/orders/shop/status";

describe("formatOrderStatus", () => {
  test("maps every persisted status to shopper-facing Portuguese copy", () => {
    expect(formatOrderStatus("pending_payment")).toBe("Aguardando pagamento");
    expect(formatOrderStatus("paid")).toBe("Pago");
    expect(formatOrderStatus("processing")).toBe("Em processamento");
    expect(formatOrderStatus("shipped")).toBe("Enviado");
    expect(formatOrderStatus("delivered")).toBe("Entregue");
    expect(formatOrderStatus("cancelled")).toBe("Cancelado");
  });
});
