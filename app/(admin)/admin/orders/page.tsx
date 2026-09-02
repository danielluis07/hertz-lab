import { requireAdmin } from "@/lib/auth-utils";

const AdminOrdersPage = async () => {
  await requireAdmin();

  return <h1>Pedidos</h1>;
};

export default AdminOrdersPage;
