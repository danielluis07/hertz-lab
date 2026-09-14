"use client";

import { StarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  REVIEW_RATING_LABELS,
  REVIEW_RATINGS,
} from "@/modules/reviews/shop/constants";

/**
 * The Review form's rating: five native radios drawn as stars.
 *
 * Native radios, not a custom widget, because they already are the accessible
 * control — one tab stop, arrow keys to move, a spoken name per choice, and a
 * disabled `<fieldset>` around the form reaches them with no prop. The radio is
 * visually hidden; its label is the star, and the focus ring moves onto it.
 *
 * Hovering previews the stars up to the pointer, and leaving restores the
 * chosen value. Ink throughout — the page's accent belongs to its Cart action.
 */
export function RatingInput({
  name,
  value,
  onChange,
  onBlur,
  inputRef,
}: {
  name: string;
  value: number | undefined;
  onChange: (rating: number) => void;
  onBlur: () => void;
  /** React Hook Form's ref, so a missing rating receives focus on submit. */
  inputRef: React.Ref<HTMLInputElement>;
}) {
  const [previewed, setPreviewed] = useState<number | null>(null);
  const shown = previewed ?? value ?? 0;

  return (
    <div className="flex w-fit gap-1" onMouseLeave={() => setPreviewed(null)}>
      {REVIEW_RATINGS.map((rating) => (
        <label
          key={rating}
          onMouseEnter={() => setPreviewed(rating)}
          className="has-focus-visible:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50 cursor-pointer rounded-sm p-1 has-focus-visible:ring-3">
          <input
            ref={rating === (value ?? REVIEW_RATINGS[0]) ? inputRef : undefined}
            type="radio"
            name={name}
            value={rating}
            checked={value === rating}
            onChange={() => onChange(rating)}
            onBlur={onBlur}
            className="sr-only"
          />
          <StarIcon
            aria-hidden
            className={cn(
              "size-7 transition-colors duration-150 ease-out motion-reduce:transition-none",
              rating <= shown
                ? "fill-current"
                : "text-muted-foreground/60",
            )}
          />
          <span className="sr-only">{REVIEW_RATING_LABELS[rating]}</span>
        </label>
      ))}
    </div>
  );
}
