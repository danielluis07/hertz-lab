import { requireAdmin } from "@/lib/auth-utils";

const AdminPage = async () => {
  await requireAdmin();

  return <h1>Dashboard</h1>;
};

export default AdminPage;
