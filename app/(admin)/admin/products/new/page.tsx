import { requireAdmin } from "@/lib/auth-utils";

const AdminNewProductsPage = async () => {
  await requireAdmin();

  return <h1>Novo — Produtos</h1>;
};

export default AdminNewProductsPage;
