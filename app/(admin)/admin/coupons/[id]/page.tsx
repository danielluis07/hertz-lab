import { requireAdmin } from "@/lib/auth-utils";

const AdminEditCouponsPage = async ({ params }: PageProps<"/admin/coupons/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Cupons — {id}</h1>;
};

export default AdminEditCouponsPage;
