"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewSchema,
  type ReviewFormInput,
  type ReviewFormValues,
} from "@/modules/reviews/schemas";
import { RatingInput } from "@/modules/reviews/shop/components/rating-input";
import { useCreateReview } from "@/modules/reviews/shop/hooks/use-create-review";

/**
 * The Review form, shown only to an `eligible` shopper. It sends the Product
 * and what the shopper wrote — never a User or an Order: the mutation proves
 * the delivered purchase itself, and this form's existence authorizes nothing.
 *
 * One disabled `<fieldset>` holds every control while the write is in flight,
 * submit included, so the Review cannot be sent twice. On failure the values
 * stay where they are and the global tier speaks (ADR-0013); on success or a
 * duplicate the island refetches and this form unmounts.
 *
 * Its submit is `outline`: the Product page's one vermilion fill is its Cart
 * action (DESIGN.md).
 */
export function ReviewForm({ productId }: { productId: string }) {
  const create = useCreateReview();

  const form = useForm<ReviewFormInput, unknown, ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { productId, title: "", body: "" },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        if (!create.isPending) create.mutate(values);
      })}
      noValidate>
      <FieldSet disabled={create.isPending} className="gap-6">
        <FieldGroup>
          <Controller
            name="rating"
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldSet data-invalid={fieldState.invalid} className="gap-2">
                <FieldLegend variant="label">Sua nota</FieldLegend>
                <RatingInput
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
                <FieldError errors={[fieldState.error]} />
              </FieldSet>
            )}
          />

          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="review-title">
                  Título <span className="text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id="review-title"
                  maxLength={120}
                  placeholder="Resuma sua experiência"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="body"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="review-body">Sua avaliação</FieldLabel>
                <Textarea
                  {...field}
                  id="review-body"
                  rows={5}
                  maxLength={2_000}
                  placeholder="Como é o som, o conforto, o acabamento? Conte o que outros compradores precisam saber."
                  aria-invalid={fieldState.invalid}
                  aria-describedby="review-body-hint"
                  className="min-h-32"
                />
                <FieldDescription id="review-body-hint">
                  De 20 a 2.000 caracteres ·{" "}
                  <span className="tabular-nums">{field.value.length}</span>{" "}
                  escritos
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="submit" variant="outline" size="lg">
            {create.isPending && <Spinner aria-hidden data-icon="inline-start" />}
            Enviar avaliação
          </Button>
          <p className="text-muted-foreground text-sm">
            Avaliações passam por moderação antes de serem publicadas.
          </p>
        </div>
      </FieldSet>
    </form>
  );
}
