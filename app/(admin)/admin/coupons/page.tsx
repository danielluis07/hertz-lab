import { requireAdmin } from "@/lib/auth-utils";

const AdminCouponsPage = async () => {
  await requireAdmin();

  return <h1>Cupons</h1>;
};

export default AdminCouponsPage;
