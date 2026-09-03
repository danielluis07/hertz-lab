import { requireAuth } from "@/lib/auth-guards";

const WishlistPage = async () => {
  await requireAuth();

  return <h1>Meus favoritos</h1>;
};

export default WishlistPage;
