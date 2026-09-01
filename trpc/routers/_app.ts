import { createTRPCRouter } from "@/trpc/init";
import type { inferRouterOutputs } from "@trpc/server";

export const appRouter = createTRPCRouter({});

export type AppRouter = typeof appRouter;
export type RouterOutput = inferRouterOutputs<AppRouter>;
