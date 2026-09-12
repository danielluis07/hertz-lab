import { z } from "zod";

/** The stable pair that orders and resumes the public Review list. */
export const reviewCursorSchema = z.object({
  createdAt: z.date(),
  id: z.string().min(1),
});

export type ReviewCursor = z.infer<typeof reviewCursorSchema>;
