import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Multipart uploads are inspected by the framework before API route handling.
  // Allow a 12 MiB file plus multipart metadata; the upload route enforces 12 MiB.
  experimental: { serverActions: { bodySizeLimit: '13mb' } },
};

export default nextConfig;
