const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // A stray package-lock.json in the user's home directory (outside this
  // project) was making Next.js mis-infer the workspace root, which in turn
  // broke dynamic-route detection (e.g. /work/[slug] wrongly reported as
  // "missing generateStaticParams"). Pin the root explicitly, as Next's own
  // build warning recommends.
  outputFileTracingRoot: path.join(__dirname),
}

module.exports = nextConfig
