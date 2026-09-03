import { requireAdmin } from "@/lib/auth-guards";

const AdminNewShippingMethodsPage = async () => {
  await requireAdmin();

  return <h1>Novo — Métodos de envio</h1>;
};

export default AdminNewShippingMethodsPage;
