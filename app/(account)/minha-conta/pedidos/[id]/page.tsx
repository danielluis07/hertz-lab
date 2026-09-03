import { requireAuth } from "@/lib/auth-guards";

const OrderDetailPage = async ({
  params,
}: PageProps<"/minha-conta/pedidos/[id]">) => {
  await requireAuth();

  const { id } = await params;

  return <h1>Pedido {id}</h1>;
};

export default OrderDetailPage;
