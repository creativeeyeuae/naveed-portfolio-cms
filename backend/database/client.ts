// Prisma client for Cloudflare Workers (edge runtime).
// Uses the driver adapter pattern since the standard Prisma engine binary
// cannot run in the Workers runtime.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export interface Env {
  DATABASE_URL: string;
  MEDIA_BUCKET: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
  // Optional on purpose: the admin-auth route fails closed when this is unset,
  // rather than falling back to any default PIN value.
  ADMIN_PIN?: string;
}

let cachedClient: PrismaClient | null = null;

export function getPrismaClient(env: Env): PrismaClient {
  if (cachedClient) return cachedClient;
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  cachedClient = new PrismaClient({ adapter });
  return cachedClient;
}
