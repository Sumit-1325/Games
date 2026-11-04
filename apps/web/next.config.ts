import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@cogniarena/game-core", "@cogniarena/grid-recall"],
};

export default nextConfig;
