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
