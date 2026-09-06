// Prisma client for Cloudflare Workers (edge runtime).
// Uses the driver adapter pattern since the standard Prisma engine binary
// cannot run in the Workers runtime.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export interface Env {
  DATABASE_URL: string;
  MEDIA_BUCKET: R2Bucket;
  SUPABASE_URL: string;
  // Public anon/publishable key only. The service-role key is never used by
  // this backend -- see middleware/auth.ts for why it isn't needed.
  SUPABASE_ANON_KEY: string;
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
  // @prisma/adapter-pg 5.22+ requires a real `pg.Pool` instance, not a
  // plain { connectionString } object (the latter throws at request time:
  // "PrismaPg must be initialized with an instance of Pool"). Workers can
  // construct one thanks to the `nodejs_compat` compatibility flag already
  // set in wrangler.toml, which is what makes `pg`'s TCP socket usage work
  // in the Workers runtime at all.
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  cachedClient = new PrismaClient({ adapter });
  return cachedClient;
}
