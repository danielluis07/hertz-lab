import { requireAuth } from "@/lib/auth-guards";

const OrdersPage = async () => {
  await requireAuth();

  return <h1>Meus pedidos</h1>;
};

export default OrdersPage;
