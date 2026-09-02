import { requireAdmin } from "@/lib/auth-utils";

const AdminCategoriesPage = async () => {
  await requireAdmin();

  return <h1>Categorias</h1>;
};

export default AdminCategoriesPage;
