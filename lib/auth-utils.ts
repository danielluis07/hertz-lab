import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import type { Session, UserRole } from "@/types/auth";

export const getCurrentSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Verify if the user is authenticated
 * Redirects to /login if not authenticated
 *
 * @returns User session if authenticated
 */
export const requireAuth = async (): Promise<Session> => {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
};

/**
 * Verify if the user has one of the allowed roles
 * Redirect to /login if not authenticated
 * Redirect to / if authenticated but not authorized
 *
 * @param allowedRoles - Array of allowed roles for the route
 * @returns User session
 */

export const requireRole = async (
  allowedRoles: UserRole[],
): Promise<Session> => {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role)) {
    redirect("/");
  }

  return session;
};

/**
 * Shortcut for requireRole with "admin" role
 *
 * @returns User admin session
 */
export const requireAdmin = async (): Promise<Session> => {
  return requireRole(["admin"]);
};

/**
 * Verify if the user is authenticated and has role "user"
 *
 * @returns User session with role "user"
 *
 * @example
 * const session = await requireUser();
 */
export const requireUser = async (): Promise<Session> => {
  return requireRole(["user"]);
};
