import Link from "next/link";

const NotFound = () => {
  return (
    <div className="flex flex-col items-start gap-4 p-8">
      <h2 className="text-xl font-semibold">Página não encontrada</h2>
      <p>A página que você procura não existe ou foi removida.</p>
      <Link href="/" className="underline">
        Voltar ao início
      </Link>
    </div>
  );
};

export default NotFound;
