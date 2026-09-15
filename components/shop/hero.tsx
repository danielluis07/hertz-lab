import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import hero from "@/public/images/home-hero.jpg";

{
  /*
        The Hero (ADR-0028, DESIGN.md). The photograph is a subject centred on
        an empty ground, and the heading is set in that ground: split around
        her head at ear level, so the line reads *through* the headphones, one
        half per channel. The ground is near-white, so ink sits on it at full
        contrast with no scrim.

        That only holds where the side bands are wide enough to carry display
        type, and below `lg` they are not. There the photograph is dropped
        rather than stacked above the text: on a phone it would push the
        heading and the action below the fold for a picture the heading can
        no longer sit in, so the Hero is its type alone.

        The split is geometry, not guesswork: the box is 16:9 and only ever
        loses height to the 70svh cap, so the photograph always spans the
        viewport's width and her head always sits between 39vw and 61vw. The
        grid's middle column is that span plus air, in `vw`, so it stays on
        her at any width the container allows. `h1` is one element with two
        spans on a subgrid: a screen reader hears one sentence.
      */
}

export const Hero = () => {
  return (
    <section className="relative">
      <div className="bg-muted relative hidden aspect-video max-h-[70svh] w-full overflow-hidden lg:block">
        <Image
          src={hero}
          alt=""
          preload
          // `hidden` does not stop a fetch: `preload` writes a `<link>` into
          // the head, and the browser downloads whatever candidate `sizes`
          // picks whatever the CSS says. So below `lg` it asks for 1vw, the
          // smallest rendition — tens of bytes — instead of a full-width
          // hero a phone never shows. Kept as `vw`, not `px`: Next only
          // emits candidates that small when the smallest `vw` value allows.
          sizes="(min-width: 1024px) 100vw, 1vw"
          placeholder="blur"
          // When the 70svh cap trims height, it trims the sweater, not the
          // headband.
          className="size-full object-cover object-[50%_20%]"
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 pt-12 md:pt-16 lg:absolute lg:inset-0 lg:grid lg:grid-cols-[1fr_26vw_1fr] lg:grid-rows-[34fr_auto_66fr] lg:py-0">
        <h1 className="text-5xl font-medium tracking-tight md:text-6xl lg:col-span-3 lg:row-start-2 lg:grid lg:grid-cols-subgrid">
          <span className="lg:text-right">Ouça cada</span>{" "}
          <span className="lg:col-start-3">detalhe.</span>
        </h1>

        <div className="mt-5 flex flex-col items-start gap-6 lg:col-start-3 lg:row-start-3 lg:mt-5">
          <p className="text-muted-foreground max-w-xs text-base">
            Fones, caixas de som e eletrônicos escolhidos pela ficha técnica.
          </p>
          {/* The page's one vermilion element (DESIGN.md). A link dressed
                    as a button, not a `Button` rendering one, which would
                    announce it with `role="button"`. */}
          <Link
            href="/produtos"
            className={buttonVariants({
              size: "lg",
              className: "h-10 px-4",
            })}>
            Explorar produtos
            <ArrowRightIcon aria-hidden data-icon="inline-end" />
          </Link>
        </div>
      </div>
    </section>
  );
};
