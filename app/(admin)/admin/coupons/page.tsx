import { requireAdmin } from "@/lib/auth-guards";

const AdminCouponsPage = async () => {
  await requireAdmin();

  return <h1>Cupons</h1>;
};

export default AdminCouponsPage;
