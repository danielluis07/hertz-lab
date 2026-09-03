import { requireAuth } from "@/lib/auth-guards";

const AccountPage = async () => {
  await requireAuth();

  return <h1>Minha conta</h1>;
};

export default AccountPage;
