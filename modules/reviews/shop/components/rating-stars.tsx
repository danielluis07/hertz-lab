import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { REVIEW_RATINGS } from "@/modules/reviews/shop/constants";

/**
 * A Review's rating as five stars, read aloud as one sentence.
 *
 * Ink, never vermilion: a column of Reviews each carrying the accent would be
 * five indicator lights at once (DESIGN.md). Filled against a quiet outline is
 * the whole difference, which also survives a monochrome print.
 */
export function RatingStars({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-0.5", className)}>
      <span className="sr-only">Nota {rating} de 5</span>
      {REVIEW_RATINGS.map((star) => (
        <StarIcon
          key={star}
          aria-hidden
          className={cn(
            "size-4",
            star <= rating ? "fill-current" : "text-muted-foreground/60",
          )}
        />
      ))}
    </span>
  );
}
