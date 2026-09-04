import Image from "next/image";

import { cn } from "@/lib/utils";
import { IMAGE_IDEAL_DIMENSION } from "@/lib/utils/image";
import { s3KeyToUrl } from "@/lib/utils/url";
import placeholder from "@/public/images/image-placeholder.jpg";

/**
 * **The one component that renders a stored picture to a shopper.** The card
 * in the grid, the gallery on the product page, the thumbnail strip, the cart
 * line and the Category tile all read the same object through this (ADR-0021),
 * and every one of them goes through `next/image`: the bucket holds a source
 * and not an asset, so what a Brazilian mobile connection downloads is a
 * rendition derived per breakpoint, never the Admin's 5 MB master.
 *
 * It owns the two things a call site would otherwise have to remember.
 *
 * **The fallback.** A missing key renders `image-placeholder.jpg` rather than
 * a broken image icon — archived Products appear in Order history, and
 * ADR-0021's publish rule only stops *new* pictureless Products going live.
 * The ternary lives here and nowhere else, because repeated at five call sites
 * it is five chances to forget one, and a sixth surface cannot forget what it
 * never writes.
 *
 * **The `sizes` prop**, which has no default on purpose: the width a picture
 * occupies is a fact about the layout around it, so only the call site knows
 * it, and an omitted `sizes` silently means `100vw` — a 1600 px rendition
 * shipped into a 300 px card, which is the cost this component exists to
 * avoid. Required, so the compiler asks the question.
 *
 * Admin tiles are deliberately not here: a `blob:` preview cannot go through
 * the optimizer, and a bucket object at thumbnail size on a page only an Admin
 * opens does not need to (`modules/products/admin/components/image-fields.tsx`).
 */
export function CatalogImage({
  s3Key,
  alt,
  sizes,
  className,
  priority = false,
}: {
  /** An S3 object key, or `null` wherever the row has no picture. */
  s3Key: string | null | undefined;
  /**
   * `product_image.alt_text`. A Category tile passes `""` — it is a link
   * already named by the Category, and describing the picture beside that name
   * makes a screen reader say the same word twice (ADR-0021).
   */
  alt: string;
  /** What the picture will measure, e.g. `"(min-width: 768px) 25vw, 50vw"`. */
  sizes: string;
  className?: string;
  /** For a cover above the fold, which lazy loading would otherwise delay. */
  priority?: boolean;
}) {
  // Square is the ratio (ADR-0021), and saying so in the class is what reserves
  // the space: the box is the right shape before a byte of the photograph
  // arrives, so nothing below it moves as one does.
  const shared = {
    sizes,
    priority,
    className: cn("bg-muted aspect-square w-full object-cover", className),
  };

  if (!s3Key) {
    // Statically imported, so its 612 × 612 reaches `next/image` as intrinsic
    // dimensions and the placeholder reserves the same box a photograph would.
    // `alt=""`: it depicts nothing, and announcing a placeholder to a screen
    // reader tells a shopper less than the product name beside it already does.
    return <Image {...shared} src={placeholder} alt="" />;
  }

  return (
    <Image
      {...shared}
      src={s3KeyToUrl(s3Key)}
      alt={alt}
      // The optimizer cannot measure a remote file, so the ratio is declared.
      // The ideal upload's numbers rather than the ceiling's: only their ratio
      // is read, and 1600 is the size the Admin was asked for.
      width={IMAGE_IDEAL_DIMENSION}
      height={IMAGE_IDEAL_DIMENSION}
    />
  );
}
