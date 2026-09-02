import { requireAuth } from "@/lib/auth-utils";

const AddressesPage = async () => {
  await requireAuth();

  return <h1>Meus endereços</h1>;
};

export default AddressesPage;
