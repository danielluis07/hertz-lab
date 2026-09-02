import Link from "next/link";

const ProductNotFound = () => {
  return (
    <div className="flex flex-col items-start gap-4 p-8">
      <h2 className="text-xl font-semibold">Produto não encontrado</h2>
      <p>Este produto não existe ou não está mais disponível.</p>
      <Link href="/produtos" className="underline">
        Ver todos os produtos
      </Link>
    </div>
  );
};

export default ProductNotFound;
