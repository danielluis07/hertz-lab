/**
 * The global tier of ADR-0013: pt-BR copy for the failures that belong to the
 * transport rather than to a module. tRPC's codes are a fixed enum and their
 * copy is domain-free, which is what keeps this table out of `modules/`
 * (ADR-0007) and what lets one handler on the MutationCache speak for every
 * mutation in the app.
 */

/** Shown when the request never reached a tRPC response — offline, DNS, CORS. */
export const TRANSPORT_UNREACHABLE_MESSAGE =
  "Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.";

export const TRANSPORT_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Sua sessão expirou. Entre novamente para continuar.",
  FORBIDDEN: "Você não tem permissão para fazer isso.",
  NOT_FOUND: "Este item não existe mais. Atualize a página.",
  CONFLICT: "Este item mudou enquanto você trabalhava. Atualize a página.",
  BAD_REQUEST: "Os dados enviados não foram aceitos. Revise e tente novamente.",
  PAYLOAD_TOO_LARGE: "O conteúdo enviado é grande demais.",
  TIMEOUT: "A operação demorou demais e foi interrompida. Tente novamente.",
  TOO_MANY_REQUESTS: "Muitas tentativas seguidas. Aguarde um instante.",
  INTERNAL_SERVER_ERROR: "Algo deu errado. Tente novamente em instantes.",
};

/** The shape of a failed mutation this tier reads — nothing more of it. */
type MutationError = {
  message?: string;
  data?: {
    code?: string;
    field?: string | null;
    zodError?: unknown;
  } | null;
};

/**
 * The sentence to toast for a failed mutation, or `null` when the global tier
 * must stay silent because a form will render the error inline.
 *
 * Branches on `data.code`, never on `message`: the message is copy, and copy
 * changes. A procedure's own message wins over the table — it is the module
 * tier speaking — except under INTERNAL_SERVER_ERROR, where the message is an
 * uncaught error's English text and is never shown.
 */
export function mutationErrorMessage(error: MutationError): string | null {
  const data = error.data;

  // No `data` at all: the request never reached the server, so there is no
  // code to branch on.
  if (!data) return TRANSPORT_UNREACHABLE_MESSAGE;

  // A field payload *is* the signal that a form renders this one (ADR-0013).
  if (data.field || data.zodError) return null;

  const code = data.code ?? "INTERNAL_SERVER_ERROR";
  const fallback =
    TRANSPORT_ERROR_MESSAGES[code] ??
    TRANSPORT_ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  if (code === "INTERNAL_SERVER_ERROR") return fallback;

  // tRPC fills an omitted message with the code itself; that is not copy.
  const message = error.message;
  if (message && message !== code) return message;

  return fallback;
}
