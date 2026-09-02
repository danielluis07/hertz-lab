import { requireAdmin } from "@/lib/auth-utils";

const AdminCustomerDetailPage = async ({ params }: PageProps<"/admin/customers/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Cliente {id}</h1>;
};

export default AdminCustomerDetailPage;
