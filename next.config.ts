import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the local embedding model out of the bundle — it ships native ONNX
  // runtime binaries that must load from node_modules at runtime, not be
  // webpack/turbopack-bundled.
  // Native modules that must load from node_modules at runtime, not be bundled:
  // the ONNX runtime behind the local embedding model, and the SQLite/libSQL
  // driver bindings.
  serverExternalPackages: [
    "@huggingface/transformers",
    "@prisma/adapter-better-sqlite3",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "better-sqlite3",
  ],
  experimental: {
    // When the app is reached through a tunnel or a deployed host the browser's
    // Origin is that domain, not localhost. Without these, Next.js rejects every
    // form submission — login, signup, sending an assessment — as a cross-origin
    // request. Wildcards cover cloudflared/ngrok tunnels and Render deploys so a
    // fresh URL works without editing this file.
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.trycloudflare.com",
        "*.ngrok-free.app",
        "*.ngrok.app",
        "*.ngrok.io",
        "*.onrender.com",
      ],
    },
  },
};

export default nextConfig;
