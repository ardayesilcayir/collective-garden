import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Üst dizindeki başka bir lock dosyası kök sanılmasın.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
