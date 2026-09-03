import { requireAdmin } from "@/lib/auth-guards";

const AdminNewProductsPage = async () => {
  await requireAdmin();

  return <h1>Novo — Produtos</h1>;
};

export default AdminNewProductsPage;
