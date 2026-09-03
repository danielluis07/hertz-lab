import { requireAdmin } from "@/lib/auth-guards";

const AdminBrandsPage = async () => {
  await requireAdmin();

  return <h1>Marcas</h1>;
};

export default AdminBrandsPage;
