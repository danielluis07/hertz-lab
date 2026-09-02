"use client";

import { useEffect } from "react";
import Link from "next/link";

const AccountError = ({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 p-8">
      <h2 className="text-xl font-semibold">Algo deu errado.</h2>
      <div className="flex gap-4">
        <button onClick={() => retry()} className="underline">
          Tentar novamente
        </button>
        <Link href="/minha-conta" className="underline">
          Voltar para minha conta
        </Link>
      </div>
    </div>
  );
};

export default AccountError;
