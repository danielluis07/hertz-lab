import { requireAdmin } from "@/lib/auth-guards";

const AdminEditProductsPage = async ({ params }: PageProps<"/admin/products/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Produtos — {id}</h1>;
};

export default AdminEditProductsPage;
