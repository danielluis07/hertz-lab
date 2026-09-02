import { requireAdmin } from "@/lib/auth-utils";

const AdminShippingMethodsPage = async () => {
  await requireAdmin();

  return <h1>Métodos de envio</h1>;
};

export default AdminShippingMethodsPage;
