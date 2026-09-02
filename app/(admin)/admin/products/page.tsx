import { requireAdmin } from "@/lib/auth-utils";

const AdminProductsPage = async () => {
  await requireAdmin();

  return <h1>Produtos</h1>;
};

export default AdminProductsPage;
