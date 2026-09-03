import { requireAdmin } from "@/lib/auth-guards";

const AdminNewBrandsPage = async () => {
  await requireAdmin();

  return <h1>Novo — Marcas</h1>;
};

export default AdminNewBrandsPage;
