import { requireAdmin } from "@/lib/auth-guards";

const AdminEditCategoriesPage = async ({ params }: PageProps<"/admin/categories/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Categorias — {id}</h1>;
};

export default AdminEditCategoriesPage;
