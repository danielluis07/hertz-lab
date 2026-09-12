import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";

const AccountPage = async () => {
  await requireUser();

  redirect("/minha-conta/pedidos");
};

export default AccountPage;
