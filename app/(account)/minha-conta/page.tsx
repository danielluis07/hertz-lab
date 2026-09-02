import { requireAuth } from "@/lib/auth-utils";

const AccountPage = async () => {
  await requireAuth();

  return <h1>Minha conta</h1>;
};

export default AccountPage;
