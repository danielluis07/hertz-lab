import { requireAuth } from "@/lib/auth-utils";

const CartPage = async () => {
  await requireAuth();

  return <h1>Carrinho</h1>;
};

export default CartPage;
