import { requireAdmin } from "@/lib/auth-guards";

const AdminNewCouponsPage = async () => {
  await requireAdmin();

  return <h1>Novo — Cupons</h1>;
};

export default AdminNewCouponsPage;
