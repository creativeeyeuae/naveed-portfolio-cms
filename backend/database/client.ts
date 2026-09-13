// Prisma client for Cloudflare Workers using Hyperdrive.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export interface Env {
  HYPERDRIVE: Hyperdrive;

  MEDIA_BUCKET: R2Bucket;

  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;

  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;

  ADMIN_PIN?: string;
}

export function getPrismaClient(env: Env): PrismaClient {
  const pool = new Pool({
    connectionString: env.HYPERDRIVE.connectionString,
    max: 1,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
  });
}