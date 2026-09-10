import { z } from "zod";

/**
 * The Cart's write vocabulary: the `.input()` of `cart.add`,
 * `cart.setQuantity` and `cart.remove`.
 *
 * A quantity is a positive whole number of units. **Zero is refused, never
 * read as a removal** — `cart.remove` is its own write — so a stepper that
 * reaches zero must call removal rather than send it. The ceiling is not here:
 * it is the Variant's stock, which only the procedure can read.
 *
 * The Cart's controls never send a value these refuse. Should one, the error
 * carries a `zodError`, which ADR-0013's global handler leaves to the call
 * site — so the messages are pt-BR for the call site that renders them.
 */

const variantId = z.string().min(1, "Escolha uma variação.");

export const cartQuantitySchema = z
  .int({ error: "Informe uma quantidade válida." })
  .positive("A quantidade deve ser de pelo menos 1 unidade.");

/** Added to whatever the line already holds; the line is created if absent. */
export const addToCartSchema = z.object({
  variantId,
  quantity: cartQuantitySchema,
});

/** The line's new absolute quantity. */
export const setCartQuantitySchema = z.object({
  variantId,
  quantity: cartQuantitySchema,
});

export const removeCartItemSchema = z.object({ variantId });
