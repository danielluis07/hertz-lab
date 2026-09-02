import { requireAdmin } from "@/lib/auth-utils";

const AdminReviewsPage = async () => {
  await requireAdmin();

  return <h1>Avaliações</h1>;
};

export default AdminReviewsPage;
