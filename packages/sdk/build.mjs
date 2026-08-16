import { build } from "esbuild";

await Promise.all([
  build({
    bundle: true,
    entryPoints: ["src/index.ts"],
    format: "esm",
    outfile: "dist/index.js",
    platform: "node",
    sourcemap: true,
    target: "node22",
  }),
  build({
    banner: { js: "#!/usr/bin/env node" },
    bundle: true,
    entryPoints: ["src/cli.ts"],
    format: "esm",
    outfile: "dist/cli.js",
    platform: "node",
    sourcemap: true,
    target: "node22",
  }),
]);
