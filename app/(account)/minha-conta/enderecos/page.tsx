import { requireAuth } from "@/lib/auth-guards";

const AddressesPage = async () => {
  await requireAuth();

  return <h1>Meus endereços</h1>;
};

export default AddressesPage;
