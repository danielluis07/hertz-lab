import { requireAuth } from "@/lib/auth-guards";

const ProfilePage = async () => {
  await requireAuth();

  return <h1>Meu perfil</h1>;
};

export default ProfilePage;
