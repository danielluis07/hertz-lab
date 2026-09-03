import { requireAdmin } from "@/lib/auth-guards";

const AdminNewCategoriesPage = async () => {
  await requireAdmin();

  return <h1>Novo — Categorias</h1>;
};

export default AdminNewCategoriesPage;
