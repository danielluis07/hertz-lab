import { requireAuth } from "@/lib/auth-utils";

const CheckoutPage = async () => {
  await requireAuth();

  return <h1>Checkout</h1>;
};

export default CheckoutPage;
