import { requireAuth } from "@/lib/auth-utils";

const ProfilePage = async () => {
  await requireAuth();

  return <h1>Meu perfil</h1>;
};

export default ProfilePage;
