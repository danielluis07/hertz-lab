/**
 * The store's own facts, as the footer's Contato column and `/contato` both
 * render them — two callers and no rule, so ordinary shared data.
 *
 * **Plausible fiction.** Hertz Lab is a portfolio store: this inbox does not
 * exist and nobody answers at these hours. Do not wire a real mailbox to the
 * address, and do not add a CNPJ, street address or phone number here without
 * a real business behind them — a fabricated one on a storefront reads as a
 * claim.
 */
export const STORE = {
  name: "Hertz Lab",
  email: "atendimento@hertzlab.com.br",
  serviceHours: "Segunda a sexta, das 9h às 18h",
} as const;

type BuyingFact = {
  /** Names the fact on its own, as a meta label or a lead-in. */
  label: string;
  text: string;
  link?: { lead: string; label: string; href: string };
};

/**
 * What buying here involves, as the home's Serviço strip and `/sobre` both
 * render it — one list, so the two pages cannot drift apart.
 *
 * **Only what the checkout honours.** Every entry describes something the
 * checkout already does. There is no free-shipping threshold and no
 * installment plan: neither belongs here until the checkout offers it, and an
 * entry changes in the same commit as the behaviour it describes.
 */
export const BUYING_FACTS: readonly BuyingFact[] = [
  {
    label: "Pagamento",
    text: "Pix, cartão de crédito ou boleto, processado pelo Mercado Pago.",
  },
  {
    label: "Entrega",
    text: "Pelos Correios, via PAC ou SEDEX, com prazo e valor calculados no checkout.",
  },
  {
    label: "Trocas",
    text: "Sete dias para desistir da compra depois de receber o produto, como garante o Código de Defesa do Consumidor.",
    link: {
      lead: "Os detalhes estão em",
      label: "Trocas e devoluções",
      href: "/trocas-e-devolucoes",
    },
  },
];
