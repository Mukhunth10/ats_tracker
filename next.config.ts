import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the local embedding model out of the bundle — it ships native ONNX
  // runtime binaries that must load from node_modules at runtime, not be
  // webpack/turbopack-bundled.
  serverExternalPackages: ["@huggingface/transformers"],
  experimental: {
    // When the app is reached through a tunnel (for an HR demo) the browser's
    // Origin is the tunnel domain, not localhost. Without these, Next.js rejects
    // every form submission — login, signup, sending an assessment — as a
    // cross-origin request. The wildcards cover cloudflared and ngrok's random
    // subdomains so a fresh tunnel URL works without editing this file.
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.trycloudflare.com",
        "*.ngrok-free.app",
        "*.ngrok.app",
        "*.ngrok.io",
      ],
    },
  },
};

export default nextConfig;
