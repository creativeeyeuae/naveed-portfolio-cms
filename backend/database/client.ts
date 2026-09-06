// Prisma client for Cloudflare Workers (edge runtime).
// Uses the driver adapter pattern since the standard Prisma engine binary
// cannot run in the Workers runtime.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export interface Env {
  // Split into discrete fields on purpose -- NOT a single connection-string
  // URL. A password containing characters like @ # % / : ? breaks URL
  // parsing unless perfectly percent-encoded (this is exactly what caused
  // "Authentication failed for user postgres" when DATABASE_URL held an
  // unencoded special-character password). None of these individual values
  // are secret except DB_PASSWORD -- host/port/user/database are plain
  // `[vars]` in wrangler.toml; only DB_PASSWORD is a `wrangler secret`.
  DB_HOST: string;
  DB_PORT: string;
  DB_USER: string;
  DB_NAME: string;
  DB_PASSWORD: string;
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
  //
  // Discrete fields instead of a connectionString: `password` is passed to
  // pg as a literal value with no URL encoding/decoding step, so special
  // characters in the real database password just work -- there is no
  // string to percent-encode correctly in the first place.
  //
  // Supabase's pooler requires TLS; rejectUnauthorized:false is the setting
  // Supabase's own docs/quickstarts use for serverless/edge runtimes that
  // don't carry a full system CA bundle. The connection is still encrypted,
  // just without verifying the certificate chain.
  const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  cachedClient = new PrismaClient({ adapter });
  return cachedClient;
}
