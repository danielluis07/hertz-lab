import { requireAdmin } from "@/lib/auth-utils";

const AdminEditShippingMethodsPage = async ({ params }: PageProps<"/admin/shipping-methods/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  return <h1>Métodos de envio — {id}</h1>;
};

export default AdminEditShippingMethodsPage;
