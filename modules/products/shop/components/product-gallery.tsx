import { CatalogImage } from "@/components/catalog-image";
import { cn } from "@/lib/utils";
import type { ProductPurchaseFields } from "@/modules/products/shop/types";

/**
 * The selected Variant's photographs: one large square and, when there is
 * more than one, a strip of thumbnails that choose it. Which Images these are
 * — the Variant's own, else the Product's, never a sibling's — is decided
 * before they arrive (`purchase.ts`).
 *
 * Rendered inside `ProductPurchase`'s client graph, which is why it carries no
 * directive of its own. No zoom, no carousel motion, no autoplay (DESIGN.md):
 * a thumbnail swaps the picture and nothing moves.
 *
 * An empty Gallery — a Product published before every Variant had to be
 * photographed — renders `CatalogImage`'s placeholder in the same box.
 */
export function ProductGallery({
  images,
  selectedIndex,
  onSelect,
}: {
  images: ProductPurchaseFields["images"];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const selected = images[selectedIndex];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border">
        <CatalogImage
          // Keyed by Image, so a swap never shows the previous photograph
          // under the new one's alt text while it loads.
          key={selected?.id ?? "placeholder"}
          s3Key={selected?.s3Key}
          alt={selected?.altText ?? ""}
          // Full width until `md`; then half of `max-w-7xl`, and seven
          // twelfths of it from `lg`.
          sizes="(min-width: 1280px) 700px, (min-width: 1024px) 55vw, (min-width: 768px) 50vw, 100vw"
          priority
        />
      </div>

      {images.length > 1 && (
        <ul
          aria-label="Fotos do produto"
          className="grid grid-cols-5 gap-3 sm:grid-cols-6">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                aria-label={`Foto ${index + 1} de ${images.length}`}
                aria-pressed={index === selectedIndex}
                onClick={() => onSelect(index)}
                className={cn(
                  "focus-visible:outline-ring block w-full overflow-hidden rounded-md border transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
                  index === selectedIndex
                    ? "border-foreground"
                    : "hover:border-foreground/40",
                )}>
                {/* Decorative: the button is named, and the large picture
                    carries the description. */}
                <CatalogImage s3Key={image.s3Key} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
