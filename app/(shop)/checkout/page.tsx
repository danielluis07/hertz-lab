import { requireAuth } from "@/lib/auth-guards";

const CheckoutPage = async () => {
  await requireAuth();

  return <h1>Checkout</h1>;
};

export default CheckoutPage;
