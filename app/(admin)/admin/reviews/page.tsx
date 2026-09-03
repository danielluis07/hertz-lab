import { requireAdmin } from "@/lib/auth-guards";

const AdminReviewsPage = async () => {
  await requireAdmin();

  return <h1>Avaliações</h1>;
};

export default AdminReviewsPage;
