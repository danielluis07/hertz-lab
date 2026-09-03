import { requireAdmin } from "@/lib/auth-guards";

const AdminOrderDetailPage = async ({ params }: PageProps<"/admin/orders/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Pedido {id}</h1>;
};

export default AdminOrderDetailPage;
