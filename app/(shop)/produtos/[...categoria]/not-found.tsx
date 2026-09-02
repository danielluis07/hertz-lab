import Link from "next/link";

const CategoryNotFound = () => {
  return (
    <div className="flex flex-col items-start gap-4 p-8">
      <h2 className="text-xl font-semibold">Categoria não encontrada</h2>
      <p>Esta categoria não existe.</p>
      <Link href="/produtos" className="underline">
        Ver todos os produtos
      </Link>
    </div>
  );
};

export default CategoryNotFound;
