import { describe, expect, test } from "bun:test";
import { reviewSchema } from "@/modules/reviews/schemas";

const validReview = {
  productId: "product-id",
  rating: 5,
  title: "Excelente som",
  body: "Qualidade excelente e acabamento muito cuidadoso.",
};

describe("reviewSchema.rating", () => {
  test("accepts only whole ratings from one through five", () => {
    expect(reviewSchema.safeParse({ ...validReview, rating: 1 }).success).toBe(
      true,
    );
    expect(reviewSchema.safeParse({ ...validReview, rating: 5 }).success).toBe(
      true,
    );
    expect(reviewSchema.safeParse({ ...validReview, rating: 0 }).success).toBe(
      false,
    );
    expect(reviewSchema.safeParse({ ...validReview, rating: 6 }).success).toBe(
      false,
    );
    expect(reviewSchema.safeParse({ ...validReview, rating: 4.5 }).success).toBe(
      false,
    );
  });
});

describe("reviewSchema.title", () => {
  test("trims a title and normalizes an empty one to null", () => {
    expect(
      reviewSchema.parse({ ...validReview, title: "  Excelente som  " }).title,
    ).toBe("Excelente som");
    expect(reviewSchema.parse({ ...validReview, title: "   " }).title).toBeNull();
    expect(reviewSchema.parse({ ...validReview, title: null }).title).toBeNull();
    expect(reviewSchema.parse({ ...validReview, title: undefined }).title).toBeNull();
  });

  test("accepts at most 120 characters", () => {
    expect(
      reviewSchema.safeParse({ ...validReview, title: "a".repeat(120) }).success,
    ).toBe(true);
    expect(
      reviewSchema.safeParse({ ...validReview, title: "a".repeat(121) }).success,
    ).toBe(false);
  });
});

describe("reviewSchema.body", () => {
  test("trims the body and accepts from 20 through 2,000 characters", () => {
    expect(
      reviewSchema.parse({ ...validReview, body: `  ${"a".repeat(20)}  ` }).body,
    ).toBe("a".repeat(20));
    expect(
      reviewSchema.safeParse({ ...validReview, body: "a".repeat(2_000) })
        .success,
    ).toBe(true);
    expect(
      reviewSchema.safeParse({ ...validReview, body: "a".repeat(19) }).success,
    ).toBe(false);
    expect(
      reviewSchema.safeParse({ ...validReview, body: "a".repeat(2_001) })
        .success,
    ).toBe(false);
  });
});
