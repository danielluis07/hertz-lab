import { requireAdmin } from "@/lib/auth-guards";

const AdminOrdersPage = async () => {
  await requireAdmin();

  return <h1>Pedidos</h1>;
};

export default AdminOrdersPage;
