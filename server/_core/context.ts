import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { DbUser } from "../db";
import { authenticateRequest } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: DbUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: DbUser | null = null;

  try {
    user = await authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
