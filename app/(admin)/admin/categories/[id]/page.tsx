import { requireAdmin } from "@/lib/auth-utils";

const AdminEditCategoriesPage = async ({ params }: PageProps<"/admin/categories/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Categorias — {id}</h1>;
};

export default AdminEditCategoriesPage;
