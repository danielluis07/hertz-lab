"use client";

import { useEffect, useState } from "react";
import {
  useWatch,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormReturn,
} from "react-hook-form";
import { slugify } from "@/lib/utils/slug";

/**
 * The two fields every form that has this behaviour registers. They are
 * literals rather than props because the vocabulary is the same on every one
 * of them — `CONTEXT.md` gives a Product, a Brand and a Category each a name
 * and a Slug — and a pair of parameters would only let a caller misspell one.
 */
const NAME = "name";
const SLUG = "slug";

/**
 * The slug follows the name while the Admin has not typed in it, so nobody
 * writes the same words twice.
 *
 * **This is form behaviour, not a rule.** ADR-0005 has a Slug chosen rather
 * than derived: the prefill is a convenience that stops the moment it would
 * overwrite a choice, and nothing about it decides what a valid Slug is. That
 * is what makes it global under ADR-0007 — it knows the shape of a form with a
 * name and a slug, and knows nothing about what either identifies.
 *
 * It arrives here on its **second** caller, which is the gate
 * `docs/MODULES.md` sets: the products form wrote it first and the Category
 * form is the second, with the Brand form behind it.
 *
 * `follows` is the caller's, and it keys on the *values* rather than on a
 * create/edit mode: an empty slug is a thing that has never had a URL, while a
 * filled one is a public address that fixing a typo in the name must not
 * silently rewrite. So a create form passes `defaultValues.slug === ""` and
 * gets `true`, an edit form gets `false`, and neither form needs a `mode` prop
 * to say so.
 *
 * The two casts are what a hook generic over a form's values costs: TypeScript
 * cannot prove that an arbitrary `TValues` has these two paths, and the
 * constraint below is what makes it true at every call site.
 */
export function useSlugFromName<
  TValues extends FieldValues & { name: string; slug: string },
>({ form, follows }: { form: UseFormReturn<TValues>; follows: boolean }) {
  // `useWatch`, never `form.watch()`: the latter re-renders the whole form on
  // every keystroke of every field and opts the component out of the React
  // Compiler.
  const name = useWatch({
    control: form.control,
    name: NAME as Path<TValues>,
  });

  /**
   * Taking the field over is its own state and not `dirtyFields.slug`, which
   * un-sets when a value returns to its default: an Admin who typed a slug and
   * then cleared it would have the name start writing into it again.
   */
  const [hasTyped, setHasTyped] = useState(false);

  useEffect(() => {
    if (!follows || hasTyped) return;

    // No `shouldDirty`: the prefill itself must not read as the Admin taking
    // the field over, or the first keystroke in the name would end it.
    form.setValue(
      SLUG as Path<TValues>,
      slugify(name) as PathValue<TValues, Path<TValues>>,
    );
  }, [follows, form, hasTyped, name]);

  /**
   * What the slug input calls from its own `onChange`, before the field's.
   * The hook cannot detect this for itself: `setValue` above and an Admin
   * typing are the same write to the same field, and only the control knows
   * which of the two it was.
   */
  return { stopFollowing: () => setHasTyped(true) };
}
