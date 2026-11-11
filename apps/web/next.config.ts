import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: [
    "@cogniarena/game-core",
    "@cogniarena/grid-recall",
    "@cogniarena/missing-digits",
    "@cogniarena/motion-maze",
    "@cogniarena/db",
    "@cogniarena/ui"
  ],
  // PGlite loads its WebAssembly files from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
