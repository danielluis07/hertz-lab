import { requireAdmin } from "@/lib/auth-guards";

const AdminCustomersPage = async () => {
  await requireAdmin();

  return <h1>Clientes</h1>;
};

export default AdminCustomersPage;
