import type { Metadata } from "next";
import Link from "next/link";
import { STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "As regras para criar uma conta, comprar, pagar e avaliar produtos na Hertz Lab.",
};

const TermsOfUsePage = () => {
  return (
    <article>
      <header>
        <h1>Termos de uso</h1>
        {/* A literal, edited with the text below it — never computed. */}
        <p>
          Última atualização: <time dateTime="2026-09-14">14 de setembro de 2026</time>
        </p>
      </header>

      <p>
        Estes termos descrevem as regras para usar o site da {STORE.name} e
        comprar nele. Ao criar uma conta ou fazer um pedido, você declara que
        leu e concorda com eles. Eles não afastam nenhum direito previsto no
        Código de Defesa do Consumidor.
      </p>

      <h2>1. Conta</h2>
      <p>
        Navegar pelo catálogo não exige cadastro, mas comprar, salvar
        favoritos e avaliar produtos exige uma conta com nome, e-mail e senha.
        Não há compra sem conta.
      </p>
      <ul>
        <li>As informações do cadastro devem ser verdadeiras e suas.</li>
        <li>
          A senha é pessoal. Você é responsável pelo que for feito com a sua
          conta até nos avisar de um uso indevido.
        </li>
        <li>
          Podemos suspender uma conta usada para fraude, para burlar limites
          de cupons ou para publicar conteúdo que viole estes termos.
        </li>
      </ul>

      <h2>2. Produtos e preços</h2>
      <p>
        Os preços estão em reais e incluem os impostos. O frete é calculado à
        parte, no checkout. Fotos e especificações são fornecidas com cuidado,
        mas pequenas variações de cor ou de acabamento em relação à imagem
        podem acontecer.
      </p>
      <p>
        Preços e estoque podem mudar a qualquer momento, inclusive enquanto um
        produto está no seu carrinho: o carrinho sempre mostra o preço atual. O
        que vale para a sua compra é o preço exibido no momento em que o pedido
        é finalizado, e ele não muda depois disso.
      </p>

      <h2>3. Pedidos e pagamento</h2>
      <p>
        Um pedido é registrado quando você o finaliza no checkout, e é nesse
        momento que o estoque é reservado. O pagamento pode ser feito por Pix,
        cartão de crédito ou boleto, e é processado pelo Mercado Pago.
      </p>
      <ul>
        <li>
          Os dados do cartão são enviados diretamente ao Mercado Pago. A{" "}
          {STORE.name} não os recebe nem os armazena.
        </li>
        <li>
          O pedido só é preparado para envio depois que o pagamento é
          aprovado. Se um pagamento for recusado ou expirar, você pode tentar
          novamente pelo próprio pedido, sem refazer a compra.
        </li>
        <li>
          Podemos cancelar um pedido com indício de fraude ou com erro evidente
          de preço. Nesses casos, avisamos por e-mail e devolvemos integralmente
          qualquer valor pago.
        </li>
      </ul>

      <h2>4. Cupons</h2>
      <p>
        Cada pedido aceita um cupom, que dá desconto sobre o pedido inteiro.
        Cada cupom tem sua própria validade e seu limite de uso, informados
        quando ele é divulgado. Cupons não são convertidos em dinheiro.
      </p>

      <h2>5. Entrega</h2>
      <p>
        As entregas são feitas pelos Correios, via PAC ou SEDEX. O prazo
        mostrado no checkout é contado em dias úteis a partir da aprovação do
        pagamento. Confira o endereço antes de finalizar o pedido: depois que
        ele é registrado, o endereço de entrega não pode ser alterado pelo site.
      </p>

      <h2>6. Trocas e devoluções</h2>
      <p>
        Prazos de desistência, garantia e reembolso estão descritos em{" "}
        <Link href="/trocas-e-devolucoes">Trocas e devoluções</Link>.
      </p>

      <h2>7. Avaliações</h2>
      <p>
        Só pode avaliar um produto quem o recebeu em um pedido feito na{" "}
        {STORE.name}. Toda avaliação é moderada antes da publicação e aparece
        com o seu primeiro nome e a inicial do sobrenome. Não publicamos
        avaliações com ofensas, dados pessoais, links ou conteúdo sem relação
        com o produto. Uma avaliação não é recusada por ser negativa.
      </p>

      <h2>8. Propriedade intelectual</h2>
      <p>
        A marca {STORE.name}, o logotipo, os textos e o design do site
        pertencem à {STORE.name}. Nomes e marcas de produtos pertencem aos seus
        fabricantes. Nada disso pode ser copiado para uso comercial sem
        autorização.
      </p>

      <h2>9. Privacidade</h2>
      <p>
        O tratamento dos seus dados pessoais está descrito na{" "}
        <Link href="/politica-de-privacidade">Política de privacidade</Link>.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Estes termos podem ser atualizados, e a data no topo desta página muda
        quando isso acontece. Um pedido já feito continua regido pelos termos
        vigentes no dia em que foi finalizado.
      </p>

      <h2>11. Lei aplicável e contato</h2>
      <p>
        Estes termos seguem a legislação brasileira. Qualquer disputa pode ser
        levada ao foro do seu domicílio, como prevê o Código de Defesa do
        Consumidor. Antes disso, escreva para{" "}
        <a href={`mailto:${STORE.email}`}>{STORE.email}</a>: quase tudo se
        resolve por lá.
      </p>
    </article>
  );
};

export default TermsOfUsePage;
