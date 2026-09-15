import type { Metadata } from "next";
import Link from "next/link";
import { BUYING_FACTS, STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "A Hertz Lab é uma loja de áudio e eletrônicos com catálogo enxuto, especificações completas e avaliações só de quem comprou.",
};

// Static and dateless: no legal text here for a last-updated line to describe.
const AboutPage = () => {
  return (
    <article>
      <header>
        <h1>Sobre a {STORE.name}</h1>
      </header>

      <p>
        A {STORE.name} vende áudio e eletrônicos para quem escuta com atenção:
        fones, caixas de som, amplificadores e os acessórios que ligam uma
        coisa à outra. Somos uma loja pequena de propósito. Preferimos um
        catálogo que dê para conhecer inteiro a uma vitrine infinita de
        variações quase iguais.
      </p>

      <h2>Como escolhemos o que vender</h2>
      <p>
        Cada produto entra no catálogo porque achamos que ele merece a
        prateleira, não porque um fornecedor precisava escoar estoque. Quando
        dois modelos resolvem o mesmo problema do mesmo jeito, ficamos com um
        só.
      </p>
      <p>
        Não há contagem regressiva, selo de &ldquo;últimas unidades&rdquo; nem
        preço riscado inventado. Quando um produto está em promoção, o preço
        anterior é o que ele custava de verdade.
      </p>

      <h2>A ficha técnica vem primeiro</h2>
      <p>
        Impedância, sensibilidade, resposta de frequência, codecs, autonomia
        de bateria: quem compra áudio compara números, e é por eles que a
        decisão costuma ser tomada. Por isso as especificações de cada produto
        ficam logo abaixo da área de compra, e não escondidas no fim da página.
      </p>

      <h2>Avaliações de quem comprou</h2>
      <p>
        Só pode avaliar um produto quem o recebeu em um pedido feito aqui.
        Toda avaliação passa por moderação antes de ser publicada, e publicamos
        as negativas também. Uma nota média só serve para alguma coisa se
        ninguém escolheu quais opiniões entram nela.
      </p>

      <h2>Comprando com a gente</h2>
      {/* The same list the home's Serviço strip renders (`lib/store.ts`). */}
      <ul>
        {BUYING_FACTS.map((fact) => (
          <li key={fact.label}>
            <strong>{fact.label}.</strong> {fact.text}
            {fact.link && (
              <>
                {" "}
                {fact.link.lead}{" "}
                <Link href={fact.link.href}>{fact.link.label}</Link>.
              </>
            )}
          </li>
        ))}
      </ul>

      <h2>Fale com a gente</h2>
      <p>
        Dúvida sobre um produto antes de comprar? Escreva para{" "}
        <a href={`mailto:${STORE.email}`}>{STORE.email}</a> ou veja as outras
        formas de <Link href="/contato">contato</Link>. Se preferir ir direto
        ao catálogo, comece por{" "}
        <Link href="/produtos">todos os produtos</Link>.
      </p>
    </article>
  );
};

export default AboutPage;
