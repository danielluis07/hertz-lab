import type { Metadata } from "next";
import Link from "next/link";
import { STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com a ${STORE.name} por e-mail: dúvidas sobre produtos, pedidos, trocas e devoluções.`,
};

/**
 * No form: there is no backend behind one, and a dead input is worse than no
 * input. The facts are the footer's, read from the same `lib/store.ts` — which
 * is also why there is no phone or WhatsApp line here (see that file).
 */
const ContactPage = () => {
  return (
    <article>
      <header>
        <h1>Contato</h1>
      </header>

      <p>
        Atendemos por e-mail. Escreva sobre um produto antes de comprar, um
        pedido em andamento ou qualquer coisa que não tenha ficado clara no
        site.
      </p>

      <dl>
        <dt>E-mail</dt>
        <dd>
          <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
        </dd>
        <dt>Horário de atendimento</dt>
        <dd>{STORE.serviceHours}, exceto feriados nacionais.</dd>
      </dl>

      <h2>Sobre um pedido</h2>
      <p>
        Informe o número do pedido no assunto da mensagem. Você o encontra na
        página <Link href="/minha-conta/pedidos">Pedidos</Link> da sua conta,
        junto com o status do pagamento e da entrega.
      </p>
      <p>
        Quer trocar ou devolver um produto? O prazo e o passo a passo estão em{" "}
        <Link href="/trocas-e-devolucoes">Trocas e devoluções</Link>.
      </p>
    </article>
  );
};

export default ContactPage;
