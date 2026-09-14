import type { Metadata } from "next";
import Link from "next/link";
import { STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: "Trocas e devoluções",
  description:
    "Prazos e passo a passo para desistir de uma compra, trocar um produto com defeito e receber o reembolso na Hertz Lab.",
};

const ReturnsPolicyPage = () => {
  return (
    <article>
      <header>
        <h1>Trocas e devoluções</h1>
        {/* A literal, edited with the text below it — never computed. */}
        <p>
          Última atualização: <time dateTime="2026-09-14">14 de setembro de 2026</time>
        </p>
      </header>

      <p>
        Esta política vale para todos os pedidos feitos na {STORE.name} e segue
        o Código de Defesa do Consumidor (Lei nº 8.078/1990). Nada aqui reduz
        os direitos que a lei garante a você.
      </p>

      <h2>Desistência da compra</h2>
      <p>
        Você pode desistir de qualquer compra em até <strong>7 dias
        corridos</strong> contados a partir do recebimento, sem precisar
        explicar o motivo (art. 49 do Código de Defesa do Consumidor).
      </p>
      <ul>
        <li>
          Devolva o produto com todos os acessórios, cabos e manuais que vieram
          com ele. Pode abrir a embalagem e testar: conhecer o produto é o
          objetivo desse prazo.
        </li>
        <li>
          O frete de devolução é por nossa conta, e o reembolso inclui o frete
          pago na compra.
        </li>
        <li>
          Se algum item vier faltando ou com marcas de uso além do necessário
          para testá-lo, entramos em contato antes de concluir o reembolso.
        </li>
      </ul>

      <h2>Produto com defeito</h2>
      <p>
        Eletrônicos são bens duráveis, e a lei dá a você{" "}
        <strong>90 dias</strong> a partir do recebimento para reclamar de um
        defeito (art. 26). Quando o fabricante oferece garantia própria, ela se
        soma a esse prazo, não o substitui (art. 50).
      </p>
      <p>
        Recebido o produto, temos até 30 dias para resolver o problema (art.
        18). Se não for resolvido nesse prazo, você escolhe entre a troca por
        um produto igual em perfeitas condições, o reembolso integral ou um
        abatimento proporcional no preço.
      </p>

      <h2>Produto errado ou danificado no transporte</h2>
      <p>
        Confira a embalagem na entrega. Se ela estiver aberta, amassada ou
        molhada, você pode recusar o recebimento. Se o problema só aparecer
        depois de abrir a caixa, ou se o produto não for o que você pediu,
        escreva para nós assim que possível, com fotos da embalagem e do
        produto. A troca ou o reembolso, nesses casos, não tem custo para você.
      </p>

      <h2>Como solicitar</h2>
      <ol>
        <li>
          Escreva para <a href={`mailto:${STORE.email}`}>{STORE.email}</a> com
          o número do pedido, o produto e o motivo. Para defeitos, descreva o
          problema e, se puder, envie fotos ou um vídeo curto.
        </li>
        <li>
          Respondemos com as instruções e um código de postagem reversa dos
          Correios, válido em qualquer agência.
        </li>
        <li>
          Embale o produto com cuidado, de preferência na caixa original, e
          poste dentro da validade do código.
        </li>
        <li>
          Assim que o produto chegar e for conferido, confirmamos por e-mail a
          troca ou o reembolso.
        </li>
      </ol>
      <p>
        O pedido pode ser acompanhado a qualquer momento na página{" "}
        <Link href="/minha-conta/pedidos">Pedidos</Link> da sua conta.
      </p>

      <h2>Reembolso</h2>
      <p>
        O reembolso é feito pelo mesmo meio de pagamento usado na compra, em até
        5 dias úteis depois que o produto devolvido é conferido:
      </p>
      <ul>
        <li>
          <strong>Pix:</strong> devolvido para a conta de origem do pagamento.
        </li>
        <li>
          <strong>Cartão de crédito:</strong> estornado no cartão usado. O
          crédito aparece em uma das duas faturas seguintes, conforme a data de
          fechamento definida pelo emissor.
        </li>
        <li>
          <strong>Boleto:</strong> transferido para uma conta bancária de
          titularidade de quem fez o pedido, que pedimos por e-mail.
        </li>
      </ul>

      <h2>Pedidos ainda não enviados</h2>
      <p>
        Mudou de ideia antes de o pedido sair para entrega? Escreva para nós
        com o número do pedido. Se o pagamento já tiver sido confirmado,
        cancelamos o pedido e o reembolso segue as regras acima, sem precisar
        esperar nenhuma devolução.
      </p>
    </article>
  );
};

export default ReturnsPolicyPage;
