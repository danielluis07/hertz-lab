import { requireAdmin } from "@/lib/auth-guards";

const AdminEditBrandsPage = async ({ params }: PageProps<"/admin/brands/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Marcas — {id}</h1>;
};

export default AdminEditBrandsPage;
