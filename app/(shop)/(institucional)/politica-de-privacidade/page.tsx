import type { Metadata } from "next";
import Link from "next/link";
import { STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Quais dados pessoais a Hertz Lab coleta, para que os usa, com quem os compartilha e como você exerce seus direitos pela LGPD.",
};

const PrivacyPolicyPage = () => {
  return (
    <article>
      <header>
        <h1>Política de privacidade</h1>
        {/* A literal, edited with the text below it — never computed. */}
        <p>
          Última atualização: <time dateTime="2026-09-14">14 de setembro de 2026</time>
        </p>
      </header>

      <p>
        Esta política explica quais dados pessoais a {STORE.name} coleta, para
        que eles são usados e quais são os seus direitos, conforme a Lei Geral
        de Proteção de Dados (Lei nº 13.709/2018). Coletamos o necessário para
        vender e entregar, e nada além disso.
      </p>

      <h2>Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome, e-mail e senha. A senha é guardada
          apenas em formato criptografado, que nem nós conseguimos reverter.
        </li>
        <li>
          <strong>Compra:</strong> CPF ou CNPJ, telefone, data de nascimento
          (opcional) e os endereços de entrega que você cadastrar.
        </li>
        <li>
          <strong>Pedidos:</strong> produtos, valores, cupom usado, forma de
          entrega e o histórico de status de cada pedido.
        </li>
        <li>
          <strong>Pagamento:</strong> a forma de pagamento e o status da
          transação. Os dados do cartão são digitados em um formulário do
          Mercado Pago e nunca chegam aos nossos servidores.
        </li>
        <li>
          <strong>Uso da conta:</strong> itens do carrinho, produtos salvos nos
          favoritos e as avaliações que você escrever.
        </li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>
          Processar pedidos, cobrar, entregar e prestar atendimento, o que é
          necessário para cumprir o contrato de compra.
        </li>
        <li>
          Emitir nota fiscal e manter registros exigidos pela legislação
          fiscal, o que é uma obrigação legal.
        </li>
        <li>
          Proteger a sua conta e a loja contra fraudes e abusos, com base no
          nosso legítimo interesse.
        </li>
      </ul>
      <p>
        Não enviamos newsletter nem mensagens promocionais, não vendemos dados
        pessoais e não os usamos para publicidade.
      </p>

      <h2>Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Mercado Pago</strong>, para processar o pagamento.
        </li>
        <li>
          <strong>Correios</strong>, que recebem o nome e o endereço de entrega
          para levar o pedido até você.
        </li>
        <li>
          <strong>Provedores de infraestrutura</strong>, como hospedagem e banco
          de dados, que armazenam as informações em nosso nome e não podem
          usá-las para outro fim.
        </li>
        <li>
          <strong>Autoridades públicas</strong>, somente quando houver
          obrigação legal ou ordem judicial.
        </li>
      </ul>

      <h2>Avaliações públicas</h2>
      <p>
        Uma avaliação publicada mostra o seu primeiro nome e a inicial do
        sobrenome, a nota, o texto e a indicação de compra verificada. Seu
        e-mail e os dados do pedido nunca aparecem.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos apenas o cookie necessário para manter você conectado à sua
        conta. Não usamos cookies de publicidade nem ferramentas de análise de
        terceiros. Se você bloquear cookies no navegador, o catálogo continua
        acessível, mas não será possível entrar na conta nem comprar.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Os dados da conta ficam guardados enquanto ela existir. Pedidos e os
        dados necessários para a nota fiscal são mantidos pelo prazo exigido
        pela legislação fiscal, mesmo depois de a conta ser excluída. Um
        pedido é um registro do que aconteceu e, por isso, não é alterado
        depois de finalizado.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Pela LGPD, você pode, a qualquer momento:
      </p>
      <ul>
        <li>confirmar se tratamos seus dados e ter acesso a eles;</li>
        <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>pedir a portabilidade dos dados a outro fornecedor;</li>
        <li>
          pedir a exclusão da conta e dos dados que não precisamos manter por
          obrigação legal;
        </li>
        <li>saber com quem seus dados foram compartilhados.</li>
      </ul>
      <p>
        Nome, telefone, data de nascimento e endereços podem ser alterados
        diretamente em <Link href="/minha-conta/perfil">Perfil</Link> e{" "}
        <Link href="/minha-conta/enderecos">Endereços</Link>, na sua conta.
        Para os demais pedidos, incluindo a correção do CPF ou CNPJ e a
        exclusão da conta, escreva para{" "}
        <a href={`mailto:${STORE.email}`}>{STORE.email}</a>. Respondemos em até
        15 dias, e você também pode recorrer à Autoridade Nacional de Proteção
        de Dados (ANPD).
      </p>

      <h2>Contato do encarregado</h2>
      <p>
        O canal do encarregado pelo tratamento de dados pessoais é o mesmo
        e-mail de atendimento:{" "}
        <a href={`mailto:${STORE.email}`}>{STORE.email}</a>. Indique
        &ldquo;Privacidade&rdquo; no assunto.
      </p>

      <h2>Alterações</h2>
      <p>
        Esta política pode ser atualizada, e a data no topo desta página muda
        quando isso acontece. Nenhuma mudança passa a valer para dados já
        coletados sem que você seja informado.
      </p>
    </article>
  );
};

export default PrivacyPolicyPage;
