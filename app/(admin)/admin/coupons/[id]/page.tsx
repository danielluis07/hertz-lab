import { requireAdmin } from "@/lib/auth-guards";

const AdminEditCouponsPage = async ({ params }: PageProps<"/admin/coupons/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Cupons — {id}</h1>;
};

export default AdminEditCouponsPage;
