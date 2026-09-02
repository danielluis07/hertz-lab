import { requireAuth } from "@/lib/auth-utils";

const WishlistPage = async () => {
  await requireAuth();

  return <h1>Meus favoritos</h1>;
};

export default WishlistPage;
